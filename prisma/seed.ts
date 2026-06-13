import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function daysFromNow(n: number) { return new Date(Date.now() + n * 86400000); }
function daysAgo(n: number) { return new Date(Date.now() - n * 86400000); }
function dateStr(n: number) { return daysFromNow(n).toISOString().slice(0, 10); }
function dateStrAgo(n: number) { return daysAgo(n).toISOString().slice(0, 10); }

async function main() {
  const password = await bcrypt.hash("Prism@123", 10);

  // ───────────────────── TEAMS ─────────────────────
  const teamSales = await prisma.team.upsert({ where: { id: "team-sales" }, update: { name: "Sales" }, create: { id: "team-sales", name: "Sales" } });
  const teamMarketing = await prisma.team.upsert({ where: { id: "team-marketing" }, update: { name: "Marketing" }, create: { id: "team-marketing", name: "Marketing" } });
  const teamFinance = await prisma.team.upsert({ where: { id: "team-finance" }, update: { name: "Finance" }, create: { id: "team-finance", name: "Finance" } });
  const teamEngineering = await prisma.team.upsert({ where: { id: "team-engineering" }, update: { name: "Engineering" }, create: { id: "team-engineering", name: "Engineering" } });
  const teamSupport = await prisma.team.upsert({ where: { id: "team-support" }, update: { name: "Support" }, create: { id: "team-support", name: "Support" } });

  // ───────────────────── USERS ─────────────────────
  const admin = await prisma.user.upsert({ where: { email: "admin@prismai.app" }, update: {}, create: { email: "admin@prismai.app", name: "Faisal Al-Saud", passwordHash: password, role: "ADMIN", locale: "en" } });
  const manager = await prisma.user.upsert({ where: { email: "manager@prismai.app" }, update: {}, create: { email: "manager@prismai.app", name: "Khalid Al-Mansour", passwordHash: password, role: "SALES_MANAGER", locale: "en" } });
  const rep = await prisma.user.upsert({ where: { email: "sales@prismai.app" }, update: {}, create: { email: "sales@prismai.app", name: "Noura Al-Harbi", passwordHash: password, role: "SALES_REP", locale: "ar" } });
  const marketing = await prisma.user.upsert({ where: { email: "marketing@prismai.app" }, update: {}, create: { email: "marketing@prismai.app", name: "Sara Al-Otaibi", passwordHash: password, role: "MARKETING", locale: "en" } });
  const finance = await prisma.user.upsert({ where: { email: "finance@prismai.app" }, update: {}, create: { email: "finance@prismai.app", name: "Omar Al-Dossary", passwordHash: password, role: "FINANCE", locale: "en" } });
  const rep2 = await prisma.user.upsert({ where: { email: "sales2@prismai.app" }, update: {}, create: { email: "sales2@prismai.app", name: "Ahmed Al-Zahrani", passwordHash: password, role: "SALES_REP", locale: "ar" } });
  const rep3 = await prisma.user.upsert({ where: { email: "sales3@prismai.app" }, update: {}, create: { email: "sales3@prismai.app", name: "Fatima Al-Rashid", passwordHash: password, role: "SALES_REP", locale: "en" } });
  const eng = await prisma.user.upsert({ where: { email: "engineer@prismai.app" }, update: {}, create: { email: "engineer@prismai.app", name: "Tariq Al-Mutairi", passwordHash: password, role: "SALES_REP", locale: "en" } });

  // Assign users to teams
  await prisma.team.update({ where: { id: teamSales.id }, data: { members: { set: [{ email: "manager@prismai.app" }, { email: "sales@prismai.app" }, { email: "sales2@prismai.app" }, { email: "sales3@prismai.app" }] } } });
  await prisma.team.update({ where: { id: teamMarketing.id }, data: { members: { set: [{ email: "marketing@prismai.app" }] } } });
  await prisma.team.update({ where: { id: teamFinance.id }, data: { members: { set: [{ email: "finance@prismai.app" }] } } });
  await prisma.team.update({ where: { id: teamEngineering.id }, data: { members: { set: [{ email: "engineer@prismai.app" }] } } });
  await prisma.team.update({ where: { id: teamSupport.id }, data: { members: { set: [{ email: "admin@prismai.app" }] } } });

  const users = [admin, manager, rep, marketing, finance, rep2, rep3, eng];

  // ───────────────────── COMPANIES (15) ─────────────────────
  const companyData = [
    { id: "c-aramco",    name: "Aramco Trading",               nameAr: "أرامكو للتجارة",              industry: "Oil & Gas",       region: "Eastern",  website: "https://aramco.com",           vatNumber: "300000000000003", size: "ENT", ownerId: manager.id },
    { id: "c-riyadhstl", name: "Riyadh Steel Co.",              nameAr: "شركة الرياض للحديد",            industry: "Manufacturing",   region: "Riyadh",   website: "https://riyadhsteel.sa",       vatNumber: "310000000000012", size: "MID", ownerId: rep.id },
    { id: "c-jeddahlog", name: "Jeddah Logistics",              nameAr: "جدة للخدمات اللوجستية",         industry: "Logistics",       region: "Jeddah",   website: "https://jeddahlog.sa",         size: "SMB",  ownerId: rep.id },
    { id: "c-sabic",     name: "SABIC Polymers",                nameAr: "سابك للبوليمرات",              industry: "Petrochemicals",  region: "Jubail",   website: "https://sabic.com",            vatNumber: "300000000000017", size: "ENT", ownerId: manager.id },
    { id: "c-maaden",    name: "Ma'aden Mining",                nameAr: "شركة معادن",                  industry: "Mining",          region: "Riyadh",   website: "https://maaden.com.sa",        vatNumber: "300000000000025", size: "ENT", ownerId: rep2.id },
    { id: "c-alrajhi",   name: "Al-Rajhi Construction",         nameAr: "الراجحي للمقاولات",             industry: "Construction",    region: "Riyadh",   website: "https://alrajhi-group.com",    vatNumber: "300000000000033", size: "ENT", ownerId: rep.id },
    { id: "c-swa",       name: "Saudi Water Authority",         nameAr: "هيئة المياه السعودية",          industry: "Utilities",       region: "Riyadh",   website: "https://swa.gov.sa",           vatNumber: "300000000000041", size: "ENT", ownerId: manager.id },
    { id: "c-haramain",  name: "Haramain Rail Services",        nameAr: "خدمات قطار الحرمين",           industry: "Transportation",  region: "Makkah",   website: "https://haramainrailway.sa",   size: "MID",  ownerId: rep3.id },
    { id: "c-tabukpha",  name: "Tabuk Pharma Ltd.",             nameAr: "تبوك للصناعات الدوائية",        industry: "Pharmaceuticals", region: "Tabuk",    website: "https://tabukpharma.com",      size: "MID",  ownerId: rep2.id },
    { id: "c-acwa",      name: "ACWA Power",                    nameAr: "أكوا باور",                   industry: "Energy",          region: "Riyadh",   website: "https://acwapower.com",        vatNumber: "300000000000059", size: "ENT", ownerId: manager.id },
    { id: "c-yanbucem",  name: "Yanbu Cement Co.",              nameAr: "شركة أسمنت ينبع",              industry: "Building Materials", region: "Yanbu", website: "https://yanbucement.com",      vatNumber: "300000000000067", size: "MID", ownerId: rep3.id },
    { id: "c-natship",   name: "National Shipping Co.",         nameAr: "الشركة الوطنية للملاحة",        industry: "Shipping",        region: "Jeddah",   website: "https://bahri.sa",             size: "ENT",  ownerId: rep.id },
    { id: "c-abhamedic", name: "Abha Medical Supplies",         nameAr: "أبها للمستلزمات الطبية",        industry: "Healthcare",      region: "Abha",     size: "SMB",  ownerId: rep2.id },
    { id: "c-eastpetro", name: "Eastern Petrochemicals",        nameAr: "شرق للبتروكيماويات",           industry: "Petrochemicals",  region: "Dammam",   website: "https://eastpetro.sa",         size: "MID",  ownerId: eng.id },
    { id: "c-madindig",  name: "Madinah Digital Solutions",      nameAr: "المدينة للحلول الرقمية",       industry: "Technology",       region: "Madinah",  website: "https://madindigital.sa",      size: "SMB",  ownerId: rep3.id },
  ];
  const companies: Record<string, any> = {};
  for (const c of companyData) {
    companies[c.id] = await prisma.company.upsert({ where: { id: c.id }, update: {}, create: c });
  }

  // ───────────────────── CONTACTS (25) ─────────────────────
  const contactData = [
    { id: "ct-mohammed",  firstName: "Mohammed",  lastName: "Al-Qahtani",  nameAr: "محمد القحطاني",      email: "mohammed@aramco.com",        phone: "+966500000001", whatsapp: "+966500000001", title: "Procurement Manager",   companyId: "c-aramco",    ownerId: manager.id },
    { id: "ct-noura",     firstName: "Noura",     lastName: "Al-Saud",     nameAr: "نورة آل سعود",       email: "noura@riyadhsteel.sa",       phone: "+966500000002", title: "Operations Lead",       companyId: "c-riyadhstl", ownerId: rep.id },
    { id: "ct-yusuf",     firstName: "Yusuf",     lastName: "Bakr",        email: "yusuf@jeddahlog.sa",                                        phone: "+966500000003", title: "Owner",                 companyId: "c-jeddahlog", ownerId: rep.id },
    { id: "ct-abdullah",  firstName: "Abdullah",  lastName: "Al-Rashed",   nameAr: "عبدالله الراشد",      email: "abdullah@sabic.com",         phone: "+966500000004", whatsapp: "+966500000004", title: "Plant Director",       companyId: "c-sabic",     ownerId: manager.id },
    { id: "ct-salman",    firstName: "Salman",    lastName: "Al-Otaibi",   nameAr: "سلمان العتيبي",       email: "salman@maaden.com.sa",       phone: "+966500000005", title: "VP Engineering",        companyId: "c-maaden",    ownerId: rep2.id },
    { id: "ct-hanan",     firstName: "Hanan",     lastName: "Al-Zahrani",  nameAr: "حنان الزهراني",       email: "hanan@alrajhi-group.com",    phone: "+966500000006", whatsapp: "+966500000006", title: "Project Coordinator", companyId: "c-alrajhi",   ownerId: rep.id },
    { id: "ct-fahad",     firstName: "Fahad",     lastName: "Al-Dosari",   nameAr: "فهد الدوسري",         email: "fahad@swa.gov.sa",           phone: "+966500000007", title: "Chief Engineer",        companyId: "c-swa",       ownerId: manager.id },
    { id: "ct-maha",      firstName: "Maha",      lastName: "Al-Shammari", nameAr: "مها الشمري",          email: "maha@haramainrailway.sa",    phone: "+966500000008", whatsapp: "+966500000008", title: "Procurement Head", companyId: "c-haramain",  ownerId: rep3.id },
    { id: "ct-turki",     firstName: "Turki",     lastName: "Al-Ghamdi",   nameAr: "تركي الغامدي",        email: "turki@tabukpharma.com",      phone: "+966500000009", title: "Quality Director",      companyId: "c-tabukpha",  ownerId: rep2.id },
    { id: "ct-reem",      firstName: "Reem",      lastName: "Al-Harbi",    nameAr: "ريم الحربي",          email: "reem@acwapower.com",         phone: "+966500000010", whatsapp: "+966500000010", title: "Operations VP",    companyId: "c-acwa",      ownerId: manager.id },
    { id: "ct-saud",      firstName: "Saud",      lastName: "Al-Mutairi",  nameAr: "سعود المطيري",        email: "saud@yanbucement.com",       phone: "+966500000011", title: "Maintenance Manager",   companyId: "c-yanbucem",  ownerId: rep3.id },
    { id: "ct-layla",     firstName: "Layla",     lastName: "Al-Khatib",   nameAr: "ليلى الخطيب",         email: "layla@bahri.sa",             phone: "+966500000012", whatsapp: "+966500000012", title: "Fleet Manager",    companyId: "c-natship",   ownerId: rep.id },
    { id: "ct-omar",      firstName: "Omar",      lastName: "Hassan",      nameAr: "عمر حسن",            email: "omar@abhamedical.sa",        phone: "+966500000013", title: "Purchasing Officer",    companyId: "c-abhamedic", ownerId: rep2.id },
    { id: "ct-saad",      firstName: "Saad",      lastName: "Al-Qahtani",  nameAr: "سعد القحطاني",        email: "saad@eastpetro.sa",          phone: "+966500000014", whatsapp: "+966500000014", title: "Technical Lead", companyId: "c-eastpetro", ownerId: eng.id },
    { id: "ct-nada",      firstName: "Nada",      lastName: "Al-Faisal",   nameAr: "ندى الفيصل",          email: "nada@madindigital.sa",       phone: "+966500000015", title: "CTO",                   companyId: "c-madindig",  ownerId: rep3.id },
    // Additional contacts — second person at key accounts
    { id: "ct-khalid-a",  firstName: "Khalid",    lastName: "Al-Ahmadi",   nameAr: "خالد الأحمدي",        email: "khalid.a@aramco.com",        phone: "+966500000016", title: "VP Supply Chain",       companyId: "c-aramco",    ownerId: manager.id },
    { id: "ct-badr",      firstName: "Badr",      lastName: "Al-Dawsari",  nameAr: "بدر الدوسري",         email: "badr@sabic.com",             phone: "+966500000017", title: "Procurement Specialist", companyId: "c-sabic",   ownerId: rep2.id },
    { id: "ct-amira",     firstName: "Amira",     lastName: "Al-Yami",     nameAr: "أميرة اليامي",        email: "amira@acwapower.com",        phone: "+966500000018", whatsapp: "+966500000018", title: "Project Manager", companyId: "c-acwa",     ownerId: manager.id },
    { id: "ct-mishal",    firstName: "Mishal",    lastName: "Al-Enezi",    nameAr: "مشعل العنزي",         email: "mishal@maaden.com.sa",       phone: "+966500000019", title: "Site Manager",          companyId: "c-maaden",    ownerId: rep2.id },
    { id: "ct-dina",      firstName: "Dina",      lastName: "Al-Shahrani", nameAr: "دينا الشهراني",       email: "dina@riyadhsteel.sa",        phone: "+966500000020", title: "Finance Director",      companyId: "c-riyadhstl", ownerId: rep.id },
    { id: "ct-waleed",    firstName: "Waleed",    lastName: "Al-Malki",    nameAr: "وليد المالكي",        email: "waleed@alrajhi-group.com",   phone: "+966500000021", whatsapp: "+966500000021", title: "Site Engineer",   companyId: "c-alrajhi",  ownerId: rep.id },
    { id: "ct-amal",      firstName: "Amal",      lastName: "Al-Tamimi",   nameAr: "أمل التميمي",         email: "amal@swa.gov.sa",            phone: "+966500000022", title: "Project Analyst",       companyId: "c-swa",       ownerId: manager.id },
    { id: "ct-sultan",    firstName: "Sultan",    lastName: "Al-Qahtani",  nameAr: "سلطان القحطاني",      email: "sultan@jeddahlog.sa",        phone: "+966500000023", title: "Operations Manager",    companyId: "c-jeddahlog", ownerId: rep.id },
    { id: "ct-raghad",    firstName: "Raghad",    lastName: "Al-Otaibi",   nameAr: "رغد العتيبي",         email: "raghad@haramainrailway.sa",  phone: "+966500000024", title: "Safety Officer",        companyId: "c-haramain",  ownerId: rep3.id },
    { id: "ct-faris",     firstName: "Faris",     lastName: "Al-Subaie",   nameAr: "فارس السبيعي",        email: "faris@eastpetro.sa",         phone: "+966500000025", title: "Plant Supervisor",      companyId: "c-eastpetro", ownerId: eng.id },
  ];
  const contacts: Record<string, any> = {};
  for (const ct of contactData) {
    contacts[ct.id] = await prisma.contact.upsert({ where: { id: ct.id }, update: {}, create: ct });
  }

  // ───────────────────── PIPELINE STAGES ─────────────────────
  const stages = [
    { id: "stage-new",         name: "New",          nameAr: "جديد",   order: 1, probability: 10, color: "#94a3b8" },
    { id: "stage-qualified",   name: "Qualified",    nameAr: "مؤهل",   order: 2, probability: 25, color: "#3498db" },
    { id: "stage-proposal",    name: "Proposal",     nameAr: "عرض",    order: 3, probability: 50, color: "#9b59b6" },
    { id: "stage-negotiation", name: "Negotiation",  nameAr: "تفاوض",  order: 4, probability: 70, color: "#f39c12" },
    { id: "stage-approval",    name: "Approval",     nameAr: "اعتماد",  order: 5, probability: 85, color: "#1abc9c" },
    { id: "stage-won",         name: "Won",          nameAr: "ربح",    order: 6, probability: 100, isWon: true,  color: "#27ae60" },
    { id: "stage-lost",        name: "Lost",         nameAr: "خسارة",  order: 7, probability: 0,   isLost: true, color: "#e74c3c" },
  ];
  for (const s of stages) {
    await prisma.pipelineStage.upsert({ where: { id: s.id }, update: s, create: s });
  }

  // ───────────────────── LEADS (20) ─────────────────────
  const leadData = [
    { id: "l-1",  title: "Industrial Pump Order - Q3",             source: "TRADE_SHOW",  status: "QUALIFIED",     score: 70, estimatedValue: 850000,   companyId: "c-aramco",    contactId: "ct-mohammed",  ownerId: manager.id },
    { id: "l-2",  title: "CNC Machine Upgrade",                    source: "WEB",         status: "CONTACTED",     score: 45, estimatedValue: 320000,   companyId: "c-riyadhstl", contactId: "ct-noura",     ownerId: rep.id },
    { id: "l-3",  title: "Forklift Service Contract",              source: "REFERRAL",    status: "NEW",           score: 20, estimatedValue: 90000,    companyId: "c-jeddahlog", contactId: "ct-yusuf",     ownerId: rep.id },
    { id: "l-4",  title: "SABIC Polymer Plant - Valve Overhaul",   source: "TRADE_SHOW",  status: "QUALIFIED",     score: 85, estimatedValue: 1200000,  companyId: "c-sabic",     contactId: "ct-abdullah",  ownerId: manager.id },
    { id: "l-5",  title: "Ma'aden Phosphate - Conveyor Belts",     source: "LINKEDIN",    status: "CONTACTED",     score: 55, estimatedValue: 480000,   companyId: "c-maaden",    contactId: "ct-salman",    ownerId: rep2.id },
    { id: "l-6",  title: "Al-Rajhi Tower Crane Rental",            source: "COLD",        status: "QUALIFIED",     score: 40, estimatedValue: 350000,   companyId: "c-alrajhi",   contactId: "ct-hanan",     ownerId: rep.id },
    { id: "l-7",  title: "SWA Desalination Pump Upgrade",          source: "WEB",         status: "QUALIFIED",     score: 65, estimatedValue: 950000,   companyId: "c-swa",       contactId: "ct-fahad",     ownerId: manager.id },
    { id: "l-8",  title: "Haramain Station HVAC System",           source: "REFERRAL",    status: "CONTACTED",     score: 35, estimatedValue: 280000,   companyId: "c-haramain",  contactId: "ct-maha",      ownerId: rep3.id },
    { id: "l-9",  title: "Tabuk Pharma Cleanroom Equipment",       source: "TRADE_SHOW",  status: "NEW",           score: 50, estimatedValue: 420000,   companyId: "c-tabukpha",  contactId: "ct-turki",     ownerId: rep2.id },
    { id: "l-10", title: "ACWA Solar Panel Mounting Structures",   source: "LINKEDIN",    status: "QUALIFIED",     score: 75, estimatedValue: 1500000,  companyId: "c-acwa",      contactId: "ct-reem",      ownerId: manager.id },
    { id: "l-11", title: "Yanbu Cement Kiln Spare Parts",          source: "WEB",         status: "CONTACTED",     score: 30, estimatedValue: 180000,   companyId: "c-yanbucem",  contactId: "ct-saud",      ownerId: rep3.id },
    { id: "l-12", title: "Bahri Fleet Engine Overhaul",            source: "COLD",        status: "QUALIFIED",     score: 60, estimatedValue: 720000,   companyId: "c-natship",   contactId: "ct-layla",     ownerId: rep.id },
    { id: "l-13", title: "Abha Medical Sterilizer Units",          source: "OTHER",       status: "NEW",           score: 25, estimatedValue: 150000,   companyId: "c-abhamedic", contactId: "ct-omar",      ownerId: rep2.id },
    { id: "l-14", title: "Eastern Petro Heat Exchanger",           source: "REFERRAL",    status: "CONTACTED",     score: 55, estimatedValue: 560000,   companyId: "c-eastpetro", contactId: "ct-saad",      ownerId: eng.id },
    { id: "l-15", title: "Madinah Digital Server Room Cooling",    source: "WEB",         status: "NEW",           score: 15, estimatedValue: 95000,    companyId: "c-madindig",  contactId: "ct-nada",      ownerId: rep3.id },
    { id: "l-16", title: "Aramco Supply Chain Automation",         source: "LINKEDIN",    status: "CONVERTED",     score: 80, estimatedValue: 2200000,  companyId: "c-aramco",    contactId: "ct-khalid-a",  ownerId: manager.id, convertedAt: daysAgo(45) },
    { id: "l-17", title: "SABIC Lab Equipment Expansion",          source: "WEB",         status: "CONVERTED",     score: 72, estimatedValue: 880000,   companyId: "c-sabic",     contactId: "ct-badr",      ownerId: rep2.id,    convertedAt: daysAgo(30) },
    { id: "l-18", title: "SWA Pipeline Inspection Drones",         source: "TRADE_SHOW",  status: "DISQUALIFIED",  score: 10, estimatedValue: 200000,   companyId: "c-swa",       contactId: "ct-amal",      ownerId: manager.id, notes: "Budget frozen for FY2026. Re-engage in Q1 2027." },
    { id: "l-19", title: "Ma'aden Drill Bit Procurement",          source: "COLD",        status: "CONTACTED",     score: 42, estimatedValue: 310000,   companyId: "c-maaden",    contactId: "ct-mishal",    ownerId: rep2.id },
    { id: "l-20", title: "Al-Rajhi Smart Building Sensors",        source: "LINKEDIN",    status: "NEW",           score: 28, estimatedValue: 175000,   companyId: "c-alrajhi",   contactId: "ct-waleed",    ownerId: rep.id },
  ];
  for (const l of leadData) {
    await prisma.lead.upsert({ where: { id: l.id }, update: {}, create: l });
  }

  // ───────────────────── OPPORTUNITIES (18 active + 12 historical won/lost) ─────────────────────
  const activeOpps = [
    { id: "opp-1",  title: "Aramco - 12x Industrial Pumps",          amount: 850000,  stageId: "stage-proposal",    probability: 50, expectedCloseAt: daysFromNow(30),  ownerId: manager.id, companyId: "c-aramco",    contactId: "ct-mohammed",  fromLeadId: "l-1" },
    { id: "opp-2",  title: "Riyadh Steel - CNC Machine Upgrade",     amount: 320000,  stageId: "stage-qualified",   probability: 25, expectedCloseAt: daysFromNow(60),  ownerId: rep.id,     companyId: "c-riyadhstl", contactId: "ct-noura",     fromLeadId: "l-2" },
    { id: "opp-3",  title: "Jeddah Logistics - Forklift Service",    amount: 90000,   stageId: "stage-new",         probability: 10, expectedCloseAt: daysFromNow(14),  ownerId: rep.id,     companyId: "c-jeddahlog", contactId: "ct-yusuf",     fromLeadId: "l-3" },
    { id: "opp-4",  title: "SABIC - Valve Overhaul Contract",        amount: 1200000, stageId: "stage-negotiation", probability: 70, expectedCloseAt: daysFromNow(21),  ownerId: manager.id, companyId: "c-sabic",     contactId: "ct-abdullah",  fromLeadId: "l-4" },
    { id: "opp-5",  title: "Ma'aden - Conveyor Belt System",         amount: 480000,  stageId: "stage-proposal",    probability: 50, expectedCloseAt: daysFromNow(45),  ownerId: rep2.id,    companyId: "c-maaden",    contactId: "ct-salman",    fromLeadId: "l-5" },
    { id: "opp-6",  title: "Al-Rajhi - Tower Crane 6-month Rental",  amount: 350000,  stageId: "stage-qualified",   probability: 25, expectedCloseAt: daysFromNow(35),  ownerId: rep.id,     companyId: "c-alrajhi",   contactId: "ct-hanan",     fromLeadId: "l-6" },
    { id: "opp-7",  title: "SWA - Desalination Pump Package",        amount: 950000,  stageId: "stage-approval",    probability: 85, expectedCloseAt: daysFromNow(10),  ownerId: manager.id, companyId: "c-swa",       contactId: "ct-fahad",     fromLeadId: "l-7" },
    { id: "opp-8",  title: "ACWA Solar - Mounting Structures",       amount: 1500000, stageId: "stage-proposal",    probability: 50, expectedCloseAt: daysFromNow(55),  ownerId: manager.id, companyId: "c-acwa",      contactId: "ct-reem",      fromLeadId: "l-10" },
    { id: "opp-9",  title: "Bahri - Marine Engine Overhaul",         amount: 720000,  stageId: "stage-negotiation", probability: 70, expectedCloseAt: daysFromNow(25),  ownerId: rep.id,     companyId: "c-natship",   contactId: "ct-layla",     fromLeadId: "l-12" },
    { id: "opp-10", title: "Aramco - Supply Chain Automation",       amount: 2200000, stageId: "stage-negotiation", probability: 70, expectedCloseAt: daysFromNow(20),  ownerId: manager.id, companyId: "c-aramco",    contactId: "ct-khalid-a",  fromLeadId: "l-16" },
    { id: "opp-11", title: "SABIC - Lab Equipment Expansion",        amount: 880000,  stageId: "stage-qualified",   probability: 25, expectedCloseAt: daysFromNow(50),  ownerId: rep2.id,    companyId: "c-sabic",     contactId: "ct-badr",      fromLeadId: "l-17" },
    { id: "opp-12", title: "Eastern Petro - Heat Exchanger System",  amount: 560000,  stageId: "stage-new",         probability: 10, expectedCloseAt: daysFromNow(70),  ownerId: eng.id,     companyId: "c-eastpetro", contactId: "ct-saad",      fromLeadId: "l-14" },
  ];
  for (const o of activeOpps) {
    await prisma.opportunity.upsert({ where: { id: o.id }, update: {}, create: o });
  }

  // Historical won/lost deals — spread across last 12 months for rich charts
  const historicalOpps = [
    { id: "opp-w1",  title: "Aramco - Boiler Feedwater Pumps",       amount: 620000,  stageId: "stage-won",  closedAt: daysAgo(330), ownerId: manager.id, companyId: "c-aramco",    contactId: "ct-mohammed" },
    { id: "opp-w2",  title: "SABIC - Cooling Tower Maintenance",     amount: 280000,  stageId: "stage-won",  closedAt: daysAgo(300), ownerId: rep2.id,    companyId: "c-sabic",     contactId: "ct-abdullah" },
    { id: "opp-w3",  title: "Ma'aden - Excavator Parts",             amount: 410000,  stageId: "stage-won",  closedAt: daysAgo(270), ownerId: rep2.id,    companyId: "c-maaden",    contactId: "ct-salman" },
    { id: "opp-w4",  title: "ACWA - Transformer Installation",       amount: 1800000, stageId: "stage-won",  closedAt: daysAgo(240), ownerId: manager.id, companyId: "c-acwa",      contactId: "ct-reem" },
    { id: "opp-w5",  title: "SWA - Pipe Rehabilitation Phase I",     amount: 3200000, stageId: "stage-won",  closedAt: daysAgo(210), ownerId: manager.id, companyId: "c-swa",       contactId: "ct-fahad" },
    { id: "opp-w6",  title: "Riyadh Steel - Structural Beams",       amount: 155000,  stageId: "stage-won",  closedAt: daysAgo(180), ownerId: rep.id,     companyId: "c-riyadhstl", contactId: "ct-noura" },
    { id: "opp-w7",  title: "Haramain Rail - Signal Equipment",      amount: 540000,  stageId: "stage-won",  closedAt: daysAgo(150), ownerId: rep3.id,    companyId: "c-haramain",  contactId: "ct-maha" },
    { id: "opp-w8",  title: "Al-Rajhi - Concrete Pumps Rental",      amount: 190000,  stageId: "stage-won",  closedAt: daysAgo(120), ownerId: rep.id,     companyId: "c-alrajhi",   contactId: "ct-hanan" },
    { id: "opp-w9",  title: "Yanbu Cement - Crusher Liners",         amount: 230000,  stageId: "stage-won",  closedAt: daysAgo(90),  ownerId: rep3.id,    companyId: "c-yanbucem",  contactId: "ct-saud" },
    { id: "opp-w10", title: "Bahri - Anchor Chain Replacement",      amount: 370000,  stageId: "stage-won",  closedAt: daysAgo(60),  ownerId: rep.id,     companyId: "c-natship",   contactId: "ct-layla" },
    { id: "opp-w11", title: "ACWA - Solar Inverter Upgrade",         amount: 920000,  stageId: "stage-won",  closedAt: daysAgo(30),  ownerId: manager.id, companyId: "c-acwa",      contactId: "ct-amira" },
    { id: "opp-w12", title: "Tabuk Pharma - HVAC Filters",           amount: 85000,   stageId: "stage-won",  closedAt: daysAgo(15),  ownerId: rep2.id,    companyId: "c-tabukpha",  contactId: "ct-turki" },
    // Lost deals
    { id: "opp-x1",  title: "Madinah Digital - UPS Systems",         amount: 120000,  stageId: "stage-lost", closedAt: daysAgo(280), closeReason: "Competitor priced 15% lower",            ownerId: rep3.id,    companyId: "c-madindig",  contactId: "ct-nada" },
    { id: "opp-x2",  title: "Abha Medical - Autoclave Units",        amount: 95000,   stageId: "stage-lost", closedAt: daysAgo(200), closeReason: "Budget cuts — postponed to next FY",     ownerId: rep2.id,    companyId: "c-abhamedic", contactId: "ct-omar" },
    { id: "opp-x3",  title: "Jeddah Logistics - Pallet Trucks",      amount: 65000,   stageId: "stage-lost", closedAt: daysAgo(130), closeReason: "Chose a local Jeddah supplier",          ownerId: rep.id,     companyId: "c-jeddahlog", contactId: "ct-yusuf" },
    { id: "opp-x4",  title: "Eastern Petro - Valve Actuators",       amount: 180000,  stageId: "stage-lost", closedAt: daysAgo(75),  closeReason: "Spec mismatch — required explosion-proof model", ownerId: eng.id, companyId: "c-eastpetro", contactId: "ct-saad" },
    { id: "opp-x5",  title: "Ma'aden - Safety Harness Bulk Order",   amount: 42000,   stageId: "stage-lost", closedAt: daysAgo(20),  closeReason: "Awarded to existing approved vendor",    ownerId: rep2.id,    companyId: "c-maaden",    contactId: "ct-mishal" },
    { id: "opp-x6",  title: "SWA - Remote Monitoring Sensors",       amount: 310000,  stageId: "stage-lost", closedAt: daysAgo(5),   closeReason: "Tender cancelled — re-scoping the project", ownerId: manager.id, companyId: "c-swa",    contactId: "ct-amal" },
  ];
  for (const o of historicalOpps) {
    await prisma.opportunity.upsert({
      where: { id: o.id },
      update: {},
      create: { ...o, probability: o.stageId === "stage-won" ? 100 : 0, expectedCloseAt: o.closedAt },
    });
  }

  // ───────────────────── PRODUCTS (10) ─────────────────────
  const products = [
    { sku: "PMP-12HP",  name: "12HP High-Pressure Pump",                nameAr: "مضخة عالية الضغط 12 حصان",            unitPriceSar: 65000,  category: "Pumps" },
    { sku: "PMP-25HP",  name: "25HP Centrifugal Pump",                  nameAr: "مضخة طرد مركزي 25 حصان",              unitPriceSar: 110000, category: "Pumps" },
    { sku: "PMP-SUB",   name: "Submersible Pump 50HP",                  nameAr: "مضخة غاطسة 50 حصان",                  unitPriceSar: 185000, category: "Pumps" },
    { sku: "CNC-X1",    name: "CNC Mill X1",                            nameAr: "مطحنة CNC X1",                       unitPriceSar: 280000, category: "Machinery" },
    { sku: "CNC-LATHE", name: "CNC Lathe Pro 200",                      nameAr: "مخرطة CNC برو 200",                   unitPriceSar: 340000, category: "Machinery" },
    { sku: "FL-3T",     name: "Forklift 3-ton (Annual SLA)",            nameAr: "رافعة شوكية ٣ طن - عقد سنوي",         unitPriceSar: 45000,  category: "Service" },
    { sku: "FL-5T",     name: "Forklift 5-ton (Annual SLA)",            nameAr: "رافعة شوكية ٥ طن - عقد سنوي",         unitPriceSar: 72000,  category: "Service" },
    { sku: "INST-DAY",  name: "On-site Installation (per day)",         nameAr: "تركيب في الموقع (يوم)",               unitPriceSar: 4500,   category: "Service" },
    { sku: "VALVE-4IN", name: "4\" Industrial Gate Valve",               nameAr: "صمام بوابة صناعي 4 بوصة",              unitPriceSar: 3200,   category: "Components" },
    { sku: "CONV-BELT", name: "Heavy-Duty Conveyor Belt (per meter)",    nameAr: "سير ناقل ثقيل (لكل متر)",             unitPriceSar: 850,    category: "Components" },
  ];
  for (const p of products) {
    await prisma.product.upsert({ where: { sku: p.sku }, update: p, create: p });
  }

  // ───────────────────── QUOTES (5) ─────────────────────
  const quoteSpecs = [
    { number: "Q-2026-0001", status: "DRAFT",    oppId: "opp-1",  companyId: "c-aramco",    contactId: "ct-mohammed",  ownerId: manager.id, vatNum: "300000000000003", nameAr: "أرامكو للتجارة",
      items: [{ desc: "12HP High-Pressure Pump", qty: 12, price: 65000, disc: 5, tax: 0.15 }, { desc: "On-site Installation (4 days)", qty: 4, price: 4500, disc: 0, tax: 0.15 }] },
    { number: "Q-2026-0002", status: "PENDING_APPROVAL", oppId: "opp-4", companyId: "c-sabic", contactId: "ct-abdullah", ownerId: manager.id, vatNum: "300000000000017", nameAr: "سابك للبوليمرات",
      items: [{ desc: "4\" Industrial Gate Valve", qty: 80, price: 3200, disc: 8, tax: 0.15 }, { desc: "On-site Installation (10 days)", qty: 10, price: 4500, disc: 0, tax: 0.15 }] },
    { number: "Q-2026-0003", status: "APPROVED",  oppId: "opp-7",  companyId: "c-swa",       contactId: "ct-fahad",     ownerId: manager.id, vatNum: "300000000000041", nameAr: "هيئة المياه السعودية",
      items: [{ desc: "25HP Centrifugal Pump", qty: 6, price: 110000, disc: 3, tax: 0.15 }, { desc: "Submersible Pump 50HP", qty: 2, price: 185000, disc: 0, tax: 0.15 }] },
    { number: "Q-2026-0004", status: "SENT",      oppId: "opp-9",  companyId: "c-natship",   contactId: "ct-layla",     ownerId: rep.id,     nameAr: "الشركة الوطنية للملاحة",
      items: [{ desc: "CNC Lathe Pro 200", qty: 1, price: 340000, disc: 0, tax: 0.15 }, { desc: "Forklift 5-ton (Annual SLA)", qty: 2, price: 72000, disc: 10, tax: 0.15 }] },
    { number: "Q-2026-0005", status: "DRAFT",     oppId: "opp-5",  companyId: "c-maaden",    contactId: "ct-salman",    ownerId: rep2.id,    vatNum: "300000000000025", nameAr: "شركة معادن",
      items: [{ desc: "Heavy-Duty Conveyor Belt", qty: 500, price: 850, disc: 5, tax: 0.15 }, { desc: "On-site Installation (7 days)", qty: 7, price: 4500, disc: 0, tax: 0.15 }] },
  ];
  for (const q of quoteSpecs) {
    const existing = await prisma.quote.findUnique({ where: { number: q.number } });
    if (existing) continue;
    const sub = q.items.reduce((a, i) => a + i.qty * i.price, 0);
    const disc = q.items.reduce((a, i) => a + i.qty * i.price * (i.disc / 100), 0);
    const taxBase = sub - disc;
    const vat = taxBase * 0.15;
    const total = taxBase + vat;
    await prisma.quote.create({
      data: {
        number: q.number, status: q.status, validUntil: daysFromNow(30),
        opportunityId: q.oppId, companyId: q.companyId, contactId: q.contactId, ownerId: q.ownerId,
        buyerVat: q.vatNum || null, buyerNameAr: q.nameAr,
        subtotalSar: sub, discountSar: disc, vatSar: vat, totalSar: total,
        items: {
          create: q.items.map((it, idx) => ({
            description: it.desc, quantity: it.qty, unitPriceSar: it.price,
            discountPct: it.disc, taxRate: it.tax,
            lineTotal: it.qty * it.price * (1 - it.disc / 100),
            order: idx,
          })),
        },
      },
    });
  }

  // ───────────────────── TASKS (18) ─────────────────────
  const taskData = [
    { id: "t-1",  title: "Send pump datasheet to Mohammed",             priority: "HIGH",   dueAt: dateStr(2),    assigneeId: manager.id, creatorId: admin.id,   opportunityId: "opp-1" },
    { id: "t-2",  title: "Schedule site visit - Riyadh Steel",          priority: "MEDIUM", dueAt: dateStr(5),    assigneeId: rep.id,     creatorId: manager.id },
    { id: "t-3",  title: "Follow up overdue quote Q-2026-0001",         priority: "HIGH",   dueAt: dateStrAgo(1), assigneeId: rep.id,     creatorId: manager.id, opportunityId: "opp-1" },
    { id: "t-4",  title: "Prepare SABIC valve overhaul proposal",       priority: "HIGH",   dueAt: dateStr(3),    assigneeId: manager.id, creatorId: admin.id,   opportunityId: "opp-4" },
    { id: "t-5",  title: "Call Ma'aden VP about conveyor specs",        priority: "MEDIUM", dueAt: dateStr(1),    assigneeId: rep2.id,    creatorId: manager.id, opportunityId: "opp-5",  leadId: "l-5" },
    { id: "t-6",  title: "Send Haramain HVAC catalog via WhatsApp",     priority: "LOW",    dueAt: dateStr(7),    assigneeId: rep3.id,    creatorId: manager.id, leadId: "l-8" },
    { id: "t-7",  title: "Review ACWA Solar mounting blueprints",       priority: "HIGH",   dueAt: dateStr(4),    assigneeId: eng.id,     creatorId: manager.id, opportunityId: "opp-8" },
    { id: "t-8",  title: "Follow up SWA desalination approval",        priority: "HIGH",   dueAt: dateStr(2),    assigneeId: manager.id, creatorId: admin.id,   opportunityId: "opp-7" },
    { id: "t-9",  title: "Book flight to Yanbu for cement site visit",  priority: "MEDIUM", dueAt: dateStr(10),   assigneeId: rep3.id,    creatorId: manager.id, leadId: "l-11" },
    { id: "t-10", title: "Draft Bahri engine overhaul timeline",        priority: "HIGH",   dueAt: dateStr(3),    assigneeId: rep.id,     creatorId: manager.id, opportunityId: "opp-9" },
    { id: "t-11", title: "Collect Tabuk Pharma cleanroom requirements", priority: "MEDIUM", dueAt: dateStr(6),    assigneeId: rep2.id,    creatorId: admin.id,   leadId: "l-9" },
    { id: "t-12", title: "Compare competitor pricing for Al-Rajhi bid", priority: "LOW",    dueAt: dateStr(8),    assigneeId: rep.id,     creatorId: manager.id, opportunityId: "opp-6" },
    { id: "t-13", title: "Send Aramco supply chain RFI response",      priority: "HIGH",   dueAt: dateStr(1),    assigneeId: manager.id, creatorId: admin.id,   opportunityId: "opp-10" },
    { id: "t-14", title: "Update CRM with Eastern Petro requirements",  priority: "LOW",    dueAt: dateStr(4),    assigneeId: eng.id,     creatorId: manager.id, leadId: "l-14" },
    { id: "t-15", title: "Schedule demo for Madinah Digital",           priority: "LOW",    dueAt: dateStr(12),   assigneeId: rep3.id,    creatorId: admin.id,   leadId: "l-15" },
    // Completed tasks
    { id: "t-16", title: "Prepare Saudi Build booth materials",         priority: "HIGH",   dueAt: dateStrAgo(14), assigneeId: marketing.id, creatorId: admin.id, status: "DONE", completedAt: daysAgo(15) },
    { id: "t-17", title: "Initial call with Bahri fleet manager",       priority: "MEDIUM", dueAt: dateStrAgo(7),  assigneeId: rep.id,     creatorId: manager.id, status: "DONE", completedAt: daysAgo(6), leadId: "l-12" },
    { id: "t-18", title: "Submit SWA tender documents",                priority: "HIGH",   dueAt: dateStrAgo(3),  assigneeId: manager.id, creatorId: admin.id,   status: "DONE", completedAt: daysAgo(2), opportunityId: "opp-7" },
  ];
  for (const t of taskData) {
    const { status, completedAt, ...rest } = t as any;
    await prisma.task.upsert({
      where: { id: t.id },
      update: {},
      create: { ...rest, ...(status ? { status } : {}), ...(completedAt ? { completedAt } : {}) },
    });
  }

  // ───────────────────── CAMPAIGNS (5) ─────────────────────
  const campData = [
    { id: "cmp-1", name: "Saudi Build 2026 - Follow-up",       channel: "EMAIL",     status: "ACTIVE",  startDate: daysAgo(14),  endDate: daysFromNow(14), budgetSar: 25000, goal: "Convert 30 booth visitors to qualified leads",     ownerId: marketing.id },
    { id: "cmp-2", name: "Q3 WhatsApp Outreach",               channel: "WHATSAPP",  status: "DRAFT",   budgetSar: 8000,  goal: "Re-engage dormant accounts in Riyadh region",            ownerId: marketing.id },
    { id: "cmp-3", name: "LinkedIn Industrial Thought Leader",  channel: "LINKEDIN",  status: "ACTIVE",  startDate: daysAgo(30),  endDate: daysFromNow(60), budgetSar: 15000, goal: "Build brand awareness with 50 decision-makers", ownerId: marketing.id },
    { id: "cmp-4", name: "ACWA / SWA Renewables Webinar",      channel: "EVENT",     status: "DONE",    startDate: daysAgo(60),  endDate: daysAgo(58),     budgetSar: 12000, goal: "Generate 10 MQLs from energy sector",           ownerId: marketing.id },
    { id: "cmp-5", name: "Q4 Holiday Season Email Blast",       channel: "EMAIL",     status: "DRAFT",   budgetSar: 5000,  goal: "Year-end promo to all active contacts",                  ownerId: marketing.id },
  ];
  for (const c of campData) {
    await prisma.campaign.upsert({ where: { id: c.id }, update: {}, create: c });
  }

  // Campaign members — assign realistic contacts to campaigns
  const campMembers = [
    // Saudi Build follow-up — attendees
    { campaignId: "cmp-1", contactId: "ct-mohammed", status: "SENT" },
    { campaignId: "cmp-1", contactId: "ct-abdullah", status: "SENT" },
    { campaignId: "cmp-1", contactId: "ct-salman",   status: "OPENED" },
    { campaignId: "cmp-1", contactId: "ct-fahad",    status: "CLICKED" },
    { campaignId: "cmp-1", contactId: "ct-turki",    status: "SENT" },
    { campaignId: "cmp-1", contactId: "ct-reem",     status: "OPENED" },
    { campaignId: "cmp-1", contactId: "ct-maha",     status: "SENT" },
    { campaignId: "cmp-1", contactId: "ct-saad",     status: "SENT" },
    // LinkedIn campaign
    { campaignId: "cmp-3", contactId: "ct-khalid-a", status: "SENT" },
    { campaignId: "cmp-3", contactId: "ct-reem",     status: "CLICKED" },
    { campaignId: "cmp-3", contactId: "ct-layla",    status: "SENT" },
    { campaignId: "cmp-3", contactId: "ct-abdullah", status: "OPENED" },
    // Webinar attendees
    { campaignId: "cmp-4", contactId: "ct-reem",     status: "CLICKED" },
    { campaignId: "cmp-4", contactId: "ct-amira",    status: "CLICKED" },
    { campaignId: "cmp-4", contactId: "ct-fahad",    status: "CLICKED" },
    { campaignId: "cmp-4", contactId: "ct-amal",     status: "SENT" },
  ];
  for (const cm of campMembers) {
    await prisma.campaignMember.upsert({
      where: { campaignId_contactId: { campaignId: cm.campaignId, contactId: cm.contactId } },
      update: {},
      create: cm,
    });
  }

  // ───────────────────── SCORING RULES ─────────────────────
  const rules = [
    { id: "sr-source-tradeshow",  name: "Trade-show source",    field: "source",   operator: "EQUALS",   value: "TRADE_SHOW",   points: 25 },
    { id: "sr-source-referral",   name: "Referral source",      field: "source",   operator: "EQUALS",   value: "REFERRAL",     points: 20 },
    { id: "sr-region-eastern",    name: "Eastern Province",     field: "region",   operator: "EQUALS",   value: "Eastern",      points: 10 },
    { id: "sr-size-ent",          name: "Enterprise size",      field: "size",     operator: "EQUALS",   value: "ENT",          points: 15 },
    { id: "sr-industry-oilgas",   name: "Oil & Gas industry",   field: "industry", operator: "CONTAINS", value: "Oil",          points: 15 },
    { id: "sr-title-procurement", name: "Title: procurement",   field: "title",    operator: "CONTAINS", value: "Procurement",  points: 10 },
  ];
  for (const r of rules) {
    await prisma.scoringRule.upsert({ where: { id: r.id }, update: r, create: r });
  }

  // ───────────────────── ACTIVITIES (25) ─────────────────────
  const activityData = [
    { type: "CALL",          subject: "Discovery call with Mohammed Al-Qahtani",            body: "Discussed pump specs, delivery timeline, and VAT documentation requirements.", userId: manager.id, contactId: "ct-mohammed",  opportunityId: "opp-1" },
    { type: "WHATSAPP",      subject: "Sent CNC brochure to Noura",                        userId: rep.id,     contactId: "ct-noura",     leadId: "l-2" },
    { type: "STAGE_CHANGE",  subject: "Aramco Pumps moved to Proposal",                    userId: manager.id, opportunityId: "opp-1" },
    { type: "EMAIL",         subject: "Quote Q-2026-0002 sent to SABIC",                   body: "Attached valve overhaul quote with 8% bulk discount.",          userId: manager.id, contactId: "ct-abdullah", opportunityId: "opp-4" },
    { type: "MEETING",       subject: "Site survey at Ma'aden Phosphate Plant",             body: "Measured conveyor run lengths; 500m belt confirmed.",           userId: rep2.id,    contactId: "ct-salman",   opportunityId: "opp-5" },
    { type: "CALL",          subject: "Intro call with Haramain Rail procurement head",     userId: rep3.id,    contactId: "ct-maha",      leadId: "l-8" },
    { type: "EMAIL",         subject: "SWA tender submission confirmation",                 body: "Tender ref SW-26-1122 submitted via Etimad portal.",           userId: manager.id, contactId: "ct-fahad",    opportunityId: "opp-7" },
    { type: "WHATSAPP",      subject: "Sent ACWA Solar product catalog",                    userId: manager.id, contactId: "ct-reem",      leadId: "l-10" },
    { type: "STAGE_CHANGE",  subject: "SABIC Valves moved to Negotiation",                  userId: manager.id, opportunityId: "opp-4" },
    { type: "CALL",          subject: "Follow-up with Bahri fleet manager Layla",           body: "Engine overhaul timeline discussed; 8-week delivery agreed.",   userId: rep.id,     contactId: "ct-layla",    opportunityId: "opp-9" },
    { type: "NOTE",          subject: "ACWA requested explosion-proof pump option",         body: "Reem asked to add ATEX-certified pump variant to the quote.",   userId: manager.id, contactId: "ct-amira",    opportunityId: "opp-8" },
    { type: "EMAIL",         subject: "Tabuk Pharma cleanroom specs received",              body: "ISO Class 5 cleanroom; need HEPA filter integration.",          userId: rep2.id,    contactId: "ct-turki",    leadId: "l-9" },
    { type: "MEETING",       subject: "Yanbu Cement site inspection",                       body: "Crusher liner wear assessment; replacement in 6 weeks.",        userId: rep3.id,    contactId: "ct-saud" },
    { type: "CALL",          subject: "Eastern Petro — heat exchanger discussion",          body: "Titanium tube bundle preferred; waiting for metallurgy report.", userId: eng.id,     contactId: "ct-saad",     leadId: "l-14" },
    { type: "WHATSAPP",      subject: "Madinah Digital cooling inquiry details",            userId: rep3.id,    contactId: "ct-nada",      leadId: "l-15" },
    { type: "STAGE_CHANGE",  subject: "Aramco Supply Chain moved to Negotiation",           userId: manager.id, opportunityId: "opp-10" },
    { type: "EMAIL",         subject: "Abha Medical sterilizer pricing request",            userId: rep2.id,    contactId: "ct-omar",      leadId: "l-13" },
    { type: "MEETING",       subject: "Al-Rajhi construction site visit — Riyadh",          body: "Crane positioning survey; 3 units needed for 6 months.",       userId: rep.id,     contactId: "ct-hanan",    opportunityId: "opp-6" },
    { type: "CALL",          subject: "Aramco VP Supply Chain — project kickoff",           body: "Khalid confirmed budget allocation for Q3 automation rollout.", userId: manager.id, contactId: "ct-khalid-a", opportunityId: "opp-10" },
    { type: "NOTE",          subject: "Competitor intel — Eastern region pricing",           body: "XYZ Industries quoting 12% below market on gate valves.",      userId: rep.id },
    { type: "STAGE_CHANGE",  subject: "SWA Desalination moved to Approval",                userId: manager.id, opportunityId: "opp-7" },
    { type: "EMAIL",         subject: "Quote Q-2026-0004 sent to Bahri",                   userId: rep.id,     contactId: "ct-layla",     opportunityId: "opp-9" },
    { type: "WHATSAPP",      subject: "Quick update to Ma'aden site manager",               body: "Confirmed drill bit sample shipment tracking number.",         userId: rep2.id,    contactId: "ct-mishal",   leadId: "l-19" },
    { type: "CALL",          subject: "ACWA project manager — installation planning",       body: "Amira wants phased installation: panels in Aug, inverters Sep.", userId: manager.id, contactId: "ct-amira",   opportunityId: "opp-8" },
    { type: "STATUS_CHANGE", subject: "Lead 'Al-Rajhi Smart Building Sensors' contacted",   userId: rep.id,     leadId: "l-20" },
  ];
  for (const a of activityData) {
    // Only create if no activity with same subject exists (idempotent)
    const exists = await prisma.activity.findFirst({ where: { subject: a.subject } });
    if (!exists) await prisma.activity.create({ data: a });
  }

  // ───────────────────── OPPORTUNITY COMMENTS (8) ─────────────────────
  const commentData = [
    { body: "Pump specs confirmed with engineering. Ready for formal quote.",       userId: manager.id, opportunityId: "opp-1" },
    { body: "Client mentioned a competing bid from Flowserve; we need to sharpen pricing.",  userId: rep.id,  opportunityId: "opp-1" },
    { body: "Finance approved the 8% discount for bulk valve order.",               userId: finance.id, opportunityId: "opp-4" },
    { body: "SABIC wants delivery in 3 batches — Jun/Jul/Aug.",                    userId: manager.id, opportunityId: "opp-4" },
    { body: "SWA tender evaluation committee is meeting next Tuesday.",             userId: manager.id, opportunityId: "opp-7" },
    { body: "Bahri requested a live demo of the CNC lathe at our Dammam facility.",userId: rep.id,     opportunityId: "opp-9" },
    { body: "ACWA project timeline shifted by 2 weeks due to permit delays.",       userId: manager.id, opportunityId: "opp-8" },
    { body: "Aramco automation RFI response well-received. Short-listed for Phase 2.", userId: manager.id, opportunityId: "opp-10" },
  ];
  for (const c of commentData) {
    const exists = await prisma.opportunityComment.findFirst({ where: { body: c.body, opportunityId: c.opportunityId } });
    if (!exists) await prisma.opportunityComment.create({ data: c });
  }

  // ───────────────────── NOTIFICATIONS (sample) ─────────────────────
  const notifData = [
    { userId: manager.id, type: "LEAD_NEW",                  title: "New lead: Al-Rajhi Smart Building Sensors",       href: "/leads",            entity: "Lead",        entityId: "l-20" },
    { userId: manager.id, type: "QUOTE_APPROVAL_REQUESTED",  title: "Quote Q-2026-0002 awaiting your approval",        href: "/quotes",           entity: "Quote" },
    { userId: rep.id,     type: "TASK_ASSIGNED",             title: "New task: Follow up overdue quote Q-2026-0001",    href: "/tasks",            entity: "Task",        entityId: "t-3" },
    { userId: rep2.id,    type: "LEAD_CONVERTED",            title: "Lead 'SABIC Lab Equipment' converted to deal",    href: "/pipeline",         entity: "Opportunity", entityId: "opp-11" },
    { userId: rep3.id,    type: "TASK_ASSIGNED",             title: "New task: Book flight to Yanbu for site visit",    href: "/tasks",            entity: "Task",        entityId: "t-9" },
    { userId: admin.id,   type: "QUOTE_APPROVED",            title: "Quote Q-2026-0003 approved by Khalid",            href: "/quotes",           entity: "Quote" },
  ];
  for (const n of notifData) {
    const exists = await prisma.notification.findFirst({ where: { title: n.title, userId: n.userId } });
    if (!exists) await prisma.notification.create({ data: n });
  }

  console.log(`
Seed complete! Summary:
  Teams:         5 (Sales, Marketing, Finance, Engineering, Support)
  Users:         8 (admin, manager, 3 reps, marketing, finance, engineer)
  Companies:    15
  Contacts:     25
  Leads:        20 (across 6 source types, multiple statuses)
  Opportunities: 30 (12 active pipeline + 12 won + 6 lost)
  Tasks:        18 (15 open, 3 completed)
  Products:     10
  Quotes:        5 (DRAFT, PENDING_APPROVAL, APPROVED, SENT, DRAFT)
  Campaigns:     5 (EMAIL, WHATSAPP, LINKEDIN, EVENT, EMAIL)
  Activities:   25
  Comments:      8
  Notifications: 6
  Scoring rules: 6

Login: admin@prismai.app / Prism@123
       (also: manager, sales, sales2, sales3, marketing, finance, engineer @prismai.app)
  `);
}

main().finally(async () => prisma.$disconnect());
