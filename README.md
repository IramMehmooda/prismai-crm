# prismAI — SMI Sales & Marketing CRM (Phase 1)

A HubSpot-like CRM tailored for **Saudi Mechanical Industry (SMI)**. Phase 1 ships:
- Auth (login/logout, JWT cookie session, RBAC roles)
- Dashboard (pipeline value, open/qualified leads, activities, recent feed)
- Contacts, Companies, Leads (list + create) — bilingual fields (EN/AR)
- Activities (call, email, WhatsApp, meeting, note) with audit logging
- Bilingual UI (English/العربية) with RTL support
- SAR currency formatting

## Stack
- Next.js 14 (App Router) + TypeScript + TailwindCSS
- Prisma ORM + SQLite (zero-config local dev; swap to PostgreSQL for prod via `DATABASE_URL`)
- jose (JWT) + bcryptjs for auth
- Zod for input validation

## Setup
```bash
cd Project/prismai
npm install
npm run setup     # runs prisma migrate + seed
npm run dev
```
Open http://localhost:3000

### Demo accounts (password: `Prism@123`)
| Email | Role |
|---|---|
| admin@smi.sa | ADMIN |
| manager@smi.sa | SALES_MANAGER |
| rep@smi.sa | SALES_REP (Arabic locale) |
| marketing@smi.sa | MARKETING |

## Project structure
```
prisma/
  schema.prisma     # User, Company, Contact, Lead, Activity, AuditLog
  seed.ts           # Demo users + SMI sample data
src/
  middleware.ts     # Protects all routes except /login
  lib/
    db.ts           # Prisma client
    auth.ts         # JWT session (cookie)
    i18n.ts         # EN/AR dictionary + SAR formatter
  app/
    login/          # Bilingual login page
    (app)/          # Authenticated shell (sidebar + topbar + locale toggle)
      dashboard/
      leads/  leads/new/
      contacts/  contacts/new/
      companies/  companies/new/
      activities/
    api/
      auth/login   auth/logout   auth/locale
      leads   contacts   companies   activities
```

## Phase 1 acceptance criteria (✅ delivered)
1. User can sign in and is redirected to dashboard.
2. Dashboard shows: open pipeline value (SAR), open leads, qualified leads, 7-day activities, recent leads, recent activities.
3. User can create Company, Contact, Lead, and Activity from the UI.
4. All create actions are recorded in `AuditLog` with `userId`, `action`, `entity`, `entityId`.
5. UI toggles between English (LTR) and Arabic (RTL).
6. Unauthenticated requests to any non-public route are redirected to `/login`.

## Next phases (per /CRM/plan.md)
- Phase 2: Pipeline kanban (Slice B), Tasks/follow-ups, dashboard tiles for stage distribution
- Phase 3: Quote generation with VAT/SAR, versioning, approval workflow, PDF + email
- Phase 4+: Marketing campaigns, automation, ZATCA e-invoicing, ERP/WhatsApp integrations
