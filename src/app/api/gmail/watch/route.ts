import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { gmailPushConfigured, gmailWatch } from "@/lib/gmail";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!gmailPushConfigured()) {
    return NextResponse.json({ error: "Gmail push is not configured" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { googleAccessToken: true, gmailWatchExpiration: true, gmailPushEnabled: true },
  });
  if (!user?.googleAccessToken) {
    return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });
  }

  const existingExpiration = user.gmailWatchExpiration?.getTime() ?? 0;
  if (user.gmailPushEnabled && existingExpiration > Date.now() + 24 * 60 * 60 * 1000) {
    return NextResponse.json({
      ok: true,
      enabled: true,
      reused: true,
      expiration: user.gmailWatchExpiration?.toISOString() ?? null,
    });
  }

  const watch = await gmailWatch(session.sub);
  const expiration = new Date(Number(watch.expiration));
  await prisma.user.update({
    where: { id: session.sub },
    data: {
      gmailPushEnabled: true,
      gmailHistoryId: watch.historyId,
      gmailWatchExpiration: expiration,
    },
  });
  await prisma.auditLog.create({
    data: {
      userId: session.sub,
      action: "GMAIL_WATCH_ENABLED",
      entity: "User",
      entityId: session.sub,
      metadata: JSON.stringify({ expiration: expiration.toISOString(), historyId: watch.historyId }),
    },
  }).catch(() => null);

  return NextResponse.json({ ok: true, enabled: true, reused: false, expiration: expiration.toISOString() });
}