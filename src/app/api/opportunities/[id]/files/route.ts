import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function isUploadFile(value: FormDataEntryValue | null): value is Blob & { name?: string } {
  return !!value && typeof value === "object" && "arrayBuffer" in value && "size" in value;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const opportunity = await prisma.opportunity.findUnique({ where: { id: params.id }, select: { id: true, title: true } });
  if (!opportunity) return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file");
  if (!isUploadFile(file) || file.size === 0) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }
  if (file.size > 15 * 1024 * 1024) {
    return NextResponse.json({ error: "File must be 15MB or smaller" }, { status: 400 });
  }

  const baseDir = join(process.cwd(), "public", "uploads", "opportunities", params.id);
  await mkdir(baseDir, { recursive: true });

  const originalName = safeName(file.name || "upload.bin");
  const filename = `${Date.now()}-${originalName}`;
  const target = join(baseDir, filename);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(target, bytes);

  await prisma.activity.create({
    data: {
      type: "NOTE",
      subject: `File uploaded: ${originalName}`,
      body: `Uploaded by ${session.name}`,
      userId: session.sub,
      opportunityId: params.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.sub,
      action: "UPLOAD_FILE",
      entity: "Opportunity",
      entityId: params.id,
      metadata: JSON.stringify({ filename, originalName, size: file.size }),
    },
  });

  return NextResponse.json({ ok: true, url: `/uploads/opportunities/${params.id}/${filename}` }, { status: 201 });
}