import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("Prism@123", 10);

  /* ---------------- Teams ---------------- */
  const teamSales = await prisma.team.upsert({
    where: { id: "team-sales" },
    update: { name: "Sales" },
    create: { id: "team-sales", name: "Sales" },
  });
  const teamMarketing = await prisma.team.upsert({
    where: { id: "team-marketing" },
    update: { name: "Marketing" },
    create: { id: "team-marketing", name: "Marketing" },
  });
  const teamFinance = await prisma.team.upsert({
    where: { id: "team-finance" },
    update: { name: "Finance" },
    create: { id: "team-finance", name: "Finance" },
  });

  /* ---------------- Users ---------------- */
  const admin = await prisma.user.upsert({
    where: { email: "admin@prismai.app" },
    update: {},
    create: { email: "admin@prismai.app", name: "Faisal Al-Saud", passwordHash: password, role: "ADMIN", locale: "en" },
  });
  const manager = await prisma.user.upsert({
    where: { email: "manager@prismai.app" },
    update: {},
    create: { email: "manager@prismai.app", name: "Khalid Al-Mansour", passwordHash: password, role: "SALES_MANAGER", locale: "en" },
  });
  const rep = await prisma.user.upsert({
    where: { email: "sales@prismai.app" },
    update: {},
    create: { email: "sales@prismai.app", name: "Noura Al-Harbi", passwordHash: password, role: "SALES_REP", locale: "ar" },
  });
  const marketing = await prisma.user.upsert({
    where: { email: "marketing@prismai.app" },
    update: {},
    create: { email: "marketing@prismai.app", name: "Sara Al-Otaibi", passwordHash: password, role: "MARKETING", locale: "en" },
  });
  const finance = await prisma.user.upsert({
    where: { email: "finance@prismai.app" },
    update: {},
    create: { email: "finance@prismai.app", name: "Omar Al-Dossary", passwordHash: password, role: "FINANCE", locale: "en" },
  });

  // Assign teams via M2M (idempotent: connectOrCreate-style via update with set)
  await prisma.team.update({ where: { id: teamSales.id }, data: { members: { set: [{ email: "manager@prismai.app" }, { email: "sales@prismai.app" }] } } });
  await prisma.team.update({ where: { id: teamMarketing.id }, data: { members: { set: [{ email: "marketing@prismai.app" }] } } });
  await prisma.team.update({ where: { id: teamFinance.id }, data: { members: { set: [{ email: "finance@prismai.app" }] } } });


  /* ---------------- Companies / Contacts / Leads (Phase 1) ---------------- */
  const c1 = await prisma.company.upsert({
    where: { id: "seed-c1" },
    update: {},
    create: { id: "seed-c1", name: "Aramco Trading", nameAr: "أرامكو للتجارة", industry: "Oil & Gas", region: "Eastern", website: "https://aramco.com", vatNumber: "300000000000003", size: "ENT", ownerId: manager.id },
  });
  const c2 = await prisma.company.upsert({
    where: { id: "seed-c2" },
    update: {},
    create: { id: "seed-c2", name: "Riyadh Steel Co.", nameAr: "شركة الرياض للحديد", industry: "Manufacturing", region: "Riyadh", size: "MID", ownerId: rep.id },
  });
  const c3 = await prisma.company.upsert({
    where: { id: "seed-c3" },
    update: {},
    create: { id: "seed-c3", name: "Jeddah Logistics", nameAr: "جدة للخدمات اللوجستية", industry: "Logistics", region: "Jeddah", size: "SMB", ownerId: rep.id },
  });

  const ct1 = await prisma.contact.upsert({
    where: { id: "seed-ct1" },
    update: {},
    create: { id: "seed-ct1", firstName: "Mohammed", lastName: "Al-Qahtani", nameAr: "محمد القحطاني", email: "mohammed@aramco.com", phone: "+966500000001", whatsapp: "+966500000001", title: "Procurement Manager", companyId: c1.id, ownerId: manager.id },
  });
  const ct2 = await prisma.contact.upsert({
    where: { id: "seed-ct2" },
    update: {},
    create: { id: "seed-ct2", firstName: "Noura", lastName: "Al-Saud", nameAr: "نورة آل سعود", email: "noura@riyadhsteel.sa", phone: "+966500000002", title: "Operations Lead", companyId: c2.id, ownerId: rep.id },
  });
  const ct3 = await prisma.contact.upsert({
    where: { id: "seed-ct3" },
    update: {},
    create: { id: "seed-ct3", firstName: "Yusuf", lastName: "Bakr", email: "yusuf@jeddahlog.sa", phone: "+966500000003", title: "Owner", companyId: c3.id, ownerId: rep.id },
  });

  await prisma.lead.upsert({
    where: { id: "seed-l1" },
    update: {},
    create: { id: "seed-l1", title: "Industrial Pump Order - Q3", source: "TRADE_SHOW", status: "QUALIFIED", score: 70, estimatedValue: 850000, notes: "Met at Saudi Build 2026.", companyId: c1.id, contactId: ct1.id, ownerId: manager.id },
  });
  await prisma.lead.upsert({
    where: { id: "seed-l2" },
    update: {},
    create: { id: "seed-l2", title: "CNC Machine Upgrade", source: "WEB", status: "CONTACTED", score: 45, estimatedValue: 320000, companyId: c2.id, contactId: ct2.id, ownerId: rep.id },
  });
  await prisma.lead.upsert({
    where: { id: "seed-l3" },
    update: {},
    create: { id: "seed-l3", title: "Forklift Service Contract", source: "REFERRAL", status: "NEW", score: 20, estimatedValue: 90000, companyId: c3.id, contactId: ct3.id, ownerId: rep.id },
  });

  /* ---------------- Phase 2: Pipeline stages ---------------- */
  const stages = [
    { id: "stage-new",       name: "New",         nameAr: "جديد",     order: 1, probability: 10, color: "#94a3b8" },
    { id: "stage-qualified", name: "Qualified",   nameAr: "مؤهل",     order: 2, probability: 25, color: "#3498db" },
    { id: "stage-proposal",  name: "Proposal",    nameAr: "عرض",      order: 3, probability: 50, color: "#9b59b6" },
    { id: "stage-negotiation", name: "Negotiation", nameAr: "تفاوض",  order: 4, probability: 70, color: "#f39c12" },
    { id: "stage-approval",  name: "Approval",    nameAr: "اعتماد",   order: 5, probability: 85, color: "#1abc9c" },
    { id: "stage-won",       name: "Won",         nameAr: "ربح",      order: 6, probability: 100, isWon: true,  color: "#27ae60" },
    { id: "stage-lost",      name: "Lost",        nameAr: "خسارة",    order: 7, probability: 0,   isLost: true, color: "#e74c3c" },
  ];
  for (const s of stages) {
    await prisma.pipelineStage.upsert({ where: { id: s.id }, update: s, create: s });
  }

  // Sample opportunities
  const opp1 = await prisma.opportunity.upsert({
    where: { id: "seed-opp1" },
    update: {},
    create: {
      id: "seed-opp1", title: "Aramco - 12x Industrial Pumps", amount: 850000, stageId: "stage-proposal",
      probability: 50, expectedCloseAt: new Date(Date.now() + 30*86400000),
      ownerId: manager.id, companyId: c1.id, contactId: ct1.id, fromLeadId: "seed-l1",
    },
  });
  await prisma.opportunity.upsert({
    where: { id: "seed-opp2" },
    update: {},
    create: {
      id: "seed-opp2", title: "Riyadh Steel - CNC Upgrade", amount: 320000, stageId: "stage-qualified",
      probability: 25, expectedCloseAt: new Date(Date.now() + 60*86400000),
      ownerId: rep.id, companyId: c2.id, contactId: ct2.id, fromLeadId: "seed-l2",
    },
  });
  await prisma.opportunity.upsert({
    where: { id: "seed-opp3" },
    update: {},
    create: {
      id: "seed-opp3", title: "Jeddah Logistics - Forklift Service", amount: 90000, stageId: "stage-new",
      probability: 10, expectedCloseAt: new Date(Date.now() + 14*86400000),
      ownerId: rep.id, companyId: c3.id, contactId: ct3.id, fromLeadId: "seed-l3",
    },
  });

  // Tasks
  await prisma.task.upsert({
    where: { id: "seed-t1" },
    update: {},
    create: {
      id: "seed-t1", title: "Send pump datasheet to Mohammed", priority: "HIGH",
      dueAt: new Date(Date.now() + 2*86400000),
      assigneeId: manager.id, creatorId: admin.id, opportunityId: opp1.id,
    },
  });
  await prisma.task.upsert({
    where: { id: "seed-t2" },
    update: {},
    create: {
      id: "seed-t2", title: "Schedule site visit - Riyadh Steel", priority: "MEDIUM",
      dueAt: new Date(Date.now() + 5*86400000),
      assigneeId: rep.id, creatorId: manager.id,
    },
  });
  await prisma.task.upsert({
    where: { id: "seed-t3" },
    update: {},
    create: {
      id: "seed-t3", title: "Follow up overdue quote", priority: "HIGH",
      dueAt: new Date(Date.now() - 1*86400000),
      assigneeId: rep.id, creatorId: manager.id,
    },
  });

  /* ---------------- Phase 3: Products ---------------- */
  const products = [
    { sku: "PMP-12HP", name: "12HP High-Pressure Pump",  nameAr: "مضخة عالية الضغط 12 حصان", unitPriceSar: 65000, category: "Pumps" },
    { sku: "PMP-25HP", name: "25HP Centrifugal Pump",     nameAr: "مضخة طرد مركزي 25 حصان",  unitPriceSar: 110000, category: "Pumps" },
    { sku: "CNC-X1",   name: "CNC Mill X1",               nameAr: "مطحنة CNC X1",            unitPriceSar: 280000, category: "Machinery" },
    { sku: "FL-3T",    name: "Forklift 3-ton (Annual SLA)", nameAr: "رافعة شوكية ٣ طن - عقد سنوي", unitPriceSar: 45000, category: "Service" },
    { sku: "INST-DAY", name: "On-site Installation (per day)", nameAr: "تركيب في الموقع (يوم)", unitPriceSar: 4500, category: "Service" },
  ];
  for (const p of products) {
    await prisma.product.upsert({ where: { sku: p.sku }, update: p, create: p });
  }

  // Sample quote
  const existingQuote = await prisma.quote.findUnique({ where: { number: "Q-2026-0001" } });
  if (!existingQuote) {
    const items = [
      { description: "12HP High-Pressure Pump", quantity: 12, unitPriceSar: 65000, discountPct: 5, taxRate: 0.15 },
      { description: "On-site Installation",     quantity: 4,  unitPriceSar: 4500,  discountPct: 0, taxRate: 0.15 },
    ];
    const sub = items.reduce((a, i) => a + i.quantity * i.unitPriceSar, 0);
    const disc = items.reduce((a, i) => a + i.quantity * i.unitPriceSar * (i.discountPct / 100), 0);
    const taxBase = sub - disc;
    const vat = taxBase * 0.15;
    const total = taxBase + vat;
    await prisma.quote.create({
      data: {
        number: "Q-2026-0001", status: "DRAFT", validUntil: new Date(Date.now() + 30 * 86400000),
        opportunityId: opp1.id, companyId: c1.id, contactId: ct1.id, ownerId: manager.id,
        buyerVat: c1.vatNumber, buyerNameAr: c1.nameAr,
        subtotalSar: sub, discountSar: disc, vatSar: vat, totalSar: total,
        items: {
          create: items.map((it, idx) => ({
            description: it.description, quantity: it.quantity, unitPriceSar: it.unitPriceSar,
            discountPct: it.discountPct, taxRate: it.taxRate,
            lineTotal: it.quantity * it.unitPriceSar * (1 - it.discountPct / 100),
            order: idx,
          })),
        },
      },
    });
  }

  /* ---------------- Phase 4: Marketing ---------------- */
  const camp1 = await prisma.campaign.upsert({
    where: { id: "seed-cmp1" },
    update: {},
    create: {
      id: "seed-cmp1", name: "Saudi Build 2026 - Follow-up", channel: "EMAIL", status: "ACTIVE",
      startDate: new Date(Date.now() - 7*86400000), endDate: new Date(Date.now() + 14*86400000),
      budgetSar: 25000, goal: "Convert 30 booth visitors to qualified leads", ownerId: marketing.id,
    },
  });
  await prisma.campaign.upsert({
    where: { id: "seed-cmp2" },
    update: {},
    create: {
      id: "seed-cmp2", name: "Q3 WhatsApp Outreach", channel: "WHATSAPP", status: "DRAFT",
      budgetSar: 8000, goal: "Re-engage dormant accounts in Riyadh region", ownerId: marketing.id,
    },
  });

  for (const ctId of [ct1.id, ct2.id, ct3.id]) {
    await prisma.campaignMember.upsert({
      where: { campaignId_contactId: { campaignId: camp1.id, contactId: ctId } },
      update: {},
      create: { campaignId: camp1.id, contactId: ctId, status: "SENT" },
    });
  }

  // Scoring rules
  const rules = [
    { id: "sr-source-tradeshow", name: "Trade-show source",   field: "source",   operator: "EQUALS",   value: "TRADE_SHOW", points: 25 },
    { id: "sr-source-referral",  name: "Referral source",     field: "source",   operator: "EQUALS",   value: "REFERRAL",   points: 20 },
    { id: "sr-region-eastern",   name: "Eastern Province",    field: "region",   operator: "EQUALS",   value: "Eastern",    points: 10 },
    { id: "sr-size-ent",         name: "Enterprise size",     field: "size",     operator: "EQUALS",   value: "ENT",        points: 15 },
    { id: "sr-industry-oilgas",  name: "Oil & Gas industry",  field: "industry", operator: "CONTAINS", value: "Oil",        points: 15 },
    { id: "sr-title-procurement", name: "Title: procurement", field: "title",    operator: "CONTAINS", value: "Procurement", points: 10 },
  ];
  for (const r of rules) {
    await prisma.scoringRule.upsert({ where: { id: r.id }, update: r, create: r });
  }

  // Activities
  const existingAct = await prisma.activity.findFirst();
  if (!existingAct) {
    await prisma.activity.create({ data: { type: "CALL", subject: "Discovery call with Mohammed", body: "Discussed pump specs.", userId: manager.id, contactId: ct1.id } });
    await prisma.activity.create({ data: { type: "WHATSAPP", subject: "Sent intro brochure", userId: rep.id, contactId: ct2.id } });
    await prisma.activity.create({ data: { type: "STAGE_CHANGE", subject: "Aramco moved to Proposal", userId: manager.id, opportunityId: opp1.id } });
  }

  console.log("Seed complete. Login with admin@prismai.app / Prism@123 (also: manager, sales, marketing, finance @prismai.app)");
}

main().finally(async () => prisma.$disconnect());
