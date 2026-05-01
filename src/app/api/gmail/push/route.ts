import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { gmailPushConfigured } from "@/lib/gmail";
import { syncGmailForUser } from "@/lib/gmail-sync";

export const dynamic = "force-dynamic";

function decodePubSubPayload(data: string) {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(Buffer.from(normalized, "base64").toString("utf8"));
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!gmailPushConfigured() || secret !== process.env.GMAIL_PUSH_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const rawData = body?.message?.data;
  if (!rawData) return NextResponse.json({ ok: true });

  let payload: { emailAddress?: string; historyId?: string };
  try {
    payload = decodePubSubPayload(rawData);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const emailAddress = payload.emailAddress?.toLowerCase();
  if (!emailAddress) return NextResponse.json({ ok: true });

  const user = await prisma.user.findFirst({
    where: {
      email: emailAddress,
      gmailPushEnabled: true,
      googleAccessToken: { not: null },
    },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ ok: true });

  if (payload.historyId) {
    await prisma.user.update({
      where: { id: user.id },
      data: { gmailHistoryId: payload.historyId },
    }).catch(() => null);
  }

  await syncGmailForUser({ userId: user.id, createSummaryNotification: false });
  return new NextResponse(null, { status: 204 });
}