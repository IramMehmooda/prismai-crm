/**
 * seed-enrich.ts – Enriches the database with realistic Saudi Arabia CRM data
 * for meaningful statistics dashboard visuals.
 * Safe to run multiple times (uses upsert with stable IDs).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/* Helpers */
function monthsAgo(n: number): Date {
  const d = new Date();
  d.setDate(15); // mid-month
  d.setMonth(d.getMonth() - n);
  d.setHours(10, 0, 0, 0);
  return d;
}
function daysFromNow(n: number): string {
  return new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
}

async function main() {
  /* ── 1. Get existing users ── */
  const [admin, manager, rep, marketing] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { email: "admin@prismai.app" } }),
    prisma.user.findUniqueOrThrow({ where: { email: "manager@prismai.app" } }),
    prisma.user.findUniqueOrThrow({ where: { email: "sales@prismai.app" } }),
    prisma.user.findUniqueOrThrow({ where: { email: "marketing@prismai.app" } }),
  ]);

  /* ── 2. Additional companies across Saudi regions ── */
  const companies = [
    { id: "enr-c1",  name: "SABIC Industries",         nameAr: "سابك الصناعات",        industry: "Manufacturing",    region: "Jubail",   size: "ENT" },
    { id: "enr-c2",  name: "Ma'aden Mining",            nameAr: "معادن للتعدين",         industry: "Mining",           region: "Riyadh",   size: "ENT" },
    { id: "enr-c3",  name: "Al-Rajhi Construction",     nameAr: "الراجحي للمقاولات",     industry: "Construction",     region: "Riyadh",   size: "MID" },
    { id: "enr-c4",  name: "Saudi Water Authority",     nameAr: "هيئة المياه السعودية",  industry: "Utilities",        region: "Dammam",   size: "ENT" },
    { id: "enr-c5",  name: "Haramain Railway",          nameAr: "قطار الحرمين",          industry: "Transportation",   region: "Makkah",   size: "MID" },
    { id: "enr-c6",  name: "Tabuk Pharma",              nameAr: "تبوك للأدوية",          industry: "Healthcare",       region: "Tabuk",    size: "SMB" },
    { id: "enr-c7",  name: "Yanbu Cement Co.",          nameAr: "ينبع للاسمنت",          industry: "Manufacturing",    region: "Yanbu",    size: "MID" },
    { id: "enr-c8",  name: "ACWA Power",                nameAr: "أكوا باور",             industry: "Energy",           region: "Riyadh",   size: "ENT" },
    { id: "enr-c9",  name: "National Shipping Co.",     nameAr: "الشركة الوطنية للشحن", industry: "Logistics",        region: "Jeddah",   size: "MID" },
    { id: "enr-c10", name: "Abha Medical Group",        nameAr: "مجموعة أبها الطبية",   industry: "Healthcare",       region: "Abha",     size: "SMB" },
    { id: "enr-c11", name: "Eastern Petrochemicals",   nameAr: "بتروكيماويات الشرقية", industry: "Oil & Gas",        region: "Eastern",  size: "ENT" },
    { id: "enr-c12", name: "Madinah Digital Hub",       nameAr: "مركز المدينة الرقمي",  industry: "Technology",       region: "Madinah",  size: "SMB" },
  ];

  const companyMap = new Map<string, string>(); // id → id
  for (const c of companies) {
    const created = await prisma.company.upsert({
      where: { id: c.id },
      update: {},
      create: { ...c, ownerId: manager.id },
    });
    companyMap.set(c.id, created.id);
  }

  /* ── 3. Additional contacts ── */
  const contacts = [
    { id: "enr-ct1", firstName: "Ahmed",    lastName: "Al-Ghamdi",   title: "VP Operations",     companyId: "enr-c1",  email: "ahmed@sabic.com" },
    { id: "enr-ct2", firstName: "Layla",    lastName: "Al-Zahrani",  title: "Procurement Head",  companyId: "enr-c2",  email: "layla@maaden.sa" },
    { id: "enr-ct3", firstName: "Tariq",    lastName: "Al-Malki",    title: "CEO",               companyId: "enr-c3",  email: "tariq@alrajhi.sa" },
    { id: "enr-ct4", firstName: "Hessa",    lastName: "Al-Dosari",   title: "CTO",               companyId: "enr-c4",  email: "hessa@swa.gov.sa" },
    { id: "enr-ct5", firstName: "Mansour",  lastName: "Al-Shehri",   title: "Logistics Director", companyId: "enr-c5", email: "mansour@haramain.sa" },
    { id: "enr-ct6", firstName: "Rima",     lastName: "Al-Qahtani",  title: "Director",          companyId: "enr-c6",  email: "rima@tabukpharma.sa" },
    { id: "enr-ct7", firstName: "Waleed",   lastName: "Al-Harbi",    title: "Plant Manager",     companyId: "enr-c7",  email: "waleed@yanbucement.sa" },
    { id: "enr-ct8", firstName: "Dina",     lastName: "Al-Otaibi",   title: "COO",               companyId: "enr-c8",  email: "dina@acwapower.sa" },
    { id: "enr-ct9", firstName: "Samir",    lastName: "Al-Anazi",    title: "Fleet Manager",     companyId: "enr-c9",  email: "samir@nsc.sa" },
    { id: "enr-ct10",firstName: "Fatima",   lastName: "Al-Shammari", title: "Medical Director",  companyId: "enr-c10", email: "fatima@abhamedical.sa" },
  ];
  for (const ct of contacts) {
    await prisma.contact.upsert({
      where: { id: ct.id },
      update: {},
      create: { ...ct, ownerId: rep.id },
    });
  }

  /* ── 4. Additional leads (diverse sources & statuses) ── */
  const leadDefs = [
    { id: "enr-l1",  title: "SABIC - Compressor Upgrade",       source: "LINKEDIN",    status: "QUALIFIED",    score: 75, estimatedValue: 1200000, companyId: "enr-c1",  contactId: "enr-ct1" },
    { id: "enr-l2",  title: "Ma'aden - Conveyor Systems",       source: "TRADE_SHOW",  status: "CONTACTED",    score: 60, estimatedValue: 680000,  companyId: "enr-c2",  contactId: "enr-ct2" },
    { id: "enr-l3",  title: "Al-Rajhi - Site Equipment",        source: "REFERRAL",    status: "NEW",          score: 30, estimatedValue: 420000,  companyId: "enr-c3",  contactId: "enr-ct3" },
    { id: "enr-l4",  title: "SWA - Pump Station Overhaul",      source: "COLD",        status: "NEW",          score: 20, estimatedValue: 950000,  companyId: "enr-c4",  contactId: "enr-ct4" },
    { id: "enr-l5",  title: "Haramain - Track Inspection",      source: "WEB",         status: "CONTACTED",    score: 45, estimatedValue: 340000,  companyId: "enr-c5",  contactId: "enr-ct5" },
    { id: "enr-l6",  title: "Tabuk Pharma - HVAC System",       source: "LINKEDIN",    status: "DISQUALIFIED", score: 15, estimatedValue: 180000,  companyId: "enr-c6",  contactId: "enr-ct6" },
    { id: "enr-l7",  title: "Yanbu Cement - Kiln Maintenance",  source: "REFERRAL",    status: "QUALIFIED",    score: 80, estimatedValue: 760000,  companyId: "enr-c7",  contactId: "enr-ct7" },
    { id: "enr-l8",  title: "ACWA Power - Cooling Towers",      source: "TRADE_SHOW",  status: "CONTACTED",    score: 55, estimatedValue: 1500000, companyId: "enr-c8",  contactId: "enr-ct8" },
    { id: "enr-l9",  title: "National Shipping - Fleet Tools",  source: "COLD",        status: "NEW",          score: 25, estimatedValue: 220000,  companyId: "enr-c9",  contactId: "enr-ct9" },
    { id: "enr-l10", title: "Abha Medical - Lab Equipment",     source: "OTHER",       status: "NEW",          score: 10, estimatedValue: 145000,  companyId: "enr-c10", contactId: "enr-ct10" },
    { id: "enr-l11", title: "Madinah Digital - UPS Systems",    source: "WEB",         status: "CONTACTED",    score: 40, estimatedValue: 95000,   companyId: "enr-c12", contactId: null },
    { id: "enr-l12", title: "Eastern Petro - Valve Overhaul",   source: "LINKEDIN",    status: "QUALIFIED",    score: 70, estimatedValue: 2100000, companyId: "enr-c11", contactId: null },
    { id: "enr-l13", title: "SABIC - Instrumentation Upgrade",  source: "OTHER",       status: "CONTACTED",    score: 35, estimatedValue: 380000,  companyId: "enr-c1",  contactId: "enr-ct1" },
  ];
  for (const l of leadDefs) {
    await prisma.lead.upsert({
      where: { id: l.id },
      update: {},
      create: { ...l, ownerId: rep.id },
    });
  }

  /* ── 5. Active pipeline opportunities (additional) ── */
  const activeOppDefs = [
    { id: "enr-opp1", title: "SABIC - Compressor Upgrade",      amount: 1200000, stageId: "stage-negotiation", companyId: "enr-c1",  contactId: "enr-ct1" },
    { id: "enr-opp2", title: "Ma'aden - Conveyor Systems",      amount: 680000,  stageId: "stage-proposal",    companyId: "enr-c2",  contactId: "enr-ct2" },
    { id: "enr-opp3", title: "Al-Rajhi - Site Equipment",       amount: 420000,  stageId: "stage-qualified",   companyId: "enr-c3",  contactId: "enr-ct3" },
    { id: "enr-opp4", title: "SWA - Pump Station Overhaul",     amount: 950000,  stageId: "stage-proposal",    companyId: "enr-c4",  contactId: "enr-ct4" },
    { id: "enr-opp5", title: "Haramain - Track Inspection",     amount: 340000,  stageId: "stage-new",         companyId: "enr-c5",  contactId: "enr-ct5" },
    { id: "enr-opp6", title: "Yanbu Cement - Kiln Maintenance", amount: 760000,  stageId: "stage-approval",    companyId: "enr-c7",  contactId: "enr-ct7" },
    { id: "enr-opp7", title: "ACWA Power - Cooling Towers",     amount: 1500000, stageId: "stage-negotiation", companyId: "enr-c8",  contactId: "enr-ct8" },
    { id: "enr-opp8", title: "Eastern Petro - Valve Overhaul",  amount: 2100000, stageId: "stage-proposal",    companyId: "enr-c11", contactId: null },
  ];
  for (const o of activeOppDefs) {
    await prisma.opportunity.upsert({
      where: { id: o.id },
      update: {},
      create: { ...o, probability: 50, ownerId: manager.id, expectedCloseAt: new Date(Date.now() + 45 * 86400000) },
    });
  }

  /* ── 6. Won/Lost opportunities across 12 months ── */
  // Each entry: [monthsAgo, isWon, amount, title, companyId]
  const wonLostDefs: [number, boolean, number, string, string][] = [
    [11, true,  420000,  "SABIC - Phase 1 Pumps",           "enr-c1"],
    [11, false, 180000,  "Al-Rajhi - Scaffolding Rental",   "enr-c3"],
    [10, true,  580000,  "Ma'aden - Mining Drills",         "enr-c2"],
    [10, true,  320000,  "Riyadh Steel - Press Lines",      "seed-c2"],
    [9,  true,  750000,  "Haramain - Signal Systems",       "enr-c5"],
    [9,  false, 230000,  "Tabuk Pharma - Cold Storage",     "enr-c6"],
    [8,  true,  940000,  "ACWA Power - Phase 1",            "enr-c8"],
    [8,  false, 310000,  "National Shipping - Hoists",      "enr-c9"],
    [7,  true,  1100000, "Eastern Petro - Pump Overhaul",   "enr-c11"],
    [7,  true,  460000,  "SWA - Water Pumps Batch",         "enr-c4"],
    [6,  true,  680000,  "Yanbu Cement - Conveyors",        "enr-c7"],
    [6,  false, 195000,  "Abha Medical - Sterilizers",      "enr-c10"],
    [5,  true,  850000,  "SABIC - Phase 2 Compressors",     "enr-c1"],
    [5,  false, 280000,  "Madinah Digital - Network Infra", "enr-c12"],
    [4,  true,  1250000, "Eastern Petro - Phase 2",         "enr-c11"],
    [4,  true,  390000,  "Jeddah Logistics - Equipment",    "seed-c3"],
    [3,  true,  720000,  "Ma'aden - Belt Systems",          "enr-c2"],
    [3,  false, 145000,  "Al-Rajhi - Minor Contract",       "enr-c3"],
    [2,  true,  980000,  "ACWA Power - Phase 2",            "enr-c8"],
    [2,  true,  540000,  "Aramco - Spare Parts Q1",         "seed-c1"],
    [1,  true,  1400000, "SABIC - Instrumentation",         "enr-c1"],
    [1,  false, 320000,  "Tabuk Pharma - HVAC",             "enr-c6"],
    [0,  true,  760000,  "Yanbu Cement - Phase 2",          "enr-c7"],
    [0,  true,  890000,  "SWA - Phase 2",                   "enr-c4"],
  ];

  for (let i = 0; i < wonLostDefs.length; i++) {
    const [mAgo, isWon, amount, title, companyId] = wonLostDefs[i];
    const closedAt = monthsAgo(mAgo);
    const stageId = isWon ? "stage-won" : "stage-lost";
    const id = `enr-hist-${i}`;
    await prisma.opportunity.upsert({
      where: { id },
      update: {},
      create: {
        id, title, amount, stageId, companyId, probability: isWon ? 100 : 0,
        closedAt, closeReason: isWon ? "Deal closed successfully" : "Budget constraints",
        ownerId: manager.id,
      },
    });
  }

  /* ── 7. Additional tasks with varied priorities ── */
  const taskDefs = [
    { id: "enr-t1", title: "Review SABIC compressor proposal",     priority: "HIGH",   dueAt: daysFromNow(1),   assigneeId: manager.id, creatorId: admin.id },
    { id: "enr-t2", title: "Prepare demo for ACWA Power",          priority: "HIGH",   dueAt: daysFromNow(3),   assigneeId: manager.id, creatorId: admin.id },
    { id: "enr-t3", title: "Call back Yanbu Cement plant mgr",     priority: "HIGH",   dueAt: daysFromNow(-1),  assigneeId: rep.id,     creatorId: manager.id },
    { id: "enr-t4", title: "Update Eastern Petro quote v2",        priority: "HIGH",   dueAt: daysFromNow(2),   assigneeId: rep.id,     creatorId: manager.id },
    { id: "enr-t5", title: "Update CRM with Ma'aden meeting notes",priority: "MEDIUM", dueAt: daysFromNow(5),   assigneeId: rep.id,     creatorId: manager.id },
    { id: "enr-t6", title: "Send Q2 pipeline report to finance",   priority: "MEDIUM", dueAt: daysFromNow(7),   assigneeId: manager.id, creatorId: admin.id },
    { id: "enr-t7", title: "Register for Cityscape 2026 expo",     priority: "LOW",    dueAt: daysFromNow(14),  assigneeId: marketing.id, creatorId: admin.id },
    { id: "enr-t8", title: "Update company logo on brochure",      priority: "LOW",    dueAt: daysFromNow(21),  assigneeId: marketing.id, creatorId: admin.id },
    { id: "enr-t9", title: "Archive Q1 2025 closed deals",        priority: "LOW",    dueAt: daysFromNow(30),  assigneeId: manager.id, creatorId: admin.id },
  ];
  for (const t of taskDefs) {
    await prisma.task.upsert({
      where: { id: t.id },
      update: {},
      create: { ...t, creatorId: t.creatorId },
    });
  }

  /* ── 8. Milestone activities for the activity feed ── */
  const actDefs = [
    { type: "EMAIL",        subject: "Sent Q2 pricing proposal to SABIC",          userId: manager.id },
    { type: "CALL",         subject: "Confirmed PO for Yanbu Cement Phase 2",       userId: manager.id },
    { type: "WHATSAPP",     subject: "ACWA Power site visit scheduled for May 5",  userId: rep.id },
    { type: "STAGE_CHANGE", subject: "Eastern Petro moved to Negotiation",          userId: manager.id },
    { type: "EMAIL",        subject: "Ma'aden requested additional technical specs",userId: rep.id },
    { type: "CALL",         subject: "SWA reviewed pump station proposal",          userId: manager.id },
    { type: "STAGE_CHANGE", subject: "Aramco Pumps moved to Approval stage",        userId: manager.id },
    { type: "EMAIL",        subject: "Haramain Railway signed NDA",                 userId: rep.id },
    { type: "CALL",         subject: "Follow-up call with Abha Medical Group",      userId: rep.id },
    { type: "WHATSAPP",     subject: "Al-Rajhi confirmed budget availability",      userId: manager.id },
    { type: "EMAIL",        subject: "Q-2026-0012 quote approved by Faisal",       userId: admin.id },
    { type: "STAGE_CHANGE", subject: "ACWA Power Phase 2 moved to Proposal",       userId: manager.id },
  ];
  // Check if we already added these (by checking count)
  const existingCount = await prisma.activity.count();
  if (existingCount < 15) {
    for (const a of actDefs) {
      await prisma.activity.create({ data: a });
    }
  }

  console.log("✅ Enrichment complete.");
  console.log(`   Companies: ${(await prisma.company.count())}`);
  console.log(`   Leads:     ${(await prisma.lead.count())}`);
  console.log(`   Opps:      ${(await prisma.opportunity.count())} (active + won/lost history)`);
  console.log(`   Tasks:     ${(await prisma.task.count())}`);
  console.log(`   Activities:${(await prisma.activity.count())}`);
}

main().finally(() => prisma.$disconnect());
