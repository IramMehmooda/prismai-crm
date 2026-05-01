import { prisma } from "./db";

/**
 * Apply active scoring rules to a lead and return the computed score (0-100).
 * Rules are matched against:
 *  - lead.source                            (field: "source")
 *  - lead.contact.title                     (field: "title")
 *  - lead.company.{industry,region,size}    (field: "industry"/"region"/"size")
 */
export async function computeLeadScore(leadId: string): Promise<number> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { company: true, contact: true },
  });
  if (!lead) return 0;
  const rules = await prisma.scoringRule.findMany({ where: { active: true } });
  let score = 0;
  for (const r of rules) {
    const target = pick(r.field, lead);
    if (target == null) continue;
    const val = String(target).toLowerCase();
    const cmp = r.value.toLowerCase();
    let match = false;
    if (r.operator === "EQUALS") match = val === cmp;
    else if (r.operator === "CONTAINS") match = val.includes(cmp);
    else if (r.operator === "IN") {
      try { match = (JSON.parse(r.value) as string[]).map((x) => x.toLowerCase()).includes(val); } catch { /* ignore */ }
    }
    if (match) score += r.points;
  }
  return Math.max(0, Math.min(100, score));
}

function pick(field: string, lead: any): string | number | null {
  switch (field) {
    case "source":   return lead.source;
    case "title":    return lead.contact?.title ?? null;
    case "industry": return lead.company?.industry ?? null;
    case "region":   return lead.company?.region ?? null;
    case "size":     return lead.company?.size ?? null;
    case "hasWhatsapp": return lead.contact?.whatsapp ? "true" : "false";
    default: return null;
  }
}

export async function recomputeAllLeadScores(): Promise<number> {
  const leads = await prisma.lead.findMany({ select: { id: true } });
  let n = 0;
  for (const l of leads) {
    const s = await computeLeadScore(l.id);
    await prisma.lead.update({ where: { id: l.id }, data: { scoreAuto: s } });
    n++;
  }
  return n;
}
