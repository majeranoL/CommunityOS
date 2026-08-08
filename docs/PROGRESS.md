# CommunityOS — Progress & Todo

Working tracker for closing the gap between the concept (`Cummunity-os-concept.md`) and the built system.

## Work log rule (IMPORTANT)

- ALWAYS read this file before starting work and after finishing.
- EVERY code change MUST be recorded here — append to the **Work log** section at the bottom with date, what changed, files touched, and verification status.
- Keep **Progress** and **Todo** sections in sync: check off completed todo items, and add any new work discovered along the way.
- This file is the source of truth so we can return to it later.

- Repo root: `C:\Users\Mark\Desktop\CommunityOS`
- Frontend: `Community-os-frontend` (React 19 + Vite + TS, dev on :5173)
- Backend: `Community-os-backend` (NestJS 10 + Prisma + PostgreSQL, dev on :3000, `/api` prefix, Swagger `/api/docs`)

---

## How to run / verify

- Backend: `npm run start:dev` in `Community-os-backend` (watch mode; env vars in `.env`, must have `DATABASE_URL`, `JWT_SECRET`, `REFRESH_SECRET`, etc.)
- Frontend: `npm run dev` in `Community-os-frontend` (proxies `/api` + `/uploads` → :3000)
- Typecheck: `npx tsc --noEmit` (frontend) · Build: `npx nest build` (backend)
- Migrations: `npx prisma migrate dev` in backend (requires DB running)

---

## Progress — Built and verified

### Platform / infrastructure
- [x] Multi-tenant core: `Community` = tenant, all services scoped by `communityId`
- [x] Auth: login / register / refresh (rotating) / logout / forgot+reset password / `/auth/me`
- [x] Access token (JWT, 15m) + refresh token (7d) persisted in localStorage; axios single-flight 401→refresh→retry
- [x] RBAC: `User → Role → Permission` (per-community), `JwtAuthGuard` + `PermissionsGuard` + `@Permissions()`
- [x] Seed: demo community, 122-permission catalog, President (all) + Member (20) system roles, `admin@communityos.com` platform admin
- [x] Response envelope `{ success, message, data }` + pagination envelope
- [x] Soft deletes, audit-log interceptor (all mutating requests), uploads (`/uploads`, local disk)
- [x] Global validation pipe, Prisma exception filter, CORS, Swagger

### Backend modules (all present + mapped)
- [x] auth, users, roles, permissions, communities, public, admin, dashboard, analytics, reports, announcements, events, polls, complaint, facilities, reservations, households, residents, vehicles, visitors, staff, maintenance, documents, messaging, notifications, settings, finance (assessments + payments), subscriptions/billing/invoices/plans, audit-logs, uploads

### Frontend pages
- [x] Public: Landing, Get Started (HOA signup wizard), Login, Register, Forgot/Reset password
- [x] App shell: sidebar (permission-filtered), topbar, notifications bell, user menu, theme toggle
- [x] Dashboard (KPIs, quick actions, recent events/complaints/reservations, facility status)
- [x] Users (list + create + details, role picker)
- [x] Announcements, Events, Polls, Complaints (list + forms + status actions)
- [x] Facilities + Reservations (booking with resident/vehicle pickers)
- [x] Notifications (inbox + unread badge)
- [x] Settings (personal profile / appearance — NOT community settings yet)
- [x] Billing (subscription, plan, invoices, usage limits)
- [x] Finance — Assessments + Payments (create/issue/cancel, confirm/reject/refund, detail dialogs)
- [x] Platform Admin shell: Overview, Communities (list/detail/provision)

### Finance feature (recently completed end-to-end)
- [x] Backend: assessments/payments controllers+services+DTOs, `finance/options` endpoints (households/residents) guarded by `assessment.view`
- [x] Frontend: finance feature folder (services/hooks/types/validation/components/pages), tabs page, form dialogs, detail dialogs
- [x] Verified: backend watch reloaded with new routes, endpoints return 401 unauthenticated, frontend build + tsc pass

---

## Concept alignment check (verified against `Cummunity-os-concept.md`)

Re-verified on this session against the actual codebase. All claims in this file confirmed accurate (React 19.2.8 / Vite 8.2 / router-dom 7.18; 122 permission codes in `prisma/permissions.ts`; Member role = 20 perms; frontend routes match the list above).

**Matches concept:** multi-tenant isolation, Account→User→Resident/Household/Role model, registration flow, RBAC (frontend gates UX / backend enforces), response envelope, session flow (401→single-flight refresh), all lifecycle state machines (complaints, reservations incl. approve/reject/cancel/complete, maintenance, finance, visitors, polls, announcements/events/docs), notifications via polling, local uploads, soft deletes, audit interceptor, SaaS subscription→plan→billing→invoice, HOA onboarding wizard, dashboard evolution, design system.

**Partial / deviates:** access token in localStorage (concept wants in-memory) · event has no `UPCOMING` status · announcement has no `REVIEW` stage · `/app/settings` is personal profile (community settings page missing) · reservations live as a tab inside Facilities (no separate route) · platform settings UI missing.

**Gaps (planned below):** roles/permissions management UI · staff model (office-holder roles via custom roles; non-login staff records) · 11+ missing tenant pages · plans management UI · rate limiting.

---

## Todo — Approved plan

### Decisions (resolved)
| # | Decision | Choice |
|---|---|---|
| 1 | Staff model | Both — non-login Staff records + custom office-holder roles (Treasurer/Secretary/Operations) |
| 2 | Execution order | Sequential, verify after each step |
| 3 | Platform settings (Phase 3b) | Defer — ship Plans UI only; platform settings = future task |
| 4 | Access token in memory | Do it — refresh-first bootstrap on reload |
| 5 | Lifecycle statuses | Both — Announcement `REVIEW` + Event `UPCOMING` (2 migrations) |
| 6 | Charts library | Install recharts |
| 7 | Settings UX | Tabbed — Profile + Community in `/app/settings` |
| 8 | Reservations | Keep as tab inside Facilities (no extraction) |
| 9 | Scoped options endpoints | Defer — President (all perms) works out of the box |
| 10 | Role templates | Include Treasurer/Secretary/Operations presets |
| 11 | Guard access model | Guards get a login via Users page (Guard role template) — Staff entity stays non-login for maintenance assignment |
| 12 | Super admin scope | Platform management only — no drill-in/impersonation of tenants |
| 13 | Household ownership | 1 account per household; household = permanent property record owning the financial history |
| 14 | Household `ACTIVE → INACTIVE` | Auto-deactivate the linked account (old family loses login); confirm dialog warns |
| 15 | Finance scoping | Residents see only their own household's records; managers (President/Treasurer) see all |
| 16 | Ownership matching | Require block + lot for the 1-account rule (address-only falls back to current behavior) |

**No new permission codes** are needed anywhere (all reuse the existing catalog) → no permission backfill for existing communities.

### Execution rules
- Sequential: Phase 1 → Phase 2 → each Phase 3 page → 4 → 5.
- Verify after each step: `npx tsc --noEmit` (frontend) · `npx nest build` (backend) · `prisma migrate dev` for migrations · exercise the page live.
- Follow existing page patterns (Users/Announcements/Finance); every change logged in Work log below.

### Phase 0 — Foundation
- [x] Add missing permission constants to `src/constants/permissions.ts` (full catalog: resident, household, vehicle, visitor +check-in/out/cancel, staff, maintenance +assign/start/resolve/cancel, document +publish/archive, message, reports.export, analytics.view, audit.view/manage, role.manage, permission.view/manage, settings.manage; also added missing `announcement.publish` + `complaint.close`)
- [x] Fix settings permission mismatch: `settingsUpdate` (`settings.update`, non-existent) → `settingsManage` (`settings.manage`); no callers referenced the old key
- [x] Reorganize `NAV_SECTIONS` into concept-aligned groups (Community / Communication / Operations / Finance / Intelligence) — existing pages only; new items added as each Phase 2 page ships

### Phase 1 — Roles & Permissions UI (office-holder staff: Treasurer/Secretary/Operations)
- [ ] `features/roles/` — services (roles + permissions), hooks, types, validation
- [ ] Roles list page (name, description, users, permissions, isSystem badge)
- [ ] Role form dialog (create/edit)
- [ ] Role permissions dialog (catalog grouped by module, checkbox grid + template presets, save via `POST /roles/:id/permissions`)
- [ ] Route `/app/roles` gated by `role.manage` + nav item (Community section)
- [ ] Office-holder role templates (Treasurer/Secretary/Operations) in the permissions dialog
- [ ] Reuse/re-export existing `useRoles` from users feature (keep `CreateUserDialog` working)
- [ ] **Guard role template** — `visitor.view/create/check-in/check-out/cancel` + `maintenance.view` + `facility.view` + `dashboard.view` (guards log in via Users page with this role)

### Phase 2 — Household ownership & 1-account-per-household (user's design; backend-first)
- [ ] Backend `auth.service.ts register()` ownership rule: match existing household by **block + lot**; found + `ACTIVE` + has an owner (active User whose `resident.householdId` = household) → `409` "This unit already has an account. Contact your administrator."; found + `INACTIVE` → reuse the **same** household, reactivate → `ACTIVE`, create new resident+user on it (inherits the household's assessment/payment history); not found → create as today
- [ ] Backend household status transition: `ACTIVE → INACTIVE` auto-deactivates the linked account (User status → INACTIVE); `INACTIVE → ACTIVE` flips status only (data cleanup/imports)
- [ ] Backend finance scoping: `assessments.service.findAll` + payments list filter to the caller's **own household** when a plain Member (no assessment/payment manage perm); managers (President/Treasurer) see all
- [ ] Frontend register page: friendly error for occupied units
- [ ] Frontend Users page: show linked household/status where useful

### Phase 3 — Missing tenant pages (non-login Staff + module gaps; sequential, each verified)
- [ ] Residents — `/app/residents` (`resident.view`): status/gender filters, household picker, detail w/ household
- [ ] Households — `/app/households` (`household.view`): search/status, residentCount, detail lists residents, **ACTIVE/INACTIVE toggle + current owner/account holder display (confirm dialog warns on deactivation)**
- [ ] Vehicles — `/app/vehicles` (`vehicle.view`): type/status/resident filters, resident picker, plate uppercase
- [ ] Visitors — `/app/visitors` (`visitor.view`): check-in / check-out / cancel actions
- [ ] Staff — `/app/staff` (`staff.view`): role/status filters, maintenanceCount (non-login records)
- [ ] Maintenance — `/app/maintenance` (`maintenance.view`): assign to Staff / start / resolve / cancel; staff picker
- [ ] Documents — `/app/documents` (`document.view`): upload via `POST /uploads`, publish/archive, download
- [ ] Messaging — `/app/messages` (`message.view`): inbox/outbox tabs, compose (recipient picker, empty = broadcast), mark-read
- [ ] Reports — `/app/reports` (`reports.export`): export cards, CSV download, payments month picker
- [ ] Analytics — `/app/analytics` (`analytics.view`): **install recharts**; financial KPIs, trends, status-breakdown charts
- [ ] Audit Logs — `/app/audit-logs` (`audit.view`): list (action/entity/date filters), summary cards, purge (`keepDays`)
- [ ] Community Settings — restructure `/app/settings` into **Tabs**: Profile (existing) + Community (`settings.view` read / `settings.manage` edit; general/notifications/security/billing keys via `GET /settings` + bulk `PUT /settings`)
- [ ] Note: reservations stay as a tab in Facilities (no extraction) · scoped options endpoints deferred (only if a real role combo needs them later)

### Phase 4 — Platform admin gaps (platform settings DEFERRED)
- [ ] Plans management — `/admin/plans` (list incl. inactive via `includeInactive`, create/edit dialog, toggle active) gated by `subscription.manage`; add to `ADMIN_NAV` in admin-shell
- [x] Platform settings — **DEFERRED** (future task: backend global settings store + endpoints + `/admin/settings` page)

### Phase 5 — Minor concept fixes (all approved)
- [ ] Access token in memory — `token.ts` module-level access token (refresh only persisted); `api.ts` interceptors use memory; bootstrap `ensureAccessToken()` (refresh-first) before `/auth/me`; per-tab session (no cross-tab sharing)
- [ ] Rate limiting — install `@nestjs/throttler`, global `ThrottlerGuard` (~100 req/min/IP), confirm no interference with guards/Swagger
- [ ] Event `UPCOMING` — add to `EventStatus` + migration; `publish()` → `UPCOMING` when future-dated (else `PUBLISHED`), `complete()` from either; update filters/badges/reports `status-options`/analytics
- [ ] Announcement `REVIEW` — add to `AnnouncementStatus` + migration; flow `DRAFT → REVIEW → PUBLISHED` (reuse `announcement.publish`); update filters/badges/publish action

---

## Known gaps / notes (not yet scheduled)
- No tenant-facing roles-management UI existed before Phase 1 (now planned)
- Events have no RSVP/attendee model
- Open public registration (anyone with a community UUID can join)
- Platform-level analytics beyond `/admin/overview` KPIs not yet built
- Concept file has a typo in its name: `Cummunity-os-concept.md`

---

## Work log

> Chronological record of code changes. Newest entries at the bottom.

### 2026-08-08 — Baseline / finance feature verified
- Verified the entire finance feature end-to-end (backend `finance/options` routes live, frontend tsc + build pass, servers running).
- Documented the concept alignment check (see section above).
- Added this work-log convention.

### 2026-08-08 — Phase 0: Foundation (frontend)
- Rewrote `src/constants/permissions.ts` to the full backend catalog (122 codes): added resident/household/vehicle/visitor/staff/maintenance/document/message/reports/analytics/audit/role/permission groups + `announcement.publish` + `complaint.close`; renamed `settingsUpdate` → `settingsManage` (backed by real code `settings.manage`). Verified no callers referenced the old key.
- Reorganized `src/components/layout/nav-items.tsx` into concept-aligned groups: Overview / Community / Communication / Operations / Finance / Intelligence (existing items only).
- Verified: `npx tsc --noEmit` exit 0.

### 2026-08-08 — Plan finalized (all decisions resolved)
- Resolved all 10 open decisions (see Decisions table above): staff model Both, sequential execution, platform settings deferred, token-in-memory approved, both status migrations approved, recharts approved, tabbed Settings, reservations stay in Facilities tab, scoped options endpoints deferred, role templates approved.
- Recorded the full final execution plan in the Todo section (Phases 1–4 with per-page detail). Ready to begin Phase 1.

### 2026-08-08 — Household ownership design added (user's idea)
- User clarified the core idea: **1 account per household**; the property (household) owns the financial history, families own accounts; when a family moves out the President frees the household (INACTIVE) and a new family registers into it, inheriting the property's dues/payment records. Verified against the codebase: assessments are already `householdId`-scoped (`schema.prisma`), so history inheritance needs no migration.
- Added Decisions 11–16 (Guard login model, super admin scope, household ownership, auto-deactivate on INACTIVE, per-household finance scoping, block+lot matching).
- Added **Phase 2 — Household ownership & 1-account-per-household** (backend register() ownership rule, ACTIVE→INACTIVE auto-deactivate, member finance scoping, register page error) and a **Guard role template** item in Phase 1; renumbered Phases 2→3, 3→4, 4→5; extended the Phase 3 Households page with status toggle + owner display.





always read this md and add todo and progress here 