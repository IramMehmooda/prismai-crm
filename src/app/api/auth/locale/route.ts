import { NextRequest, NextResponse } from "next/server";
import { getSession, createSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
async function handle(req: NextRequest) {
  const url = new URL(req.url);
  const to = url.searchParams.get("to");
  const session = await getSession();
  if (!session || (to !== "en" && to !== "ar")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  await prisma.user.update({ where: { id: session.sub }, data: { locale: to } });
  await createSession({ ...session, locale: to });
  return NextResponse.redirect(new URL("/dashboard", req.url));
}

export const GET = handle;
export const POST = handle;
