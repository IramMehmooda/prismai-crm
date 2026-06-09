import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
const schema = z.object({
  type: z.enum(["NOTE","CALL","EMAIL","WHATSAPP","MEETING","STATUS_CHANGE"]),
  subject: z.string().min(1),
  body: z.string().optional().nullable(),
  leadId: z.string().nullable().optional(),
  contactId: z.string().nullable().optional(),
  opportunityId: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const a = await prisma.activity.create({
    data: {
      type: parsed.data.type,
      subject: parsed.data.subject,
      body: parsed.data.body || null,
      leadId: parsed.data.leadId || null,
      contactId: parsed.data.contactId || null,
      opportunityId: parsed.data.opportunityId || null,
      userId: session.sub,
    },
  });
  return NextResponse.json(a, { status: 201 });
}
