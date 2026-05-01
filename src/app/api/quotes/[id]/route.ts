export async function GET(req, { params }) {
  // Fetch a single quote with all relations for editing
  try {
    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: {
        items: true,
        company: { include: { contacts: true } },
        opportunity: true,
      },
    });
    if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(quote);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await req.json();
  try {
    const quote = await prisma.quote.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json(quote);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await prisma.quote.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
