import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession, getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  locale: z.enum(["en", "ar"]).optional(),
  image: z.string().url().nullable().optional(),
  gmailNotifyCustomerEmails: z.boolean().optional(),
  gmailNotifyTeamEmails: z.boolean().optional(),
  gmailNotifyOnlyMyPipeline: z.boolean().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).max(200).optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true, email: true, name: true, role: true, locale: true, image: true,
      googleId: true, gmailLastSyncAt: true, gmailWatchExpiration: true, gmailPushEnabled: true,
      gmailNotifyCustomerEmails: true, gmailNotifyTeamEmails: true, gmailNotifyOnlyMyPipeline: true,
      createdAt: true, updatedAt: true,
      _count: {
        select: {
          ownedLeads: true,
          ownedOpportunities: true,
          ownedQuotes: true,
          assignedTasks: true,
          activities: true,
        },
      },
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ user });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const update: any = {};
  if (data.name !== undefined) update.name = data.name.trim();
  if (data.locale !== undefined) update.locale = data.locale;
  if (data.image !== undefined) update.image = data.image;
  if (data.gmailNotifyCustomerEmails !== undefined) update.gmailNotifyCustomerEmails = data.gmailNotifyCustomerEmails;
  if (data.gmailNotifyTeamEmails !== undefined) update.gmailNotifyTeamEmails = data.gmailNotifyTeamEmails;
  if (data.gmailNotifyOnlyMyPipeline !== undefined) update.gmailNotifyOnlyMyPipeline = data.gmailNotifyOnlyMyPipeline;

  if (data.newPassword) {
    if (!data.currentPassword) {
      return NextResponse.json({ error: "currentPassword required to change password" }, { status: 400 });
    }
    const ok = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!ok) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    update.passwordHash = await bcrypt.hash(data.newPassword, 10);
  }

  const updated = await prisma.user.update({ where: { id: session.sub }, data: update });

  // Refresh JWT so the topbar reflects new name/locale immediately.
  await createSession({
    sub: updated.id, email: updated.email, name: updated.name, role: updated.role, locale: updated.locale,
  });

  await prisma.auditLog.create({
    data: { userId: updated.id, action: "PROFILE_UPDATED", entity: "User", entityId: updated.id, metadata: JSON.stringify(Object.keys(update)) },
  }).catch(() => null);

  return NextResponse.json({ ok: true });
}
