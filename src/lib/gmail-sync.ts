import { prisma } from "./db";
import type { SessionPayload } from "./auth";
import { getVisibleScope } from "./scope";
import { buildGmailThreadUrl, extractEmail, extractEmails, gmailGet, gmailList, header } from "./gmail";
import { notify } from "./notify";

type SyncGmailArgs = {
  userId: string;
  opportunityId?: string;
  relatedEmails?: string[];
  createSummaryNotification?: boolean;
};

type RelatedTarget = {
  title: string;
  entity: string;
  entityId: string;
};

function formatSender(value: string | null, fallback: string | null) {
  return value ?? fallback ?? "Unknown sender";
}

function ownerWhere(visibleUserIds: string[] | null, selfOnly: boolean, selfId: string) {
  if (selfOnly) return { ownerId: selfId };
  if (visibleUserIds === null) return {};
  return { ownerId: { in: visibleUserIds } };
}

async function findRelatedEmailTarget(args: {
  session: SessionPayload;
  matchedContactIds: string[];
  matchedCompanyIds: string[];
  senderEmail: string | null;
  customerEmails: boolean;
  teamEmails: boolean;
  onlyMyPipeline: boolean;
}): Promise<RelatedTarget | null> {
  const { session, matchedContactIds, matchedCompanyIds, senderEmail, customerEmails, teamEmails, onlyMyPipeline } = args;
  const scope = await getVisibleScope(session);
  const ownerFilter = ownerWhere(scope.visibleUserIds, onlyMyPipeline, session.sub);
  const entityFilter = [
    ...(matchedContactIds.length > 0 ? [{ contactId: { in: matchedContactIds } }] : []),
    ...(matchedCompanyIds.length > 0 ? [{ companyId: { in: matchedCompanyIds } }] : []),
  ];

  const internalSender = senderEmail
    ? await prisma.user.findFirst({
        where: {
          email: senderEmail,
          id: { not: session.sub },
          ...(scope.visibleUserIds === null ? {} : { id: { in: scope.visibleUserIds } }),
        },
        select: { id: true, name: true, email: true },
      })
    : null;

  if (entityFilter.length > 0 && customerEmails) {
    const opportunity = await prisma.opportunity.findFirst({
      where: { ...ownerFilter, OR: entityFilter },
      orderBy: [{ updatedAt: "desc" }],
      select: { id: true, title: true },
    });
    if (opportunity) {
      return { title: `New email on opportunity ${opportunity.title}`, entity: "Opportunity", entityId: opportunity.id };
    }

    const quote = await prisma.quote.findFirst({
      where: { ...ownerFilter, OR: entityFilter },
      orderBy: [{ createdAt: "desc" }],
      select: { id: true, number: true },
    });
    if (quote) {
      return { title: `New email on quote ${quote.number}`, entity: "Quote", entityId: quote.id };
    }

    const lead = await prisma.lead.findFirst({
      where: {
        ...ownerFilter,
        status: { not: "CONVERTED" },
        OR: entityFilter,
      },
      orderBy: [{ updatedAt: "desc" }],
      select: { id: true, title: true },
    });
    if (lead) {
      return { title: `New email on lead ${lead.title}`, entity: "Lead", entityId: lead.id };
    }
  }

  if (internalSender && teamEmails) {
    return {
      title: `New email from ${internalSender.name || internalSender.email}`,
      entity: "User",
      entityId: internalSender.id,
    };
  }

  return null;
}

export async function syncGmailForUser({
  userId,
  opportunityId,
  relatedEmails = [],
  createSummaryNotification = true,
}: SyncGmailArgs) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      locale: true,
      googleAccessToken: true,
      gmailLastSyncAt: true,
      gmailNotifyCustomerEmails: true,
      gmailNotifyTeamEmails: true,
      gmailNotifyOnlyMyPipeline: true,
    },
  });
  if (!user?.googleAccessToken) throw new Error("Gmail not connected");

  const session = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    locale: user.locale,
  } satisfies SessionPayload;

  const sinceClause = user.gmailLastSyncAt
    ? `after:${Math.floor(user.gmailLastSyncAt.getTime() / 1000)}`
    : "newer_than:30d";

  const [inboxListed, sentListed] = await Promise.all([
    gmailList(userId, `in:inbox ${sinceClause}`, 25),
    gmailList(userId, `in:sent ${sinceClause}`, 25),
  ]);

  const messages = [
    ...(inboxListed.messages ?? []).map((item) => ({ ...item, direction: "inbound" as const })),
    ...(sentListed.messages ?? []).map((item) => ({ ...item, direction: "sent" as const })),
  ];

  const contacts = await prisma.contact.findMany({
    where: { email: { not: null } },
    select: { id: true, email: true, companyId: true },
  });
  const byEmail = new Map<string, { id: string; companyId: string | null }>();
  for (const contact of contacts) {
    if (contact.email) byEmail.set(contact.email.toLowerCase(), { id: contact.id, companyId: contact.companyId });
  }

  const hintedEmails = new Set(relatedEmails.map((email) => email.toLowerCase()));
  let imported = 0;
  let matched = 0;
  let emailNotificationsCreated = 0;

  for (const item of messages) {
    let msg;
    try {
      msg = await gmailGet(userId, item.id);
    } catch {
      continue;
    }

    const from = extractEmail(header(msg, "From"));
    const to = extractEmails(header(msg, "To"));
    const subject = header(msg, "Subject") ?? "(no subject)";
    const userEmail = user.email.toLowerCase();
    const counterparties = item.direction === "sent"
      ? to.filter((email) => email !== userEmail)
      : [from].filter((email): email is string => Boolean(email && email !== userEmail));
    const matchedContacts = counterparties
      .map((email) => byEmail.get(email))
      .filter((contact): contact is { id: string; companyId: string | null } => Boolean(contact));
    const matchedContactIds = matchedContacts.map((contact) => contact.id);
    const matchedCompanyIds = Array.from(new Set(
      matchedContacts
        .map((contact) => contact.companyId)
        .filter((companyId): companyId is string => Boolean(companyId)),
    ));

    if (matchedContacts.length > 0) matched++;

    const existing = await prisma.auditLog.findFirst({
      where: {
        action: "GMAIL_SYNC_IMPORT",
        entity: "GmailMessage",
        entityId: msg.id,
      },
      select: { id: true },
    });
    if (existing) continue;

    const hintedOpportunityId = opportunityId && counterparties.some((email) => hintedEmails.has(email))
      ? opportunityId
      : null;
    const emailNotificationTarget = item.direction === "inbound"
      ? await findRelatedEmailTarget({
          session,
          matchedContactIds,
          matchedCompanyIds,
          senderEmail: from,
          customerEmails: user.gmailNotifyCustomerEmails,
          teamEmails: user.gmailNotifyTeamEmails,
          onlyMyPipeline: user.gmailNotifyOnlyMyPipeline,
        })
      : null;

    await prisma.$transaction(async (tx) => {
      await tx.activity.create({
        data: {
          type: "EMAIL",
          subject: `${item.direction === "sent" ? "Sent" : "Received"}: ${subject}`.slice(0, 200),
          body: item.direction === "sent"
            ? `Primary recipients: ${counterparties.join(", ") || header(msg, "To") || "—"}`
            : `Primary sender: ${from ?? "—"}`,
          userId,
          contactId: matchedContacts[0]?.id ?? null,
          opportunityId: hintedOpportunityId,
          createdAt: new Date(Number(msg.internalDate) || Date.now()),
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: "GMAIL_SYNC_IMPORT",
          entity: "GmailMessage",
          entityId: msg.id,
          metadata: JSON.stringify({
            direction: item.direction,
            subject,
            opportunityId: hintedOpportunityId,
            contactId: matchedContacts[0]?.id ?? null,
            threadId: msg.threadId,
          }),
        },
      });

      if (emailNotificationTarget) {
        await tx.notification.create({
          data: {
            userId,
            type: "EMAIL_RECEIVED",
            title: emailNotificationTarget.title,
            body: `${formatSender(from, header(msg, "From"))} · ${subject}`.slice(0, 200),
            href: buildGmailThreadUrl(msg.threadId),
            entity: emailNotificationTarget.entity,
            entityId: emailNotificationTarget.entityId,
          },
        });
      }
    });

    imported++;
    if (emailNotificationTarget) emailNotificationsCreated++;
  }

  await prisma.user.update({ where: { id: userId }, data: { gmailLastSyncAt: new Date() } });

  if (imported > 0 && emailNotificationsCreated === 0 && createSummaryNotification) {
    await notify({
      userId,
      type: "GMAIL_SYNCED",
      title: `Gmail sync — ${imported} new email${imported === 1 ? "" : "s"}`,
      body: matched > 0 ? `${matched} matched to existing contacts.` : "No matching contacts — logged to your activity feed.",
      href: "/activities",
    });
  }

  return { ok: true, scanned: messages.length, imported, matched, emailNotificationsCreated };
}