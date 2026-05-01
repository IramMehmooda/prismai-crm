import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  await prisma.user.update({
    where: { id: session.sub },
    data: {
      googleId: null,
      googleAccessToken: null,
      googleRefreshToken: null,
      googleTokenExpiresAt: null,
      gmailHistoryId: null,
      gmailLastSyncAt: null,
      gmailWatchExpiration: null,
      gmailPushEnabled: false,
    },
  });
  await prisma.auditLog.create({
    data: { userId: session.sub, action: "GMAIL_DISCONNECTED", entity: "User", entityId: session.sub },
  }).catch(() => null);
  return NextResponse.json({ ok: true });
}
