import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password, locale } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { email: String(email).toLowerCase() } });
  if (!user) return NextResponse.json({ error: "Invalid" }, { status: 401 });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "Invalid" }, { status: 401 });

  if (locale && (locale === "en" || locale === "ar") && locale !== user.locale) {
    await prisma.user.update({ where: { id: user.id }, data: { locale } });
  }

  await createSession({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    locale: locale ?? user.locale,
  });

  await prisma.auditLog.create({
    data: { userId: user.id, action: "LOGIN", entity: "User", entityId: user.id },
  });

  return NextResponse.json({ ok: true });
}
