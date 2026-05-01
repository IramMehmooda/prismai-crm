# prismAI — Project Handoff & Continuation Guide

> Use this document to resume work on **prismAI** (HubSpot-like CRM for Industrial Manufacturers — generic, no longer SMI-specific) if this chat session is lost.

Last updated: 2026-05-01 (quote edit/delete overhaul, campaign form fix, approval threshold change)

## Current continuation note

- Pipeline email UX was simplified again on 2026-04-29.
- Removed the embedded opportunity email composer card and removed the route-backed in-app send flow.
- New behavior: a single header action button opens a Gmail compose draft popup/window instead.
  - component: `src/app/(app)/pipeline/OpenGmailDraftButton.tsx`
  - wired from: `src/app/(app)/pipeline/[id]/page.tsx`
  - pre-fills `To` with the opportunity primary contact email when present
  - pre-fills `Cc` with the other company contact emails tied to the deal
  - pre-fills subject/body from the opportunity context
- Sent-email timeline logging for the popup flow is now handled via Gmail sync instead of an in-app send API.
  - `src/app/api/gmail/sync/route.ts` now imports both recent inbox and recent sent mail, not just inbox
  - popup button calls a targeted `/api/gmail/sync` after the Gmail draft window is closed, passing `opportunityId` and related recipient emails
  - when the sync imports a matching sent email, it creates an `EMAIL` activity on the current opportunity timeline and then refreshes the page
  - verified on 2026-04-29 by manually invoking the sync from the active pipeline session: response was `ok: true`, `imported: 1`, `matched: 2`
  - timeline entries were further tightened on 2026-04-29 so they no longer include Gmail snippets/message body text
  - synced email activities now display only the subject plus primary recipient metadata in the visible timeline
  - Gmail message idempotency moved to `AuditLog` records with action `GMAIL_SYNC_IMPORT`, so `[gmail:...]` markers are no longer shown in the activity body
  - inbound email notifications were added on 2026-04-29 for the top-bar bell
  - `src/app/api/gmail/sync/route.ts` now creates `EMAIL_RECEIVED` notifications for inbound emails that map to the current user's owned opportunity, quote, or active lead; internal teammate senders fall back to a general activity notification
  - Gmail polling was replaced with app-side Gmail Push support on 2026-04-29
  - new server pieces:
    - `src/app/api/gmail/watch/route.ts` registers or renews Gmail watch subscriptions against the configured Pub/Sub topic
    - `src/app/api/gmail/push/route.ts` accepts Pub/Sub push callbacks and runs the shared sync service without creating summary sync noise
    - `src/lib/gmail-sync.ts` now centralizes Gmail import, CRM activity creation, and per-email bell notification creation
  - `src/components/NotificationsBell.tsx` no longer polls Gmail directly; it refreshes local notification rows and opens Gmail thread links in a new tab when an email notification is clicked
  - `src/app/(app)/settings/GmailPanel.tsx` now exposes instant-alert activation, watch expiration status, and per-user preferences for customer emails, team emails, and only-my-pipeline matching
  - new `User` fields added for Gmail push state and preferences: `gmailWatchExpiration`, `gmailPushEnabled`, `gmailNotifyCustomerEmails`, `gmailNotifyTeamEmails`, `gmailNotifyOnlyMyPipeline`
- Deleted files from the previous MVP approach:
  - `src/app/(app)/pipeline/OpportunityEmailPanel.tsx`
  - `src/app/api/opportunities/[id]/email/route.ts`
- `src/lib/gmail.ts` still contains the richer MIME/raw-send helper work from the earlier MVP iteration, but it is currently unused by the UI after this simplification.

- Global Activities page (`/activities`) was narrowed on 2026-04-29 to avoid duplicating pipeline-card timelines.
  - `src/app/(app)/activities/page.tsx` now excludes activities with `opportunityId != null`
  - it also excludes `type = EMAIL`, so sent/received Gmail sync items no longer appear in the global Activities page
  - result: opportunity/deal activity stays on the pipeline card timeline, while the left-nav Activities page remains an in-app CRM action feed rather than a mirrored communications log
  - updated again on 2026-04-29: opportunity `STAGE_CHANGE` / `STATUS_CHANGE` rows are intentionally included in `/activities` so pipeline progress tracker movement still shows up in the global feed
  - admins also see important CRUD audit events merged into `/activities` from `AuditLog` for `Lead`, `Contact`, and `Company` create/update/delete actions
  - manual `Log activity` form on `/activities` now includes an `Opportunity` dropdown and passes `opportunityId` into `/api/activities`, so user-entered activities can be attached directly to a pipeline card

- Opportunity detail page `/pipeline/[id]` now has a dedicated **Progress comments** section backed by `OpportunityComment` records.
- Comment API routes:
  - `POST /api/opportunities/[id]/comments`
  - `PATCH /api/opportunities/[id]/comments/[commentId]`
  - `DELETE /api/opportunities/[id]/comments/[commentId]`
- Every comment create, edit, and delete writes a matching activity entry into the opportunity timeline (`Comment added`, `Comment edited`, `Comment deleted`) and an `AuditLog` row.
- Authors can edit/delete their own comments; `ADMIN` and `SALES_MANAGER` can also manage comments.
- Prisma migration applied: `20260429051246_opportunity_comments`.
- Verified on 2026-04-29 in the live browser: comment add, edit, and delete all worked and appeared in the activity timeline.

- Opportunity file upload on `/pipeline/[id]` is working end-to-end again.
- Server-side fix: `src/app/api/opportunities/[id]/files/route.ts` no longer uses `instanceof File`; it uses a runtime-safe upload shape guard because Node route handlers in this environment do not expose global `File`.
- Client-side fix: `src/app/(app)/pipeline/OpportunityFilesPanel.tsx` now captures the form element before the async upload request and resets that saved form reference after success. This avoids the browser crash `TypeError: Cannot read properties of null (reading 'reset')` caused by using `e.currentTarget` after `await`.
- Verified on 2026-04-29 by uploading a PDF from the live opportunity detail page. The uploaded file appeared in both the Files panel and the activity timeline.

- Tasks page `/tasks` was upgraded on 2026-04-29 toward a rep-first "engine room" workflow.
  - `src/app/(app)/tasks/page.tsx` now adds a rep-facing filter bar (`My Tasks`, `Assigned by Me`, `Completed`) and reframes the top sections around `Focus Mode`, overdue recovery, upcoming work, and empty-state messaging
  - task query now includes `creator` and richer `opportunity` context so the list can support direct execution without extra navigation
  - `src/app/(app)/tasks/TaskList.tsx` now provides row-level quick actions:
    - complete/reopen checkbox with lightweight celebration feedback
    - open linked opportunity directly
    - email the linked opportunity contact when available
    - push a task to tomorrow in one click
  - task priority pills were updated to a clearer traffic-light treatment: rose for high, amber for medium, sky for low
  - `src/app/(app)/tasks/NewTaskForm.tsx` copy was updated to reinforce linking a task to an opportunity for better context

- Task creation now also supports linking a task to a lead.
  - `Task` now has an optional `leadId` relation in Prisma alongside `opportunityId`
  - `src/app/(app)/tasks/page.tsx` fetches scoped leads for the task form
  - `src/app/(app)/tasks/NewTaskForm.tsx` now renders a `Lead (optional)` dropdown and submits `leadId`
  - `src/app/(app)/tasks/TaskList.tsx` shows the linked lead when present and exposes a direct lead link when no opportunity is attached

- Task rows now support direct edit and delete actions.
  - `src/app/api/tasks/route.ts` now supports richer `PATCH` updates (`title`, `description`, `priority`, `dueAt`) and a `DELETE` handler
  - `src/app/(app)/tasks/TaskList.tsx` now adds edit and delete buttons per row
  - editing opens an inline task editor for quick updates without leaving `/tasks`

- Task due dates are now being moved toward a true date-only model.
  - goal: preserve the exact selected calendar date instead of treating `dueAt` as a timezone-sensitive timestamp
  - `Task.dueAt` is being changed from `DateTime?` to `String?` in `YYYY-MM-DD` format
  - tasks UI and API now normalize due dates as date-only values rather than `Date` objects

---

## 1. What has been built so far (Phase 1 — DONE)

### Stack chosen
- **Next.js 13.5.6** (App Router) + **TypeScript** + **TailwindCSS**
- **Prisma ORM** + **SQLite** (`prisma/dev.db`) — swap to PostgreSQL by changing `DATABASE_URL`
- **jose** (JWT in HttpOnly cookie) + **bcryptjs** for auth
- **zod** for input validation
- Pinned `next@13.5.6` because installed Node is `v18.15.0`. Upgrade to `next@14` once Node ≥ 18.17 is installed.

### Capabilities delivered
1. **Auth**
   - Login page with EN/AR toggle (`src/app/login/page.tsx`)
   - JWT cookie session via `jose` (`src/lib/auth.ts`)
   - Middleware protecting all non-public routes (`src/middleware.ts`)
   - Logout + locale switch endpoints (`src/app/api/auth/*`)
   - 4 seeded users (ADMIN, SALES_MANAGER, SALES_REP, MARKETING), password `Prism@1234`
2. **App shell**
   - Sidebar + topbar layout for the `(app)` route group (`src/app/(app)/layout.tsx`)
   - Locale toggle (English ↔ العربية), RTL via `dir="rtl"`
3. **Dashboard** (`src/app/(app)/dashboard/page.tsx`) — *Workset-style admin layout (Notebook template inspired)*
   - 4 KPI cards (icon-left round colored circle + big number): Open Leads (sky), Qualified (green), Activities 7d (orange), Contacts (violet)
   - **Statistics** card: 12-month activity line chart (`<LineChart>` SVG, area fill + grid + dots)
   - **Data graph** card: pipeline value SAR + delta + 14-day vertical bar series + 3-cell sub-stats (New / Contacted / Qualified %)
   - 4-cell divider stat strip (Total Leads / Contacts / Converted / This Week)
   - **Todos** card: recent leads as todos with checkbox, status pill, value
   - **Calendar** card: mini month grid with green-circled today + activity day highlights, plus upcoming activity feed
4. **Contacts** — list + create (Arabic name field) — `src/app/(app)/contacts/...`
5. **Companies** — list + create (industry, region, VAT #) — `src/app/(app)/companies/...`
6. **Leads** — list + create (source, status, score, est. value SAR, notes) — `src/app/(app)/leads/...`
7. **Activities** — list + quick-log form (NOTE/CALL/EMAIL/WHATSAPP/MEETING) — `src/app/(app)/activities/...`
8. **APIs** under `src/app/api/`:
   - `auth/login`, `auth/logout`, `auth/locale`
   - `leads`, `contacts`, `companies`, `activities`
9. **Bilingual EN/AR** dictionary + SAR currency formatter — `src/lib/i18n.ts`
10. **Audit logging** — every create writes to `AuditLog` (userId/action/entity/entityId)
11. **Seed data** — 3 companies, 3 contacts, 3 leads, 2 activities (`prisma/seed.ts`)

### Verified
- `npm install`, `npx prisma migrate dev`, `npx tsx prisma/seed.ts` all succeed
- `next dev` boots on port 3000
- Smoke tests (curl): `/login` 200, `POST /api/auth/login` 200, `/dashboard|/leads|/contacts|/companies|/activities` all 200, `POST /api/leads` 201
- Compiled CSS bundle is ~46 KB (Tailwind preflight + components present) — quick sanity check below in §7

### Demo accounts (password `Prism@123`)
| Email | Role |
|---|---|
| admin@smi.sa | ADMIN |
| manager@smi.sa | SALES_MANAGER |
| rep@smi.sa | SALES_REP (Arabic locale) |
| marketing@smi.sa | MARKETING |

---

## 2. File map (current state)

```
Project/prismai/
├── README.md
├── package.json
├── tsconfig.json
├── next.config.mjs
├── tailwind.config.ts         # Notebook palette: nav slate, topbar navy, leaf green, accent sky/orange/red/violet/teal, ink neutrals
├── postcss.config.js          # MUST be .js — Next 13 silently ignores .mjs (see §7)
├── .env                       # DATABASE_URL + AUTH_SECRET
├── .gitignore
├── prisma/
│   ├── schema.prisma          # User, Company, Contact, Lead, Activity, AuditLog
│   ├── seed.ts                # Seeds 4 users + sample SMI data
│   ├── dev.db                 # SQLite (created by migrate)
│   └── migrations/
└── src/
    ├── middleware.ts          # Protects all routes except /login + /api/auth/login
    ├── lib/
    │   ├── db.ts              # Prisma client singleton
    │   ├── auth.ts            # JWT session helpers (createSession/getSession/destroy)
    │   └── i18n.ts            # EN/AR dictionary + formatSAR()
    ├── components/
    │   ├── Icon.tsx           # Inline SVG icon set (~28 icons; no external lib)
    │   ├── SidebarNav.tsx     # Client comp: active route highlight, green left-border row
    │   ├── Breadcrumbs.tsx    # Client comp: auto breadcrumbs from pathname
    │   └── Charts.tsx         # Pure-SVG: Sparkline, LineChart, BarsVertical, BarChart, Donut, MiniCalendar
    └── app/
        ├── globals.css        # Component classes: .card / .kpi / .nav-link / .btn-primary / .input / .table-modern / .crumb …
        ├── layout.tsx         # Root: Inter font (--font-inter), sets <html lang dir> from session locale
        ├── page.tsx           # Redirects to /login or /dashboard
        ├── login/page.tsx     # Split-screen: aurora hero + glassy form
        ├── (app)/
        │   ├── layout.tsx     # Dark slate sidebar + dark topbar + white breadcrumb bar
        │   ├── dashboard/page.tsx
        │   ├── leads/
        │   │   ├── page.tsx
        │   │   └── new/{page.tsx,LeadForm.tsx}
        │   ├── contacts/
        │   │   ├── page.tsx
        │   │   └── new/{page.tsx,ContactForm.tsx}
        │   ├── companies/
        │   │   ├── page.tsx
        │   │   └── new/{page.tsx,CompanyForm.tsx}
        │   └── activities/
        │       ├── page.tsx
        │       └── ActivityForm.tsx
        └── api/
            ├── auth/{login,logout,locale}/route.ts
            ├── leads/route.ts
            ├── contacts/route.ts
            ├── companies/route.ts
            └── activities/route.ts
```

---

## 3. How to run locally

```bash
cd Project/prismai
npm install
npx prisma migrate dev --name init   # only first time (or after schema change)
npx tsx prisma/seed.ts               # seed demo data
npm run dev                          # http://localhost:3000
```

Login with `admin@smi.sa` / `Prism@123`.

### Reset the database
```bash
rm prisma/dev.db prisma/dev.db-journal
npx prisma migrate dev --name init
npx tsx prisma/seed.ts
```

---

## 4. Key architectural decisions (so a new agent does not relitigate)

1. **Single repo, single deployable** for MVP. Mobile app deferred to Phase 4+.
2. **Single-tenant SMI deployment**, but schema includes `ownerId` and audit fields for future multi-tenant.
3. **Server components by default**; client components only for forms.
4. **JWT cookie auth**, not NextAuth — fewer dependencies, easier to evolve to SSO later.
5. **SQLite for dev**, PostgreSQL for production (no code changes needed; only `DATABASE_URL`).
6. **Bilingual via simple dictionary** in `src/lib/i18n.ts` — switch to `next-intl` only when 3+ locales are needed.
7. **Audit log table** instead of triggers — portable across DBs.
8. **Validation with `zod`** at every API boundary.

---

## 5. Backlog — what to build next (in order)

Use the master plan: see [`/Users/irammehmooda/CRM/plan.md`](../../plan.md) for full sprint breakdown.

### Phase 2 (Slice B — Pipeline & Tasks)  ← START HERE
- [ ] **Pipeline stages model**: `PipelineStage { id, name, order, probability, isWon, isLost }`. Seed default SMI stages: New → Qualified → Proposal → Negotiation → Approval → Won/Lost.
- [ ] **Promote `Lead` to `Opportunity`** (or add `Opportunity` model linked to a `stageId`). Recommendation: add `Opportunity` and keep `Lead` as the pre-qualification record; on conversion, create an Opportunity.
- [ ] **Kanban board** at `/pipeline` — drag-drop opportunity between stages, write `STATUS_CHANGE` activity + audit log.
- [ ] **Tasks/follow-ups**: `Task { id, title, dueAt, ownerId, relatedTo (opportunityId/contactId), status }` + page `/tasks` + dashboard tile "Overdue tasks".
- [ ] **Dashboard upgrade**: add tiles for deals-by-stage and average days-in-stage.
- [ ] **Lead → Opportunity conversion** flow with audit entry.

### Phase 3 (Slice C — Quotes + VAT + Approvals)
- [ ] Models: `Product { sku, name, nameAr, unitPriceSar, taxRate }`, `Quote { number, version, status, totalSar, vatSar, validUntil }`, `QuoteItem`.
- [ ] Quote builder UI (line items, discount %, auto VAT 15%, SAR formatting).
- [ ] Approval workflow: thresholds (e.g., > 500,000 SAR or > 10 % discount) require SALES_MANAGER approval; > 1,000,000 SAR requires FINANCE.
- [ ] PDF generation (recommend `@react-pdf/renderer` or Puppeteer microservice).
- [ ] Email dispatch job (start with Nodemailer + SMTP env vars; queue later).
- [ ] Quote versioning (immutable previous versions, audit on each new version).

### Phase 4+ (Marketing & Integrations)
- [ ] Marketing campaigns + lead-source attribution
- [ ] Lead scoring rules engine
- [ ] WhatsApp Business API integration (templates first, then 2-way)
- [ ] ZATCA e-invoicing fields + submission API
- [ ] ERP/accounting sync (likely SAP B1 or Odoo)
- [ ] Mobile app (React Native, read-only first, then activity logging offline queue)

---

## 6. How to continue if this chat is lost

1. **Open the project**: `cd /Users/irammehmooda/CRM/Project/prismai`
2. **Read these files in order** to rebuild context:
   - This file (`docs/HANDOFF.md`)
   - `/Users/irammehmooda/CRM/plan.md` (master roadmap, decisions, KPIs)
   - `prisma/schema.prisma` (data model)
   - `src/lib/auth.ts` + `src/middleware.ts` (auth model)
   - `src/app/(app)/layout.tsx` (UI shell pattern to copy for new pages)
3. **Start a new chat** and paste this prompt to bootstrap a new agent:

> I'm continuing work on **prismAI**, a HubSpot-like CRM for Saudi Mechanical Industry, located at `/Users/irammehmooda/CRM/Project/prismai`. Read `docs/HANDOFF.md` and `/Users/irammehmooda/CRM/plan.md` first. Phase 1 is complete (auth, dashboard, Contacts/Companies/Leads/Activities, bilingual EN/AR, audit logs). Continue with Phase 2 — Pipeline (stages, kanban, opportunity model) and Tasks. Follow the architectural decisions already in place (Next.js 13.5 App Router, Prisma+SQLite, JWT cookie auth via jose, server components by default, zod at API boundaries, audit log on every create). Do not introduce new frameworks without justification.

4. **Conventions a new agent must follow**:
   - Add a `zod` schema for every new API route.
   - Write an `AuditLog` row for every create/update/delete on business entities.
   - Add EN + AR strings to `src/lib/i18n.ts` for any new label.
   - Server components for read pages; `"use client"` only for interactive forms.
   - Use `getSession()` (or `requireUser()`) in every protected route handler.
   - Co-locate forms next to their `new/` pages (see `leads/new/LeadForm.tsx`).
   - Keep the sidebar nav in sync — edit `src/app/(app)/layout.tsx` when adding a top-level page.

---

## 7. Known issues / tech debt & gotchas

### Gotchas hit during Phase 1 (do NOT relitigate)

1. **`postcss.config.mjs` is silently ignored by Next 13's webpack PostCSS pipeline.** Symptom: page renders completely unstyled, browser receives raw `@tailwind base;` directives, `/_next/static/css/app/layout.css` is only ~8 KB. **Fix**: use `postcss.config.js` (CommonJS). Healthy bundle is ~46 KB and contains `--tw-` vars + preflight.
2. **`@apply group` is invalid in Tailwind 3.** `group` is a marker class, not a utility — put it directly in JSX `className="group …"`, never inside `@apply`.
3. Always **delete `.next/`** after editing `tailwind.config.ts` or `postcss.config.js` before restarting dev: `rm -rf .next && npm run dev`.
4. When fully rewriting a file, the `create_file` tool fails if the file exists — `rm` first, then create. Or use `replace_string_in_file` with full-file context.

### Tech debt

1. Node 18.15 is too old for Next 14 — pinned Next 13.5. **Action**: upgrade Node to ≥ 18.17 (`brew install node@20`), then bump `next` to `^14.2.x`, `react`/`react-dom` to `^18.3.x`, and reinstall.
2. `next@13.5.6` has a known security advisory — fine for local dev, must upgrade before any deployment.
3. `AUTH_SECRET` in `.env` is a dev placeholder. Replace before deploying.
4. SQLite is fine for dev/pilot but switch to PostgreSQL before scaling beyond a single user.
5. No tests yet — add Vitest + Playwright when starting Phase 2 (recommended setup: unit tests for `lib/`, integration tests for `api/`, E2E for the lead → opportunity → quote flow).
6. No CI yet — add a GitHub Actions workflow (`lint`, `typecheck`, `prisma migrate deploy`, `next build`) before the first PR.
7. Forms (`leads/new/LeadForm.tsx`, `contacts/new/ContactForm.tsx`, `companies/new/CompanyForm.tsx`, `activities/ActivityForm.tsx`) still use the older plain-input styling — they work but should be polished to use the new `.input` / `.label` / `.btn-primary` classes for full visual consistency.

---

## 8. Quick command reference

```bash
# Dev
npm run dev

# DB
npx prisma migrate dev --name <change_name>
npx prisma studio                 # GUI to inspect data
npx tsx prisma/seed.ts

# Build
npm run build && npm start

# Smoke test (with server running)
curl -c /tmp/c -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@smi.sa","password":"Prism@123","locale":"en"}'
curl -b /tmp/c http://localhost:3000/dashboard -o /dev/null -w "%{http_code}\n"

# CSS sanity check (must be ~46 KB and contain Tailwind preflight)
curl -s http://localhost:3000/_next/static/css/app/layout.css | wc -c
curl -s http://localhost:3000/_next/static/css/app/layout.css | grep -c "\-\-tw-"
```

---

## 9. Design system reference (post UI overhaul)

**Palette (Notebook admin template inspired)** — defined in [`tailwind.config.ts`](../tailwind.config.ts)

| Token | Hex | Use |
|---|---|---|
| `nav-800` | `#26333f` | Sidebar background |
| `nav-700` | `#2f3d4a` | Sidebar hover |
| `nav-ink` | `#9aa6b2` | Sidebar muted text |
| `topbar`  | `#34495e` | Top header bar |
| `leaf-500`| `#27ae60` | Brand green / active row / primary buttons |
| `leaf-600`| `#1f9b54` | Hover green |
| `accent-sky`     | `#3498db` | KPI: Open leads |
| `accent-orange`  | `#f39c12` | KPI: Activities |
| `accent-red`     | `#e74c3c` | Notification dot, errors |
| `accent-violet`  | `#9b59b6` | KPI: Contacts |
| `accent-teal`    | `#1abc9c` | WhatsApp / secondary green |
| `ink-50…900`     | neutrals  | Body text + borders |

**Component classes** (in `globals.css`):
- Layout: `card`, `card-header`, `card-body`, `kpi`, `kpi-icon`, `kpi-number`, `kpi-label`
- Nav: `nav-link`, `nav-link-active`, `nav-section`, `crumb`
- Forms: `input`, `label`, `btn`, `btn-primary`, `btn-outline`, `btn-ghost`, `btn-dark`
- Data: `table-modern`, `pill`, `badge`, `avatar`, `skeleton`

**Reusable components** (in `src/components/`):
- `<Icon name="…" size={18} />` — inline SVG, ~28 names; full union exported as `IconName`
- `<SidebarNav items={…} />` — left-border green-active rows
- `<Breadcrumbs />` — auto-built from `usePathname()`
- Charts: `<Sparkline>`, `<LineChart>`, `<BarsVertical>`, `<BarChart>`, `<Donut>`, `<MiniCalendar>`

**Layout pattern (every app page)**
```tsx
export default async function MyPage() {
  const session = (await getSession())!;
  const locale = (session.locale as Locale) ?? "en";
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink-900">{t(locale, "…")}</h1>
      <div className="card">
        <div className="card-header"><span>Title</span></div>
        <div className="card-body">…</div>
      </div>
    </div>
  );
}
```

---

## 2. Phases 2–4 — DONE

**Last updated: 2026-04-28 (post Phase 2/3/4)**

### Phase 2 — Pipeline & Tasks
- **Schema**: `PipelineStage` (order, probability, color, isWon, isLost), `Opportunity` (amount, stage, probability, expectedCloseAt, closedAt, fromLeadId), `Task` (dueAt, priority, assignee, opportunity link, completedAt). `Activity.type` extended with `STAGE_CHANGE`.
- **APIs**:
  - `POST/GET/PATCH /api/opportunities` — PATCH on stageId writes a `STAGE_CHANGE` activity; sets `closedAt` when stage `isWon`/`isLost`.
  - `POST/GET/PATCH /api/tasks` — sets `completedAt` when status flips to DONE.
  - `POST /api/leads/[id]/convert` — promotes a lead to an opportunity in the Qualified stage, marks lead `CONVERTED` with `convertedAt` + `opportunityId`, audit-logged.
- **Pages**:
  - `/pipeline` — HTML5 drag/drop kanban (`KanbanBoard.tsx`), columns colored by stage with count + SAR sum per column.
  - `/tasks` — buckets Overdue / Today / Upcoming / No-date / Completed; checkbox toggles status; sticky create form.
  - **Convert button** on `/leads` rows.

### Phase 3 — Quotes, Products, VAT & Approvals (KSA-ready)
- **Schema**: `Product` (sku, nameAr, unitPriceSar, taxRate=0.15, category), `Quote` (number, version, status, denormalised `subtotalSar/discountSar/vatSar/totalSar`, `buyerVat`/`buyerNameAr` for ZATCA, validUntil, notes), `QuoteItem` (line items with discountPct & order), `QuoteApproval` (level + decidedBy + reason).
- **Helpers**: `src/lib/quotes.ts` → `calcTotals(items)`, `requiredApprovalLevel(total, discountPct)`, `nextQuoteNumber()`.
- **Approval thresholds**:
  - `> 1,000,000 SAR` → **FINANCE** required
  - `> 500,000 SAR` or `discount > 10%` → **MANAGER** required
  - else → auto-approved
- **Status machine**: `DRAFT → PENDING_APPROVAL → APPROVED|REJECTED → SENT → ACCEPTED|DECLINED|EXPIRED`.
- **APIs**:
  - `POST/GET /api/quotes` — recomputes totals server-side, allocates next quote number `Q-YYYY-NNNN`.
  - `POST /api/quotes/[id]/transition` — actions `SUBMIT|APPROVE|REJECT|SEND|ACCEPT|DECLINE`. Role-gated: MANAGER level → SALES_MANAGER+ADMIN, FINANCE level → FINANCE+ADMIN.
  - `POST/GET /api/products`.
- **Pages**:
  - `/products` list + `/products/new` form.
  - `/quotes` list with status pills.
  - `/quotes/new` — interactive `QuoteBuilder.tsx` with product picker per row, live totals, threshold warning banners (>500K MANAGER / >1M FINANCE).
  - `/quotes/[id]` — detail view with items table, totals card, approval history, role-gated action buttons.
  - `/quotes/[id]/print` — standalone branded print page (own `(print)` route group, no chrome) with ZATCA buyer VAT block, 15% VAT line, RTL-aware, native browser print button.

### Phase 4 — Marketing, Scoring, Campaigns
- **Schema**: `Campaign` (channel EMAIL/WHATSAPP/EVENT/ADS/LINKEDIN, status DRAFT/ACTIVE/PAUSED/COMPLETED, budget SAR), `CampaignMember` (campaign↔contact join), `ScoringRule` (field/operator/value/weight/active), `Message` (channel + direction + status placeholder for WhatsApp). `Lead` extended with `scoreAuto` and `campaignId`.
- **Helpers**: `src/lib/scoring.ts` → `computeLeadScore(leadId)` and `recomputeAllLeadScores()`. Operators: `EQUALS`, `CONTAINS`, `IN`. Reads `lead.source/title/industry/region/size/hasWhatsapp`.
- **APIs**:
  - `POST/GET /api/campaigns`.
  - `POST /api/scoring/run` → recomputes all lead scores, returns `{ updated }`.
- **Pages**:
  - `/campaigns` — card grid with channel/status pills, member + lead counts, budget.
  - `/campaigns/new` — form.
  - `/settings` — scoring rules table + "Recompute scores" button + demo accounts list.

### Dashboard upgrades
- Replaced "Contacts" KPI tile with **Overdue tasks** (red).
- Added **Deals by stage** card under the workset strip — bars per active stage with count + SAR sum + open pipeline total.

### Sidebar
- Now 11 items: Dashboard, Leads, Pipeline, Tasks, Quotes, Contacts, Companies, Products, Campaigns, Activities, Settings.

### New users
- `finance@smi.sa` Omar Al-Dossary (FINANCE) — password `Prism@123`. Required to approve quotes > 1,000,000 SAR.

### Smoke-test results (all 200 OK)
`/dashboard /leads /pipeline /tasks /quotes /quotes/new /quotes/[id] /quotes/[id]/print /products /products/new /campaigns /campaigns/new /contacts /companies /activities /settings`

Workflow tests verified end-to-end:
- `POST /api/scoring/run` → `{ ok:true, updated:3 }`
- `POST /api/quotes/[id]/transition {action:"SUBMIT"}` → `PENDING_APPROVAL` level=MANAGER
- `POST /api/quotes/[id]/transition {action:"APPROVE"}` (admin) → `APPROVED`
- `POST /api/leads/seed-l1/convert` → opportunity created in Qualified stage

### Demo flow
1. Login as `manager@smi.sa` → drag the Aramco opportunity in `/pipeline`
2. Click `/quotes/new`, pick the Aramco opportunity, add the PMP-12HP product ×100, Save draft
3. Click **Submit** on the detail page — system computes that >500K → routes to MANAGER approval
4. Login as `finance@smi.sa` (or `admin@smi.sa`) → quotes > 1M would land here
5. Approve → **Send** → mark Accepted; print via `/quotes/[id]/print`

### Files added in this batch
```
prisma/schema.prisma                                     (extended)
prisma/seed.ts                                           (idempotent rewrite)
src/lib/scoring.ts                                       (new)
src/lib/quotes.ts                                        (new)
src/lib/i18n.ts                                          (+50 keys EN/AR)
src/components/Icon.tsx                                  (+10 icons)
src/app/(app)/layout.tsx                                 (nav extended)
src/app/api/opportunities/route.ts                       (new)
src/app/api/tasks/route.ts                               (new)
src/app/api/products/route.ts                            (new)
src/app/api/quotes/route.ts                              (new)
src/app/api/quotes/[id]/transition/route.ts              (new)
src/app/api/campaigns/route.ts                           (new)
src/app/api/scoring/run/route.ts                         (new)
src/app/api/leads/[id]/convert/route.ts                  (new)
src/app/(app)/pipeline/page.tsx + KanbanBoard.tsx        (new)
src/app/(app)/tasks/page.tsx + TaskList.tsx + NewTaskForm.tsx  (new)
src/app/(app)/products/page.tsx + new/page.tsx + new/ProductForm.tsx  (new)
src/app/(app)/quotes/page.tsx                            (new)
src/app/(app)/quotes/new/page.tsx + QuoteBuilder.tsx     (new)
src/app/(app)/quotes/[id]/page.tsx + QuoteActions.tsx    (new)
src/app/(print)/layout.tsx                               (new)
src/app/(print)/quotes/[id]/print/page.tsx + PrintButton.tsx  (new)
src/app/(app)/campaigns/page.tsx + new/page.tsx + new/CampaignForm.tsx  (new)
src/app/(app)/settings/page.tsx + RecomputeButton.tsx    (new)
src/app/(app)/leads/ConvertButton.tsx                    (new)
src/app/(app)/leads/page.tsx                             (added Convert column)
src/app/(app)/dashboard/page.tsx                         (overdue tile + deals-by-stage)
```

### Gotchas confirmed during this build
- Prisma DSL only allows `//` and `///` comments — `/* */` is a validator error.
- Schema field is `Task.dueAt` (not `dueDate`); `PipelineStage` uses `isWon`/`isLost` (no `isClosed`).
- Print page lives in its own `(print)` route group so it bypasses the app shell layout. Don't render `<html><body>` inside it — root layout already provides them.
- After schema changes always: `npx prisma migrate dev --name <name>` then `npx tsx prisma/seed.ts` (seed is upsert-based and idempotent).
- `rm -rf .next && npm run dev` if the build cache gets stale after route-group changes.

---

## 3. Gmail / Google OAuth integration — DONE

**Last updated: 2026-04-28**

### What it does
- "Continue with Google" button on `/login` — full OAuth 2.0 flow (Authorization Code, offline access).
- New users signing in with Google are auto-created with role `SALES_REP` and a random password hash.
- Existing users (matched by `googleId` OR by `email`) are updated with their tokens.
- `/settings` shows a Gmail panel: Connect / Disconnect, last-sync timestamp, and "Sync now".
- `Sync now` pulls the last 25 inbox messages, matches `From`/`To` against contact emails, and creates idempotent `EMAIL` `Activity` rows tagged with `[gmail:<msgId>]` in the body.

### Files
```
src/lib/google.ts                                 — OAuth helpers (no SDK)
src/lib/gmail.ts                                  — Gmail REST helpers + buildRawEmail
src/app/api/auth/google/start/route.ts            — start OAuth (modes: login | connect)
src/app/api/auth/google/callback/route.ts         — exchange code, upsert user, create session
src/app/api/gmail/sync/route.ts                   — pull recent inbox, log Activities
src/app/api/gmail/disconnect/route.ts             — clear tokens
src/app/(app)/settings/GmailPanel.tsx             — UI panel
src/app/login/page.tsx                            — added Google button + error toast from ?error=
src/middleware.ts                                 — added /api/auth/google to public routes
prisma/schema.prisma                              — User: googleId (unique), googleAccessToken,
                                                    googleRefreshToken, googleTokenExpiresAt,
                                                    image, gmailHistoryId, gmailLastSyncAt
prisma/migrations/20260428101455_google_gmail_fields
```

### Configuration
Add to `.env`:
```
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"
```
- In Google Cloud Console: create OAuth 2.0 Client (Web), add the redirect URI, enable Gmail API.
- Required scopes (already requested): `openid email profile`, `gmail.readonly`, `gmail.send`.
- `prompt=consent` + `access_type=offline` ensures we always receive a refresh token.

### Token refresh
`getValidAccessToken(userId)` in `src/lib/google.ts` checks expiry with a 60s buffer and refreshes via the stored refresh token, persisting the new access token.

### Sending email (helper available)
`gmailSendRaw(userId, raw)` + `buildRawEmail({to, from, subject, body})` are wired but not yet exposed in UI. Drop a button into a Quote/Activity page to enable outbound send (uses scope `gmail.send`).

### Smoke-test results
- `GET /login` → 200 (renders Google button)
- `GET /api/auth/google/start` (no env) → 307 → `/login?error=google_not_configured`
- `POST /api/gmail/sync` (signed in, not connected) → 400 `{"error":"Gmail not connected"}`
- `POST /api/auth/login` (legacy) → 200
- `GET /settings` → 200 (Gmail panel renders Connect button or "not configured" hint)

### Notes & gotchas
- `useSearchParams()` is used on `/login` — Next 13 renders it fine in a client component without Suspense for non-streaming routes.
- The Gmail sync uses `q=in:inbox newer_than:30d` (or `after:<lastSync>` after first sync) and `maxResults=25`. Bump these or add pagination as needed.
- Idempotency: an Activity body always contains `[gmail:<id>]`; the sync skips messages whose id is already present.
- Audit log uses `metadata` (not `meta`).

---

## 4. Brand polish, Global search, Notifications, Profile — DONE

**Last updated: 2026-04-28**

### 4.1 Generic rebrand (SMI → Industrial CRM)
- **Tagline / titles**: `src/lib/i18n.ts` tagline → "Sales & Marketing CRM for Industrial Manufacturers" (EN+AR). Root metadata title → "prismAI — Industrial Sales & Marketing CRM".
- **Login page** (`src/app/login/page.tsx`): new headline "Every deal. Every quote. One workspace.", subline mentions pipeline/catalogue/VAT/Gmail; 3 feature tiles (Visual pipeline, Quote builder, Bilingual & RTL); trust-badge row removed; pre-filled email is `admin@prismai.app`.
- **Print quote header** (`src/app/(print)/quotes/[id]/print/page.tsx`): generic "Your Company" placeholder (no SMI).
- **Demo accounts renamed** (DB + `prisma/seed.ts` + `src/app/(app)/settings/page.tsx`):

| Email (NEW) | Name | Role |
|---|---|---|
| `admin@prismai.app` | Faisal Al-Saud | ADMIN |
| `manager@prismai.app` | Khalid Al-Mansour | SALES_MANAGER |
| `sales@prismai.app` | Noura Al-Harbi | SALES_REP (ar) |
| `finance@prismai.app` | Omar Al-Dossary | FINANCE |
| `marketing@prismai.app` | Layla Al-Otaibi | MARKETING |

Password unchanged: **`Prism@123`**.

> ⚠️ **Stale-JWT gotcha**: existing browser cookies issued before the rename still carry the old session `name="SMI Admin"`. Topbar will show "SMI" until the user signs out + signs back in. Affects identity strings only; DB is correct.

### 4.2 Google OAuth — `state_mismatch` fix
- `src/app/api/auth/google/start/route.ts` now sets the OAuth `state` cookie via `res.cookies.set(...)` directly on the `NextResponse.redirect(...)`. The earlier `cookies().set()` from `next/headers` did not reliably attach to the redirect response in Next 13.
- Callback (`src/app/api/auth/google/callback/route.ts`) deletes via response-attached cookie deletion. Fully working end-to-end.

### 4.3 Global Search palette (Cmd+K / "/")
- **Component**: `src/components/GlobalSearch.tsx` — replaces the dead search icon in the topbar. Cmd/Ctrl+K or `/` opens it; ↑↓ navigate, ↵ open, Esc close. 180 ms debounce; type-coloured pills.
- **API**: `src/app/api/search/route.ts` — `tokenAnd()` splits the query into tokens; ANDs across ORs of multiple fields per entity. 5 results per type. Searches:
  - **Contacts**: firstName, lastName, email, nameAr
  - **Companies**: name, nameAr, website
  - **Opportunities**: title (uses field `amount` — schema does **not** have `amountSar` or a `description` column; do not re-add)
  - **Quotes**: number, notes, buyerNameAr
  - **Products**: name, sku, nameAr, description
  - **Leads**: title, notes
- Returned shape: `{ items: [{ type, id, title, subtitle, href, badge? }] }`.

### 4.4 Notifications system
- **Schema**: `Notification { id, userId, type, title, body?, link?, readAt?, createdAt }` with indexes `(userId, readAt)` and `(userId, createdAt)`. Migration `20260428212209_notifications` applied.
- **Helper**: `src/lib/notify.ts` — `notify({userId,type,title,body?,link?})`, `notifyMany(userIds, payload)`, `userIdsByRoles([roles])`. All best-effort try/catch (never throws into business flow).
- **API**: `src/app/api/notifications/route.ts`
  - `GET` → `{ items: latest 20, unread: count }`
  - `PATCH { id }` → mark single read; `PATCH { all: true }` → mark all read
- **UI**: `src/components/NotificationsBell.tsx` — red unread badge, 30s polling, dropdown with type-coloured icons (`TYPE_META` map), "Mark all read", deep-links via `link`.
- **Auto-emit on these events** (already wired):
  - `POST /api/quotes/[id]/transition` — notifies approvers on **SUBMIT**, notifies owner on **APPROVE/REJECT/ACCEPT/DECLINE**
  - `POST /api/leads/[id]/convert` — notifies new opportunity owner
  - `POST /api/tasks` — notifies assignee when created by another user
  - `POST /api/gmail/sync` — notifies the user with imported/matched counts
- Seed inserts 4 demo notifications for the admin user.

### 4.5 Topbar / sidebar overhaul
- **Topbar order** (left → right): menu / "Activity" lightning chip / spacer / `<GlobalSearch>` / locale toggle / `<NotificationsBell>` / `<UserMenu>` / dedicated **logout** icon button.
- **Sidebar** ends at `<SidebarNav />` — the bottom user/avatar/logout panel was removed (was duplicating the topbar logout + user menu).
- **`<UserMenu>`** (`src/components/UserMenu.tsx`) — avatar dropdown:
  - Identity card (avatar/name/email + role pill + locale)
  - Single nav link: **Your profile** → `/profile`
  - **Removed** Settings / Activities / Sign out / Language toggle — all duplicates of sidebar/topbar (locale toggle lives in topbar).

### 4.6 `/profile` page (NEW)
- **Route**: `src/app/(app)/profile/page.tsx` (server component) + `src/app/(app)/profile/ProfileForm.tsx` (client).
- Identity hero card (avatar, name, email, role pill, locale, join date, "Google connected" badge).
- 5 stat tiles from Prisma `_count`: Leads / Opportunities / Quotes / Tasks / Activities owned by you. Each tile is a `<Link>` deep-linking to its list page with `?owner=me` (so the destination is filtered to records the current user owns/assigned-to).
- **Owner filter**: shared `<OwnerToggle mineOnly basePath locale />` (`src/components/OwnerToggle.tsx`) renders a tiny "All / Mine" pill in the header of `/leads`, `/pipeline`, `/quotes`, `/tasks`, `/activities`. Filter field per page: `Lead.ownerId`, `Opportunity.ownerId`, `Quote.ownerId`, `Task.assigneeId`, `Activity.userId`.
- Recent activity panel: last 8 entries from your timeline.
- **Account details** form: name, language toggle (EN/AR), profile photo URL → `PATCH /api/profile`.
- **Change password** form: current + new + confirm, length & match validated → `PATCH /api/profile`.
- Inline ok/error messages, `router.refresh()` after save so topbar reflects new name immediately.
- **API**: `src/app/api/profile/route.ts`
  - `GET` returns user + `_count` of owned entities + Gmail status
  - `PATCH` accepts `name`, `locale`, `image`, `currentPassword`+`newPassword`. Re-issues JWT via `createSession()` on success. Audit-logged.

### 4.7 Files added/modified in this batch
```
src/lib/i18n.ts                                 (tagline rebrand)
src/lib/notify.ts                               (NEW — notification helpers)
src/app/layout.tsx                              (title)
src/app/login/page.tsx                          (rebrand + Google OAuth wiring)
src/app/(app)/layout.tsx                        (topbar order, removed sidebar bottom panel)
src/app/(app)/settings/page.tsx                 (demo emails)
src/app/(app)/profile/page.tsx                  (NEW)
src/app/(app)/profile/ProfileForm.tsx           (NEW)
src/app/(print)/quotes/[id]/print/page.tsx      (generic header)
src/app/api/auth/google/start/route.ts          (state_mismatch fix)
src/app/api/auth/google/callback/route.ts       (response-attached cookie delete)
src/app/api/search/route.ts                     (NEW — multi-token search across 6 entities)
src/app/api/notifications/route.ts              (NEW — list/mark read)
src/app/api/profile/route.ts                    (NEW — GET/PATCH)
src/app/api/quotes/[id]/transition/route.ts    (notify approvers/owner)
src/app/api/leads/[id]/convert/route.ts         (notify opp owner)
src/app/api/tasks/route.ts                      (notify assignee)
src/app/api/gmail/sync/route.ts                 (notify with import counts)
src/components/GlobalSearch.tsx                 (NEW — Cmd+K palette)
src/components/NotificationsBell.tsx            (NEW — bell + dropdown)
src/components/UserMenu.tsx                     (NEW — avatar dropdown)
prisma/schema.prisma                            (Notification model + indexes)
prisma/migrations/20260428212209_notifications  (NEW)
prisma/seed.ts                                  (renamed users + 4 demo notifications)
```

### 4.8 Demo PDF
- `Outputs/prismAI-Demo.pdf` (~616 KB, 22 sections) — generated via pdfkit; not part of dev runtime. Re-run only if you want to refresh the deck.

### 4.9 Gotchas confirmed in this batch
- **`Opportunity` schema has `amount` (Decimal/Int), no `amountSar`, no `description`.** Adding either to a Prisma `where` causes a 500 in `/api/search`. Keep search fields = `title`.
- **JWT cookie holds the session name** at issue time. Renaming a user in the DB does not propagate until next sign-in. `PATCH /api/profile` calls `createSession()` to refresh, so editing your own name updates the topbar after `router.refresh()`.
- **Don't re-add the sidebar bottom user panel** — logout lives in the topbar now (dedicated icon + UserMenu).
- **UserMenu must NOT link to `/settings` or `/activities`** — sidebar already does. Likewise no Sign out link inside the dropdown (topbar logout button covers it). Language toggle was also removed (2026-04-28) — duplicate of the topbar locale toggle; do not re-add.
- **PATH gotcha** in this shell: `node`/`npm` resolve only after  
  `export PATH=/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin:$PATH`.

---

## 5. Teams + User Management — DONE (2026-04-28)

### What it does
- **Admin** can add/disable users, reset passwords, and create/rename/delete teams from `/settings/team` (admin-only page).
- Each user can belong to **one team** (`User.teamId` → `Team`). Admin link is shown on `/settings` only when `session.role === "ADMIN"`.
- **Visibility scope** rule (`src/lib/scope.ts`):
  - `ADMIN` → sees everything (no filter).
  - `SALES_MANAGER` with a team → sees every active teammate's records.
  - All other roles → see **only their own** records.
- Applied automatically on the 5 list pages: **Leads, Pipeline, Quotes, Tasks, Activities**. Their `?owner=me` toggle still narrows further to the current user.

### Schema
```prisma
model Team {
  id        String   @id @default(cuid())
  name      String
  members   User[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
model User {
  // ...existing fields...
  isActive  Boolean  @default(true)
  teamId    String?
  team      Team?    @relation(fields: [teamId], references: [id])
}
```
Migration: `prisma/migrations/20260428224141_teams_and_user_team/`. Seed creates `team-sales`, `team-marketing`, `team-finance` and assigns demo users (manager + rep → Sales, marketing → Marketing, finance → Finance, admin → unassigned).

### APIs (admin-only — guarded inside the route)
- `GET/POST/PATCH/DELETE /api/teams` — `DELETE` first sets `teamId: null` for every member, then deletes the team.
- `GET/POST/PATCH /api/users` — no `DELETE`. To remove access set `isActive: false` (PATCH). `POST` requires unique email and bcrypt-hashes the password (cost 10). `PATCH` accepts any subset of `name | role | locale | teamId | isActive | password`.
- All mutations write `AuditLog` entries (`metadata` field).

### Files added
- `src/lib/scope.ts` — `getVisibleScope(session)` + `ownerWhere(scope, field, mineOnly, selfId)`.
- `src/app/api/teams/route.ts`, `src/app/api/users/route.ts`.
- `src/app/(app)/settings/team/page.tsx` (admin guard via `redirect("/dashboard")` for non-admins).
- `src/app/(app)/settings/team/TeamsPanel.tsx` (`"use client"` — list, add, rename, delete teams).
- `src/app/(app)/settings/team/UsersPanel.tsx` (`"use client"` — table with inline role/team selects, enable/disable, reset password, add user form).

### Files modified
- `prisma/schema.prisma`, `prisma/seed.ts`.
- `src/app/(app)/settings/page.tsx` — added admin link card to `/settings/team` near the top (uses `Icon name="users"`).
- `src/app/(app)/{leads,pipeline,quotes,tasks,activities}/page.tsx` — replaced ad-hoc `mineOnly ? {…ownerId/assigneeId/userId: session.sub} : undefined` with `ownerWhere(scope, field, mineOnly, session.sub)` from `lib/scope.ts`.

### Hard rules to NOT break (Teams + Users)
- Always go through `getVisibleScope()` + `ownerWhere()` on list queries instead of re-implementing role logic. Currently wired on the 5 list pages only — extend the same way before exposing more record types to non-admin roles.
- Don't add a hard `DELETE` for users. Use `PATCH { isActive: false }` so audit / FK history stays intact.
- Don't expose `passwordHash` in any user-listing API or page.
- The static "Demo accounts" card on `/settings` is still there for QA; once self-serve user management is the only path, it can be removed.

---

## 6. Contacts Column Filters + Company Detail Page — DONE (2026-04-28)

### Contacts — per-column filter inputs
- `src/app/(app)/contacts/page.tsx` is now a thin server component that fetches contacts and passes them to `ContactsTable`.
- `src/app/(app)/contacts/ContactsTable.tsx` — NEW `"use client"` component:
  - Accepts `contacts` (with `company.name`, `owner.name`) and `locale`.
  - Local `filters` state: `name | title | company | email | phone | owner` — all strings.
  - Each `<th>` renders a compact `<FilterInput>` below the column label (case-insensitive `includes` filter).
  - Green status bar at top shows "{n} of {total} results" + "Clear filters" when any filter is active.
  - Works purely client-side — no page reload, no query params.

### Companies — clickable cards → detail page
- `src/app/(app)/companies/page.tsx` — company cards are now `<Link href="/companies/[id]">` instead of plain `<div>`.
- `src/app/(app)/companies/[id]/page.tsx` — NEW server component detail page:
  - Fetches company by `params.id` with `contacts` (+ owner) and `leads` (+ contact, owner). Returns `notFound()` if missing.
  - **Header card**: initials avatar, name + Arabic name, industry/region/size pills, website link, VAT number, owner, created date, and KPI row (contacts count, leads count, total lead value).
  - **Contacts section**: full table — name avatar, title, email (mailto link), phone/WA pills, owner. Contact name now links to `/contacts/[id]`.
  - **Leads section**: full table — title, contact name, source pill, status colored pill, value (SAR), owner. Lead title links to `/leads/[id]`; related contact name links to `/contacts/[id]`.
  - Back link → `/companies`.

### Contact + Lead detail screens
- `src/app/(app)/contacts/[id]/page.tsx` — NEW server component:
  - Shows contact identity/info block, company link back to `/companies/[id]`, owner, email/phone/WhatsApp, and related leads table.
  - Related leads table links each lead title to `/leads/[id]`.
- `src/app/(app)/leads/[id]/page.tsx` — NEW server component:
  - Shows lead title, status/source/score pills, value, owner, created/updated dates, notes.
  - Company and contact fields link back to `/companies/[id]` and `/contacts/[id]`.

### Leads — explicit conversion flow
- `src/app/(app)/leads/page.tsx`
  - Fetches pipeline stages and passes them to the row action so conversion can map directly into a target pipeline stage.
- `src/app/(app)/leads/ConvertButton.tsx`
  - Replaced the old icon-only trigger with a visible `Convert` button on each eligible lead row.
  - Clicking opens a compact conversion dialog with `Deal value`, `Pipeline stage`, and `Expected close date`.
  - Confirming calls `POST /api/leads/[id]/convert`, then redirects to `/pipeline`.
  - `DISQUALIFIED` and already `CONVERTED` leads do not show the action.

### Leads list — inline CRM workflow polish
- `src/app/(app)/leads/LeadsTable.tsx` — NEW `"use client"` list surface:
  - Inline status dropdown per row (`NEW | CONTACTED | QUALIFIED | DISQUALIFIED | CONVERTED`) so reps can update lead stage without leaving the page.
  - Search bar filters by title, source, company, contact, and owner.
  - Quick tabs: `Active Leads`, `My Leads`, `New Leads`, `Converted`.
  - The default `Active Leads` tab excludes converted leads so the main list stays focused on open pipeline candidates.
  - Adds bulk-selection checkboxes and a selection bar (currently `Send email` is visible but disabled; `Clear selection` works).
  - Adds `Last activity` from the most recent related `Activity` and highlights stale leads (`>= 5 days`) in red.
  - Renames owner display to `Assigned to`, keeps company/contact names clickable, and shows a `Hot/Medium/Low` priority pill derived from score.
  - Changes the top summary language from total value to `Potential value`.
- `src/app/api/leads/[id]/route.ts` — NEW `PATCH` endpoint:
  - Accepts `status` for inline lead updates.
  - Creates a `STATUS_CHANGE` activity and an `AuditLog` entry with `metadata`.

### Companies, Contacts, Leads — edit + delete
- Reused forms now support both create and edit modes:
  - `src/app/(app)/companies/new/CompanyForm.tsx`
  - `src/app/(app)/contacts/new/ContactForm.tsx`
  - `src/app/(app)/leads/new/LeadForm.tsx`
  - Each now accepts `initialData`, `endpoint`, `redirectTo`, and `mode`.
- New edit pages:
  - `src/app/(app)/companies/[id]/edit/page.tsx`
  - `src/app/(app)/contacts/[id]/edit/page.tsx`
  - `src/app/(app)/leads/[id]/edit/page.tsx`
- New entity routes:
  - `src/app/api/companies/[id]/route.ts` — `PATCH`, `DELETE`
  - `src/app/api/contacts/[id]/route.ts` — `PATCH`, `DELETE`
  - `src/app/api/leads/[id]/route.ts` — expanded `PATCH`, plus `DELETE`
- Delete behavior is relation-safe:
  - Deleting a company nulls `companyId` on contacts, leads, opportunities, and quotes before delete.
  - Deleting a contact deletes `CampaignMember` rows and nulls `contactId` on leads, opportunities, quotes, and activities before delete.
  - Deleting a lead nulls `leadId` on activities and `fromLeadId` on opportunities before delete.
- UI actions:
  - Company, Contact, and Lead detail pages now expose visible `Edit` and `Delete` actions.
  - Contacts list names link to detail pages, and the list has a direct `Edit` action.
  - Shared delete UI lives in `src/components/DeleteEntityButton.tsx`.

### Pipeline — clickable opportunity detail view
- `src/app/(app)/pipeline/KanbanBoard.tsx`
  - Opportunity cards are still draggable, but now also open `/pipeline/[id]` on click.
  - Card footer includes an `Open details` hint.
- `src/app/(app)/pipeline/[id]/page.tsx` — NEW opportunity drill-down page:
  - **Header / vital signs**: amount, probability, expected close date, owner, current stage, and a horizontal stage tracker.
  - **Activity timeline**: chronological opportunity activities with user, timestamp, and type-specific icon/tone.
  - **Quote integration**: linked quote list with deep links to `/quotes/[id]` plus `Create quote` action.
  - **Task integration**: embedded follow-up task form plus linked task list for the current opportunity.
  - **Stakeholders**: primary contact plus additional company contacts as the buying committee.
  - **Technical context**: source lead link, source channel, and lead notes/spec context when the opportunity came from a converted lead.
  - **Files** section exists with an explicit empty state; actual uploads still need a file/storage model.
  - **Win/Loss actions**: buttons move the opportunity to the configured won/lost pipeline stage; loss flow captures an optional reason.
- New supporting client components:
  - `src/app/(app)/pipeline/OpportunityNoteForm.tsx` — adds opportunity-specific notes/activities.
  - `src/app/(app)/pipeline/OpportunityStageActions.tsx` — won/lost stage actions.
  - `src/app/(app)/pipeline/OpportunityFilesPanel.tsx` — uploads files from the user device and lists attached opportunity files.
- Supporting wiring:
  - `src/app/api/activities/route.ts` now accepts `opportunityId` so notes/timeline entries can be attached directly to deals.
  - `src/app/(app)/tasks/NewTaskForm.tsx` now accepts `defaultOpportunityId` for prefilled follow-up creation.
  - `src/app/(app)/quotes/new/page.tsx` + `src/app/(app)/quotes/new/QuoteBuilder.tsx` now support `?opportunityId=` so `Create quote` can preselect the deal and company.
  - `src/app/api/opportunities/[id]/files/route.ts` — NEW `POST` upload endpoint:
    - Stores uploaded files under `public/uploads/opportunities/<opportunityId>/...`.
    - Limits uploads to 15MB.
    - Uses a runtime-safe blob/file guard instead of `instanceof File`, because Next 13 route handlers on this Node runtime do not expose the global `File` constructor reliably.
    - Creates an `Activity` entry and `AuditLog` entry for each upload.
  - The opportunity detail page reads files from disk and renders them as downloadable/openable links in the Files card.

---


## 7. Recent Changes (April 2026)

- **Task Management**: Task CRUD, edit/delete, due date is now date-only (prevents timezone bugs), tasks can be linked to leads or opportunities, dropdown filtering, and quick actions (complete, reopen, push to tomorrow).
- **Quote Management**: Quotes can be edited and deleted, PATCH/DELETE API handlers, modal for editing, and print dialog improvements (AutoPrint).
- **Dashboard**: All dashboard tiles, graphs, and cards are clickable and route to the correct screens.
- **Lead Conversion**: Convert Lead to Opportunity modal now includes Start Date and Assignee fields, which are passed to the API and stored on the new opportunity. UserSelect component fetches users for assignee selection. Backend and schema updated to support these fields.
- **Notifications**: Inbound email notifications, bell icon, and notification dropdown are live. Notifications are triggered for key events (lead conversion, quote transitions, task assignment, Gmail sync, etc.).
- **Teams & User Management**: Admins can add/disable users, reset passwords, and manage teams. Visibility scope rules are enforced for all major list pages.
- **UI/UX Polish**: Print dialog, global search palette (Cmd+K), `/profile` page, topbar/sidebar overhaul, and improved owner filtering on all major entities.

### Bug-fix batch — May 2026

**Seed & schema alignment fixes** (broken by a previous GPT-4.1 agent):
- `prisma/seed.ts` — `Task.dueAt` fields changed from `Date` objects to `.toISOString().slice(0, 10)` strings (schema is `String?`, not `DateTime`).
- `src/app/(app)/campaigns/page.tsx` — display field changed from `c.budget` → `c.budgetSar` to match schema.
- `src/app/(app)/dashboard/page.tsx` — overdue tasks query removed non-existent `"IN_PROGRESS"` status; now filters by `status: "OPEN"` only.
- `src/components/UserSelect.tsx` — fetches `/api/users/active` (new lightweight endpoint, accessible to all roles) instead of admin-only `/api/users`. Added `Array.isArray` guard and `.catch()`.
- `src/app/api/users/active/route.ts` — **NEW** endpoint returning `{id, name}` of all active users, for use in dropdowns.

**Quote edit/delete overhaul**:
- `src/app/api/quotes/[id]/route.ts` — completely rewritten:
  - Added Zod validation schema matching the POST route (`itemSchema` + `patchSchema`).
  - PATCH now runs inside a `prisma.$transaction`: deletes old `QuoteItem` rows, creates new ones, recalculates `subtotalSar`/`discountSar`/`vatSar`/`totalSar` via `calcTotals()`.
  - DELETE now writes an `AuditLog` entry.
  - GET now orders items by `{ order: "asc" }`.
- `src/app/(app)/quotes/[id]/QuoteActions.tsx` — `handleEdit()` now fetches `/api/products`, `/api/companies`, `/api/opportunities` in parallel alongside the quote, and passes `products`, `companies`, `opportunities` as separate props with `initialValues` to `QuoteBuilder`. Previously spread raw quote data as props, causing `TypeError: Cannot read properties of undefined (reading 'find')`.

**Campaign creation fix**:
- `src/app/(app)/campaigns/new/CampaignForm.tsx` — fixed 4 mismatches between form payload and API Zod schema:
  - `budget` → `budgetSar`
  - `description` → `goal`
  - Channel option `ADS` → `OTHER`
  - Status option `COMPLETED` → `DONE`

**Companies API**:
- `src/app/api/companies/route.ts` — added missing `GET` handler (returns all companies with contacts, ordered by name). Required by the quote edit modal.

**Approval thresholds**:
- `src/lib/quotes.ts` — Manager approval threshold changed from `totalSar > 500_000` to `totalSar > 50_000`. Finance threshold unchanged at `> 1_000_000`. Discount threshold unchanged at `> 10%`.

---

## 8. Continuation prompt for a new chat

Paste the block below into a new Copilot chat to resume work on this project with full context:

```
I'm continuing work on **prismAI**, a HubSpot-like CRM for industrial manufacturers (generic, formerly SMI), located at `/Users/irammehmooda/CRM/Project/prismai`.

**First**, read `docs/HANDOFF.md` end-to-end and `/Users/irammehmooda/CRM/plan.md`. They document Phases 1-4 (auth, dashboard, contacts/companies/leads/activities, pipeline+kanban, tasks, products+quotes+VAT+approvals, scoring+campaigns, Gmail OAuth) plus the most recent batch (rebrand from SMI to generic Industrial, global search palette, notifications system, `/profile` page, topbar/sidebar overhaul, and all April 2026 changes).

**Stack**: Next.js 13.5.6 App Router (TS), Tailwind 3, Prisma 5 + SQLite (`prisma/dev.db`), `jose` JWT in HttpOnly cookie, `bcryptjs`, `zod`. Server components by default, "use client" only for interactive forms. `getSession()` in every protected route. Audit-log every create/update/delete.

**Run locally**:
```bash
export PATH=/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin:$PATH
cd /Users/irammehmooda/CRM/Project/prismai
npm run dev   # http://localhost:3000
```
Login `admin@prismai.app` / `Prism@123` (other users: manager / sales / finance / marketing @prismai.app, same password).

**Hard rules — do not break**:
- `Opportunity` schema uses `amount` only; **no** `amountSar`, **no** `description`. Search route already burned by this once.
- `Campaign` schema uses `budgetSar` (not `budget`) and `goal` (not `description`). Statuses: `DRAFT`, `ACTIVE`, `PAUSED`, `DONE`. Channels: `EMAIL`, `WHATSAPP`, `EVENT`, `LINKEDIN`, `OTHER`.
- `Task.dueAt` is `String?` (date-only `YYYY-MM-DD`), **not** `DateTime`. Use `.toISOString().slice(0, 10)` in seed/API.
- Import Prisma as `import { prisma } from "@/lib/db"` (named, **not** default). Auth as `import { getSession } from "@/lib/auth"` (custom jose JWT, **not** next-auth).
- Quote approval thresholds: Manager > SAR 50,000 or discount > 10%, Finance > SAR 1,000,000.
- `UserMenu` dropdown must stay minimal: identity card + "Your profile" only. **No** Settings/Activities/Sign out/Language toggle (all duplicates of sidebar/topbar — locale lives in topbar).
- Sidebar must end at `<SidebarNav />` — **no** bottom user panel.
- Topbar logout is a dedicated icon button next to `<UserMenu>` — keep it.
- JWT cookie caches session name at sign-in time. After any user rename, the user must sign out + back in (or call `PATCH /api/profile` which re-issues the JWT).
- Prisma DSL allows only `//` and `///` comments; `/* */` is a validator error.
- `postcss.config` must be `.js` (CommonJS). `.mjs` is silently ignored by Next 13 → unstyled pages.
- After schema changes: `npx prisma migrate dev --name <name>` then `npx tsx prisma/seed.ts`. Seed is idempotent (upserts).

**What's already wired and where**:
- Global search palette (Cmd+K / "/"): `src/components/GlobalSearch.tsx` + `src/app/api/search/route.ts` (multi-token AND-of-ORs across 6 entity types).
- Notifications: `Notification` Prisma model + `src/lib/notify.ts` helper + `src/app/api/notifications/route.ts` + `src/components/NotificationsBell.tsx`. Auto-emits on quote transitions, lead conversion, task assignment, gmail sync.
- Profile page: `src/app/(app)/profile/page.tsx` + `ProfileForm.tsx` + `src/app/api/profile/route.ts` (GET with `_count`, PATCH with name/locale/image/password change, re-issues JWT).
- Gmail OAuth + sync: `src/lib/google.ts`, `src/lib/gmail.ts`, `src/app/api/auth/google/{start,callback}/route.ts`, `src/app/api/gmail/{sync,disconnect}/route.ts`. Env requires `GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI` (already populated in `.env`).

**Suggested next slices** (pick what the user asks for; don't overreach):
1. Outbound email from a Quote/Activity using `gmailSendRaw()` (helper exists, no UI yet).
2. WhatsApp Business API integration (templates first; `Message` model placeholder already exists).
3. ZATCA e-invoicing fields/submission for `Quote` (buyer VAT block already in print page).
4. Tests: Vitest for `lib/`, Playwright E2E for lead → opportunity → quote.
5. Upgrade Node ≥ 18.17 then bump Next to 14.2.x (currently pinned at 13.5.6 due to Node 18.15 + a known security advisory).

**Tone**: implement directly rather than only suggesting. Read files before editing. Use `replace_string_in_file`/`multi_replace_string_in_file`. Don't create markdown files unless explicitly asked. Keep responses short.
```
