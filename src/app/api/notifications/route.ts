import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ items: [], unread: 0 }, { status: 401 });

  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.sub },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.notification.count({ where: { userId: session.sub, readAt: null } }),
  ]);

  return NextResponse.json({ items, unread });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const id: string | undefined = body?.id;
  const all: boolean = !!body?.all;

  if (all) {
    await prisma.notification.updateMany({
      where: { userId: session.sub, readAt: null },
      data: { readAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  if (id) {
    await prisma.notification.updateMany({
      where: { id, userId: session.sub },
      data: { readAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false }, { status: 400 });
}
