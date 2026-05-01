import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { syncGmailForUser } from "@/lib/gmail-sync";

export const dynamic = "force-dynamic";

const schema = z.object({
  opportunityId: z.string().optional(),
  relatedEmails: z.array(z.string().email()).optional().default([]),
});

function formatSender(value: string | null, fallback: string | null) {
  return value ?? fallback ?? "Unknown sender";
}

async function findRelatedEmailTarget(args: {
  userId: string;
  contactIds: string[];
  companyIds: string[];
  senderEmail: string | null;
}) {
  const { userId, contactIds, companyIds, senderEmail } = args;
  const contactFilter = contactIds.length > 0 ? [{ contactId: { in: contactIds } }] : [];
  const companyFilter = companyIds.length > 0 ? [{ companyId: { in: companyIds } }] : [];
  const entityFilter = [...contactFilter, ...companyFilter];

  const internalSender = senderEmail
    ? await prisma.user.findFirst({
        where: { email: senderEmail, id: { not: userId } },
        select: { id: true, name: true, email: true },
      })
    : null;

  if (entityFilter.length > 0) {
    const opportunity = await prisma.opportunity.findFirst({
      where: { ownerId: userId, OR: entityFilter },
      orderBy: [{ updatedAt: "desc" }],
      select: { id: true, title: true },
    });
    if (opportunity) {
      return {
        title: `New email on opportunity ${opportunity.title}`,
        href: `/pipeline/${opportunity.id}`,
        entity: "Opportunity",
        entityId: opportunity.id,
      };
    }

    const quote = await prisma.quote.findFirst({
      where: { ownerId: userId, OR: entityFilter },
      orderBy: [{ createdAt: "desc" }],
      select: { id: true, number: true },
    });
    if (quote) {
      return {
        title: `New email on quote ${quote.number}`,
        href: `/quotes/${quote.id}`,
        entity: "Quote",
        entityId: quote.id,
      };
    }

    const lead = await prisma.lead.findFirst({
      where: {
        ownerId: userId,
        status: { not: "CONVERTED" },
        OR: entityFilter,
      },
      orderBy: [{ updatedAt: "desc" }],
      select: { id: true, title: true },
    });
    if (lead) {
      return {
        title: `New email on lead ${lead.title}`,
        href: `/leads`,
        entity: "Lead",
        entityId: lead.id,
      };
    }
  }

  if (internalSender) {
    return {
      title: `New email from ${internalSender.name || internalSender.email}`,
      href: "/activities",
      entity: "User",
      entityId: internalSender.id,
    };
  }

  return null;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    const result = await syncGmailForUser({
      userId: session.sub,
      opportunityId: parsed.data.opportunityId,
      relatedEmails: parsed.data.relatedEmails,
      createSummaryNotification: true,
    });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message ?? e) }, { status: 502 });
  }
}
