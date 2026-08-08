# CommunityOS — Progress & Todo

Working tracker for closing the gap between the concept (`docs/Community-os-concept.md`) and the built system.

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

## Concept alignment check (verified against `docs/Community-os-concept.md`)

Re-verified on this session against the actual codebase. All claims in this file confirmed accurate (React 19.2.8 / Vite 8.2 / router-dom 7.18; 122 permission codes in `prisma/permissions.ts`; Member role = 20 perms; frontend routes match the list above).

**Matches concept:** multi-tenant isolation, Account→User→Resident/Household/Role model, registration flow, RBAC (frontend gates UX / backend enforces), response envelope, session flow (401→single-flight refresh), all lifecycle state machines (complaints, reservations incl. approve/reject/cancel/complete, maintenance, finance, visitors, polls, announcements/events/docs), notifications via polling, local uploads, soft deletes, audit interceptor, SaaS subscription→plan→billing→invoice, HOA onboarding wizard, dashboard evolution, design system.

**Partial / deviates:** reservations live as a tab inside Facilities (no separate route) · registration gate is binary (OPEN/CLOSED); no approval/pending-account mode yet.

**Gaps (planned below):** roles/permissions management UI (done in Phase 1) · staff model (office-holder roles via custom roles; non-login staff records) · 12 missing tenant pages (Phase 3) · plans management UI · rate limiting · household ownership (done in Phase 2).

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
- [x] `features/roles/` — services (roles + permissions), hooks, types, validation
- [x] Roles list page (name, description, users, permissions, isSystem badge)
- [x] Role form dialog (create/edit)
- [x] Role permissions dialog (catalog grouped by module, checkbox grid + template presets, save via `POST /roles/:id/permissions`)
- [x] Route `/app/roles` gated by `role.manage` + nav item (Community section)
- [x] Office-holder role templates (Treasurer/Secretary/Operations) in the permissions dialog
- [x] Reuse/re-export existing `useRoles` from users feature (keep `CreateUserDialog` working)
- [x] **Guard role template** — `visitor.view/create/check-in/check-out/cancel` + `maintenance.view` + `facility.view` + `dashboard.view` (guards log in via Users page with this role)

### Phase 2 — Household ownership & 1-account-per-household (user's design; backend-first)
- [x] Backend `auth.service.ts register()` ownership rule: match existing household by **block + lot**; found + `ACTIVE` + has an owner (active User whose `resident.householdId` = household) → `409` "This unit already has an account. Contact your administrator."; found + `INACTIVE` → reuse the **same** household, reactivate → `ACTIVE`, create new resident+user on it (inherits the household's assessment/payment history); not found → create as today
- [x] Backend household status transition: `ACTIVE → INACTIVE` auto-deactivates the linked account (User status → INACTIVE); `INACTIVE → ACTIVE` flips status only (data cleanup/imports)
- [x] Backend finance scoping: `assessments.service.findAll` + payments list filter to the caller's **own household** when a plain Member (no assessment/payment manage perm); managers (President/Treasurer) see all
- [x] Frontend register page: friendly error for occupied units
- [x] Frontend Users page: show linked household/status where useful

### Phase 3 — Missing tenant pages (non-login Staff + module gaps; sequential, each verified)
- [x] Residents — `/app/residents` (`resident.view`): status/gender filters, household picker, detail w/ household
- [x] Households — `/app/households` (`household.view`): search/status, residentCount, detail lists residents, **ACTIVE/INACTIVE toggle + current owner/account holder display (confirm dialog warns on deactivation)**
- [x] Vehicles — `/app/vehicles` (`vehicle.view`): type/status/resident filters, resident picker, plate uppercase
- [x] Visitors — `/app/visitors` (`visitor.view`): check-in / check-out / cancel actions
- [x] Staff — `/app/staff` (`staff.view`): role/status filters, maintenanceCount (non-login records)
- [x] Maintenance — `/app/maintenance` (`maintenance.view`): assign to Staff / start / resolve / cancel; staff picker
- [x] Documents — `/app/documents` (`document.view`): upload via `POST /uploads`, publish/archive, download
- [x] Messaging — `/app/messages` (`message.view`): inbox/outbox tabs, compose (recipient picker, empty = broadcast), mark-read
- [x] Reports — `/app/reports` (`reports.export`): export cards, CSV download, payments month picker
- [x] Analytics — `/app/analytics` (`analytics.view`): **install recharts**; financial KPIs, trends, status-breakdown charts
- [x] Audit Logs — `/app/audit-logs` (`audit.view`): list (action/entity/date filters), summary cards, purge (`keepDays`)
- [x] Community Settings — restructure `/app/settings` into **Tabs**: Profile (existing) + Community (`settings.view` read / `settings.manage` edit; general/notifications/security/billing keys via `GET /settings` + bulk `PUT /settings`)
- [ ] Note: reservations stay as a tab in Facilities (no extraction) · scoped options endpoints deferred (only if a real role combo needs them later)

### Phase 4 — Platform admin gaps (platform settings deferred)
- [x] Plans management — `/admin/plans` (list incl. inactive via `includeInactive`, create/edit dialog, toggle active) gated by `subscription.manage`; add to `ADMIN_NAV` in admin-shell
- [x] Platform settings — **deferred to Phase 6** (see below)

### Phase 5 — Minor concept fixes (all approved)
- [x] Access token in memory — `token.ts` module-level access token (refresh only persisted); `api.ts` interceptors use memory; bootstrap `ensureAccessToken()` (refresh-first) before `/auth/me`; per-tab session (no cross-tab sharing)
- [x] Rate limiting — install `@nestjs/throttler`, global `ThrottlerGuard` (~100 req/min/IP), confirm no interference with guards/Swagger
- [x] Event `UPCOMING` — add to `EventStatus` + migration; `publish()` → `UPCOMING` when future-dated (else `PUBLISHED`), `complete()` from either; update filters/badges/reports `status-options`/analytics
- [x] Announcement `REVIEW` — add to `AnnouncementStatus` + migration; flow `DRAFT → REVIEW → PUBLISHED` (reuse `announcement.publish`); update filters/badges/publish action

### Phase 6 — Registration gate + Platform settings + Platform analytics (all approved)
- [x] Registration gate — per-community `registrationMode` setting (`security` group, default `OPEN`); `auth.service.register()` reads it and returns 403 when `CLOSED`; Security select (OPEN/CLOSED) in Community Settings
- [x] Platform settings store — `PlatformSetting` model + migration `20260808185730_add_platform_settings`; `platform-settings` module (`GET/PUT /admin/platform-settings`, platform-admin gated); defaults `platformName` + `supportEmail`; `/admin/settings` page + Settings nav item
- [x] Platform analytics — `GET /admin/analytics` (12-month growth: communities/users/revenue + subscription status breakdown); recharts AreaChart + donut PieChart on `/admin/overview`
- [x] Housekeeping — renamed `Cummunity-os-concept.md` → `docs/Community-os-concept.md`; fixed PROGRESS.md references + stale notes

### Production readiness — Approved plan (P1–P4, code-first)
Decisions: code-ready first, deploy later · few communities (single instance, no queue) · payments stay manual · full testing (backend unit + e2e, frontend vitest, Playwright).

#### Phase P1 — Security hardening
- [ ] Auth cookies — refresh token → `httpOnly` + `Secure` + `SameSite=Strict` cookie (DB-backed rotation stays); access token stays in-memory; CSRF guard on cookie-bearing routes; frontend switches to `credentials`, drops refresh-token localStorage
- [ ] Throttling — per-route `@Throttle` on `/auth/login`, `/register`, `/forgot-password` (keep the global rule)
- [ ] Uploads — new `Upload` model (communityId, uploadedById, module, access) + migration; JWT-gated, community-scoped streaming replaces static `/uploads`; mimetype + magic-byte allowlist; block SVG/HTML; keep 10MB cap
- [ ] Headers/secrets — Helmet + HSTS + CSP; remove docker-compose fallback secrets (`CommunityOSSecretKey`); cookie/`APP_URL` vars in `validateEnv` + `.env.example`
- [ ] Auth hardening — login lockout (failed-attempt tracking) + password strength validation

#### Phase P2 — Correctness
- [ ] Wire dormant settings — `eventReminders`/`pollReminders` → `notifyMany()` on publish; `guestPassAutoApprove` → auto-approve on visitor create
- [ ] Tenant-scoping audit — sweep `prisma.*` queries for missing `communityId` filters; fix + add an isolation test
- [ ] Audit-log gap review — confirm all mutating routes are covered

#### Phase P3 — Testing + CI
- [ ] Backend unit — register gate (OPEN/CLOSED/ownership), settings merge, billing sweep, upload gating
- [ ] Backend e2e (supertest + test DB) — auth lifecycle with cookies, tenant isolation, uploads auth
- [ ] Frontend vitest + Testing Library — session bootstrap, login, register, settings save
- [ ] Playwright smoke — login → dashboard → register gate → admin settings
- [ ] CI (GitHub Actions) — typecheck, lint, build, backend tests, frontend tests, migration dry-run; add frontend eslint/prettier (missing today)

#### Phase P4 — Reliability + code quality
- [ ] Structured JSON logs + request-ID middleware; `/health` + `/ready`; Sentry wiring
- [ ] Index audit on hot queries
- [ ] Complete `.env.example` + runbooks (backup/restore, deployment checklist)
- [ ] Frontend lint config (none exists)

**Explicitly deferred:** real hosting/TLS, object storage (auth-gated local disk is fine at this scale), payment gateway, email verification (until APPROVAL mode), queueing/Redis.

---

## Known gaps / notes (not yet scheduled)
- Events have no RSVP/attendee model
- Registration gate is binary OPEN/CLOSED (no APPROVAL/pending-account workflow yet)
- Command Menu (Ctrl+K) — concept "Later Phase 2" item, not built
- Potential future capabilities (require explicit approval): online payments / GCash-Maya, QR visitor management, mobile apps, push notifications, advanced analytics, AI assistance, automated reports, cloud file storage

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

### 2026-08-09 — Phase 1: Roles & Permissions UI (complete)
- Built `src/features/roles/`: `types/role.ts` (PermissionItem, RoleListItem, RoleDetail, inputs), `validation/role.ts` (zod roleFormSchema), `services/roles.ts` (rolesService CRUD + assignPermissions; permissionsService with multi-page `all()` fetch for the 122-perm catalog), `hooks/use-roles.ts` (roleKeys, useRolesList/useRole/useAllPermissions/useCreateRole/useUpdateRole/useAssignRolePermissions/useDeleteRole; re-exports existing `useRoles` from users feature so CreateUserDialog is untouched), `constants/role-templates.ts` (Treasurer/Secretary/Operations/Guard presets built from the PERMISSIONS catalog).
- Components: `role-form-dialog.tsx` (create/edit), `role-permissions-dialog.tsx` (catalog grouped by module with module select-all, permission checkbox grid, template preset buttons, clear-all, save via `POST /roles/:id/permissions`), `pages/roles-page.tsx` (search, isSystem badge, user/permission counts, permissions/edit/delete row actions).
- Wired `/app/roles` route gated by `role.manage` in `router.tsx`; added "Roles" nav item (ShieldCheck) to the Community section in `nav-items.tsx`.
- Verified: frontend `npx tsc --noEmit` exit 0, `vite build` passes, backend `nest build` clean; live-tested against running backend — login as demo admin, list roles (President=122 perms, Member=20), create a role, assign the 8-code Guard template (8/8 matched), delete the test role. All endpoints work.

### 2026-08-09 — Phase 2: Household ownership & 1-account-per-household (complete)
- Backend `auth.service.ts register()` ownership rule (block+lot matching): occupied ACTIVE unit → 409 "This unit already has an account. Contact your administrator."; INACTIVE unit → reuse same household (reactivate → ACTIVE) + new resident/user, inheriting the household's assessment/payment history; no match → create new household. Also the remove() cleanup path frees household ownership.
- Backend household status transition in `households.service.ts`: `ACTIVE → INACTIVE` auto-deactivates the linked owner account (User status → INACTIVE); `INACTIVE → ACTIVE` flips status only.
- Backend finance scoping: `assessments.service.findAll` + `payments.service.findAll` resolve the caller's household from `req.user.resident` and filter to it when the user lacks the assessment/payment manage permission; managers (President/Treasurer) see all.
- Frontend register page: inline destructive `Alert` on 409 (occupied unit) alongside the existing toast.
- Frontend Users page: backend list now includes `resident.household` (block/lot/unit/address/status); new "Unit" column (`hideBelow: lg`) shows the unit label, dimmed when the household is inactive; `UserListItem` type updated.
- Verified: frontend `npx tsc --noEmit` exit 0, backend `npx tsc --noEmit` clean + eslint no errors; live-tested — register on occupied unit → 409; register on INACTIVE unit → reuse household + reactivate; admin deactivates household → linked user auto-INACTIVE; login as plain Member → sees only own household's assessments (1) & payments (1), admin sees all (3).

### 2026-08-09 — Phase 3.1: Residents page (complete)
- Backend `resident.service.ts`: `findAll` select now includes `household` (id, block, lot, unit, address, status) and `findOne` includes the household relation too.
- Frontend `src/features/residents/`: `types/resident.ts`, `services/residents.ts` (CRUD vs `/residents`), `hooks/use-residents.ts` (keys + useResidents/useResident/useCreateResident/useUpdateResident/useDeleteResident), `validation/resident.ts` (residentFormSchema; `.optional().or(z.literal(''))` pattern), `components/household-select.tsx` (popover search combobox reusing `financeHouseholdsService.options` from the finance feature, gated by `assessment.view`), `components/resident-form-dialog.tsx` (create/edit with household picker, gender/civilStatus/birthDate), `components/resident-details-dialog.tsx` (household info + status actions), `pages/residents-page.tsx` (status/gender filters, search, unit column, pagination).
- Wired `/app/residents` route (`resident.view`) in `router.tsx`; added Residents nav item (UserRound) to the Community section.
- Verified: frontend `npx tsc --noEmit` exit 0, backend `nest build` clean; live-tested — list returns 6 total, detail returns embedded household (block/lot/address/status).

### 2026-08-09 — Phase 3.2: Households page (complete)
- Backend `households.service.ts`: `findOne` residents select now includes linked `user` (id, referenceNumber, firstName, lastName, status, `account.email` — email lives on Account, not User).
- Frontend `src/features/households/`: `types/household.ts`, `services/households.ts`, `hooks/use-households.ts`, `validation/household.ts` (refine: at least one of block/lot/unit/address), `components/household-details-dialog.tsx` (owner/account-holder display from `residents.find(r => r.user)`, residents list with "Has account" badge, ACTIVE/INACTIVE toggle with nested confirm dialog warning on deactivation, delete confirm), `components/household-form-dialog.tsx`, `pages/households-page.tsx` (search, status filter, unit label, residentCount, edit).
- Wired `/app/households` route (`household.view`); added Households nav item (Home).
- Verified: frontend tsc exit 0; live-tested — 5 households, detail returns owner user + email/status (e.g. family1@test.com INACTIVE, family2@test.com ACTIVE).

### 2026-08-09 — Phase 3.3: Vehicles page (complete)
- Backend needed no changes.
- Frontend `src/features/vehicles/`: `types/vehicle.ts`, `services/vehicles.ts`, `hooks/use-vehicles.ts`, `validation/vehicle.ts` (plate uppercased via `z.transform`), `components/vehicle-form-dialog.tsx` (reuses `ResidentSelect` from facilities for the owner picker), `pages/vehicles-page.tsx` (search, status + type filters, uppercase mono plate).
- Wired `/app/vehicles` route (`vehicle.view`); added Vehicles nav item (Car).
- Verified: frontend tsc exit 0; live-tested — 3 vehicles listed with owner residents.

### 2026-08-09 — Phase 3.4: Visitors page (complete)
- Backend needed no changes (endpoints already exist: create/list/findOne/update/delete + check-in/check-out/cancel patches, all gated by `visitor.*` permissions).
- Frontend `src/features/visitors/`: `types/visitor.ts` (VisitorStatus EXPECTED/CHECKED_IN/CHECKED_OUT/CANCELLED), `services/visitors.ts` (list/get/create + checkIn/checkOut/cancel), `hooks/use-visitors.ts` (useVisitors/useVisitor/useCreateVisitor + action hooks with toasts + invalidate), `validation/visitor.ts`, `components/visitor-form-dialog.tsx` (name/phone/purpose/remarks + ResidentSelect host picker), `pages/visitors-page.tsx` (search, status filter, entry/exit times, row actions Check in / Check out / Cancel shown by status + permission).
- Added visitor status variants (EXPECTED=warning, CHECKED_IN=success, CHECKED_OUT=muted) to `status-badge.tsx`; wired `/app/visitors` route (`visitor.view`); added Visitors nav item (DoorOpen).
- Verified: frontend `npx tsc --noEmit` exit 0; live-tested — list returns 2 visitors with host resident + vehicle relation; created a visitor (EXPECTED, host Juan Dela Cruz), cancelled it (CANCELLED), deleted it (total back to 2).

### 2026-08-09 — Phase 3.5: Staff page (complete)
- Backend needed no changes (CRUD at `/staff`, list includes `maintenanceCount`, detail includes `assignedMaintenances`).
- Frontend `src/features/staff/`: `types/staff.ts` (StaffRole SECURITY/MAINTENANCE/CLEANING/ADMIN/OTHER, StaffStatus, StaffListItem w/ maintenanceCount, StaffDetail w/ assignedMaintenances), `services/staff.ts`, `hooks/use-staff.ts`, `validation/staff.ts`, `components/staff-form-dialog.tsx` (create/edit with role/hire-date selects), `components/staff-details-dialog.tsx` (assigned maintenance list, ACTIVE/INACTIVE toggle, edit, delete with inline confirm), `pages/staff-page.tsx` (search, role + status filters, assignments column, name row opens details).
- Wired `/app/staff` route (`staff.view`); added Staff nav item (Briefcase) to the Operations section.
- Verified: frontend `npx tsc --noEmit` exit 0; live-tested — list returns 3 staff with maintenanceCount; full CRUD round-trip (create → detail → update role/notes → delete); detail for Dante Flores returns 2 assigned maintenances (MNT-000001 IN_PROGRESS, MNT-000003 ASSIGNED).

### 2026-08-09 — Phase 3.6: Maintenance page (complete)
- Backend needed no changes (CRUD + `assign`/`start`/`resolve`/`cancel` patches at `/maintenance`, list includes facility + assignedTo relations).
- Frontend `src/features/maintenance/`: `types/maintenance.ts` (MaintenanceCategory/Priority/Status enums), `services/maintenance.ts` (list/get/create/update/assign/start/resolve/cancel/remove), `hooks/use-maintenance.ts`, `validation/maintenance.ts`, `components/staff-select.tsx` (searchable popover, reuses staff list, filters ACTIVE), `components/facility-select.tsx` (reuses facilities list), `components/maintenance-form-dialog.tsx` (create/edit with category/priority/facility/staff pickers, cost, scheduled date), `components/maintenance-details-dialog.tsx` (detail grid + status actions Assign/Start/Resolve/Cancel gated by permission + status, inline assign panel, delete confirm), `pages/maintenance-page.tsx` (search, status + priority filters, title row opens details).
- Added maintenance status variants (ASSIGNED=warning, ON_HOLD=warning, RESOLVED=success) to `status-badge.tsx`; wired `/app/maintenance` route (`maintenance.view`); added Maintenance nav item (Wrench) to the Operations section.
- Verified: frontend `npx tsc --noEmit` exit 0; live-tested — list returns 3 requests with facility/assignedTo; full lifecycle on MNT-000002 (assign→Elena Mercado, start→IN_PROGRESS, resolve→RESOLVED) then restored to OPEN/unassigned via PUT; create (PLUMBING, Covered Court, cost 500) + delete round-trip.

### 2026-08-09 — Phase 3.7: Documents page (complete)
- Backend needed no changes (CRUD + `publish`/`archive` patches at `/documents`; file upload at `/uploads` served statically from `./uploads`, requires `upload.file` permission).
- Frontend `src/features/documents/`: `types/document.ts` (DocumentCategory POLICY/MINUTES/FINANCIAL/NOTICE/FORM/OTHER, DocumentStatus DRAFT/PUBLISHED/ARCHIVED, UploadFileResult), `services/documents.ts` (CRUD + publish/archive + `upload(file)` via FormData), `hooks/use-documents.ts`, `validation/document.ts`, `components/document-form-dialog.tsx` (create with file-attach dropzone → uploads then creates; edit = metadata only), `pages/documents-page.tsx` (search, category + status filters, file-size/extension column, Open/Publish/Archive row actions).
- Added `uploadFile: 'upload.file'` to PERMISSIONS constants; added `formatFileSize` + `getFileExtension` to `lib/format.ts`; added PUBLISHED=success to `status-badge.tsx`; wired `/app/documents` route (`document.view`); added Documents nav item (FileText) to the Communication section.
- Verified: frontend `npx tsc --noEmit` exit 0; live-tested — list returns 3 seeded documents; multipart upload via curl → `/uploads/<uuid>.txt`; create (NOTICE) → publish (PUBLISHED) → archive (ARCHIVED) → delete round-trip, total back to 3.

### 2026-08-09 — Phase 3.8: Messaging page (complete)
- Backend needed no changes (CRUD + `PATCH /messages/:id/read` at `/messages`; `mailbox=inbox` = my recipient OR broadcast `recipientId=null`, `mailbox=outbox` = my sender; broadcast composed by leaving `recipientId` empty).
- Frontend `src/features/messages/`: `types/message.ts` (MessageStatus SENT/DELIVERED/READ, MessageListItem w/ sender+recipient refs, CreateMessageInput), `services/messages.ts` (list/get/create/remove/markAsRead), `hooks/use-messages.ts`, `validation/message.ts`, `components/recipient-select.tsx` (searchable popover reusing `useUsers`, shows referenceNumber + roles), `components/message-form-dialog.tsx` (compose: recipient picker with "leave blank to broadcast" hint, subject max 200, body), `pages/messages-page.tsx` (Inbox/Outbox tabs, search + status filter, subject/body-preview column, Mark read row action gated to not-read + not-self-broadcast, delete w/ confirm; Outbox shows "All members" for broadcasts).
- Added message status variants (SENT=secondary, DELIVERED=info, READ=success) to `status-badge.tsx`; wired `/app/messages` route (`message.view`); added Messages nav item (MessageSquare) to the Communication section.
- Verified: frontend `npx tsc --noEmit` exit 0; live-tested — admin inbox (1 seed broadcast) + outbox (3: broadcast SENT, water advisory DELIVERED, dues reminder READ); Pedro→admin direct message visible in admin inbox; mark-read → READ + readAt; admin marking own broadcast → 409 (UI gating hides that action); Pedro inbox sees the broadcast; search + status filter work; create+delete round-trip leaves counts at seed (admin inbox 1, outbox 3, Pedro inbox 2).

### 2026-08-09 — Phase 3.9: Reports page (complete)
- Backend needed no changes (9 export endpoints at `/reports/:type?format=csv|json`, `reports.export` gate; payments accepts `month=YYYY-MM`; CSV set via `Content-Disposition: attachment; filename="<type>.csv"`).
- Frontend `src/features/reports/`: `services/reports.ts` (`downloadReport(type, month)` — axios `responseType: 'blob'`, filename parsed from `content-disposition`, object-URL anchor click), `pages/reports-page.tsx` (9 export cards grid: Residents/Households/Payments/Assessments/Complaints/Vehicles/Maintenance/Visitors/Events; Payments card has a `type="month"` picker; per-card Export CSV button with loading state + success/error toasts; empty state for users without `reports.export`).
- Wired `/app/reports` route (`reports.export`); added Reports nav item (FileSpreadsheet) to the Intelligence section.
- Verified: frontend `npx tsc --noEmit` exit 0; live-tested — residents CSV returns `Content-Type: text/csv` + `filename="residents.csv"` with correctly quoted rows; payments JSON `month=2026-08` → 3 payments; `status-options` returns all 8 entity keys.

### 2026-08-09 — Phase 3.10: Analytics page (complete)
- Backend needed no changes (recharts was **already installed** in frontend deps; endpoints at `/analytics/financial?month=YYYY-MM`, `/analytics/trends?months=N`, `/analytics/status-breakdown`, all gated by `analytics.view`).
- Frontend `src/features/analytics/`: `types/analytics.ts` (FinancialAnalytics, TrendRow, StatusBreakdown entity map), `services/analytics.ts`, `hooks/use-analytics.ts` (useFinancialAnalytics/useTrends/useStatusBreakdown with query keys + placeholderData), `pages/analytics-page.tsx` — month picker (defaults current month), 4 KPI StatCards (total billed / collected / outstanding / collection rate, currency-formatted) with loading skeletons, **recharts** Revenue trends AreaChart (billed vs collected, 6/12/24-month selector), Activity trends LineChart (complaints vs maintenance), and a Status breakdown donut PieChart with a 10-module selector + percentage legend (empty state when zero records).
- Wired `/app/analytics` route (`analytics.view`); added Analytics nav item (ChartPie) to the Intelligence section.
- Verified: frontend `npx tsc --noEmit` exit 0; live-tested — financial `month=2026-08` returns period (billed 2400/count 2, collected 3700/count 2, pending 1200/count 1) + overall (totalBilled 4900, collected 2500, outstanding 2400, collectionRate 51, 3 assessments, ISSUED=3); trends 6-month rows filled for 2026-08 (billed 2400, collected 3700, maintenance 3); status-breakdown returns all 10 entity buckets (payments PENDING=1/CONFIRMED=2, assessments ISSUED=3).

### 2026-08-09 — Phase 3.11: Audit Logs page (complete)
- Backend fix `audit.interceptor.ts`: `req.path` includes the global `/api` prefix, so `pathSegments[0]` was always `api` (entity filter useless). Now filters out the `api` segment → entity records the real module (e.g. `visitors`). Verified: new POST/DELETE visitor records show `entity=visitors`; `?entity=visitors` filter returns exactly those. (`npx nest build` clean.)
- Frontend `src/features/audit-logs/`: `types/audit-log.ts` (AuditLogListItem w/ actor ref, AuditSummary), `services/audit-logs.ts` (list/summary/purge; summary mapped to `{ action|entity, count }`), `hooks/use-audit-logs.ts`, `components/purge-audit-logs-dialog.tsx` (keepDays number input, destructive confirm, toast with deleted count), `pages/audit-logs-page.tsx` (summary cards: total + POST/PUT/PATCH/DELETE; search + action/entity selects (entity options derived from summary w/ counts) + from/to date inputs; table columns When/Actor/Action/Entity/Entity ID/IP; purge button gated by `audit.manage`).
- Added HTTP-method badge variants (POST=success, PUT=info, PATCH=warning, DELETE=destructive) to `status-badge.tsx`; wired `/app/audit-logs` route (`audit.view`); added Audit Logs nav item (History) to the Intelligence section.
- Verified: frontend `npx tsc --noEmit` exit 0; live-tested — summary returns total 31 + byAction/byEntity (visitors=2, audit-logs=1 post-fix); purge `keepDays=10000` deletes 0 (safe); action filter PATCH=7; date filter `from=2026-08-08` → 31.

### 2026-08-09 — Phase 3.12: Community Settings tabs (complete)
- Backend needed no changes (`GET /settings` returns merged defaults+stored entries with `configured` flag; `PUT /settings` bulk-updates via `{ settings: [{key, value, group}] }`).
- Frontend `src/features/settings/`: `types/setting.ts` (SettingResult, UpdateSettingEntry, SettingValue), `services/settings.ts` (all/updateMany vs `/settings`), `hooks/use-settings.ts` (useSettings/useUpdateSettings), `components/community-settings.tsx` (per-group cards General/Notifications/Security/Billing driven by a field config: text/textarea/email/number/switch/select renderers, inputs disabled + read-only notice when no `settings.manage`, bulk Save via PUT), and `pages/settings-page.tsx` restructured into **Profile** (existing content) + **Community** tabs.
- Verified: frontend `npx tsc --noEmit` exit 0; live-tested — `GET /settings` returns 11 merged entries across 4 groups (communityName configured, logoUrl + guestPassAutoApprove unconfigured defaults); bulk `PUT /settings` set communityName + pollReminders=false, verified persisted, then restored originals.

### Phase 3 — complete (2026-08-09): all 12 missing tenant pages built and live-verified. Residents, Households, Vehicles, Visitors, Staff, Maintenance, Documents, Messaging, Reports, Analytics, Audit Logs, Community Settings. One backend fix in this phase: `audit.interceptor.ts` entity extraction now skips the global `/api` prefix (was logging `entity=api` for every record).

### 2026-08-09 — Phase 4: Plans management (complete)
- Backend needed no changes (`/subscription-plans` CRUD already exists, gated by `subscription.view`/`subscription.manage`; plans are platform-global, `code` unique, soft delete via `deletedAt` + `isActive=false`; the platform admin user carries the President role which includes all permissions, so the admin shell can call these endpoints).
- Frontend `src/features/admin/`: `types/plan.ts` (AdminPlan, AdminPlanInput, BillingCycle), `validation/plan.ts` (zod planSchema; price ≥ 0, maxUsers ≥ 1, code lowercased via transform), `services/plans.ts` (list vs `/subscription-plans` with `includeInactive`, create/update/remove), `hooks/use-plans.ts` (usePlans/useCreatePlan/useUpdatePlan/useDeletePlan), `components/plan-form-dialog.tsx` (create/edit: name/code/description/price PHP/billing cycle select/max users/max residents/sort order, features as one-per-line textarea, isActive switch), `pages/admin-plans-page.tsx` (search, "Include inactive" toggle, table with price/cycle/limits/features/Active badge, row menu Edit/Delete, delete via AlertDialog with prevent-default-close).
- Wired `/admin/plans` route in `router.tsx`; added Plans nav item (CreditCard) to `ADMIN_NAV` in `admin-shell.tsx`.
- Verified: frontend `npx tsc --noEmit` exit 0; live-tested — create (YEARLY, 49.50, 2 features) → update price 59.75 + description → findOne verified → search `test-plan-x` hit 1 → delete → search hit 0.

### 2026-08-09 — Phase 5: Minor concept fixes (complete)
- **5.1 Access token in memory** — `lib/token.ts` rewritten: access token is a module-level variable (never persisted; refresh token stays in localStorage), shared `refresh()` singleton replaces `api.ts`'s local one, `ensureAccessToken()` refreshes first before `/auth/me` in `useSession`. Result: no cross-tab access-token sharing; each tab does a refresh-first bootstrap. Verified frontend tsc + build exit 0.
- **5.2 Rate limiting** — installed `@nestjs/throttler` (6.5.0); `ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }])` + global `ThrottlerGuard` via `APP_GUARD` in `app.module.ts`. Verified live: 100 consecutive requests → 200 OK, next 5 → HTTP 429 (guards/Swagger unaffected).
- **5.3 Event UPCOMING** — added `UPCOMING` to `EventStatus` in `schema.prisma` + migration `20260808184259_add_upcoming_review_statuses`; `events.service.publish()` now sets `UPCOMING` when `startAt` is in the future, else `PUBLISHED`; `complete()` already accepts either. Frontend: `EventStatus` type + STATUS_FILTERS + detail dialog now use `StatusBadge`. Verified live: future event publish → UPCOMING → complete → COMPLETED; past event publish → PUBLISHED.
- **5.4 Announcement REVIEW** — added `REVIEW` to `AnnouncementStatus` (same migration); flow `DRAFT → REVIEW → PUBLISHED` reuses existing `POST /announcements/:id/publish`. Frontend: type + STATUS_FILTERS + Publish action shown for DRAFT and REVIEW + form dialog "publish immediately" checkbox for both. Verified live: create REVIEW → publish → PUBLISHED with `publishedAt` set.
- Reports `status-options` and analytics `status-breakdown` already iterate `Object.values(...)` of the Prisma enums, so they pick up the new statuses automatically.
- Note: `prisma generate` hit a Windows DLL file lock (`query_engine-windows.dll.node` EPERM) while the dev server held it; resolved by the user restarting the backend, then regenerate succeeded.

### 2026-08-09 — Phase 6: Registration gate + Platform settings + Platform analytics + Housekeeping (complete)
- **6.1 Registration gate** — backend `settings.service.ts`: added `registrationMode` (default `OPEN`) to the `security` group in `SETTING_DEFAULTS`. Backend `auth.service.ts register()`: after resolving the community, reads the `registrationMode` setting and throws 403 "Registration is closed for this community. Contact your administrator." when `CLOSED`. Frontend `community-settings.tsx`: added a Security-group `registrationMode` select (OPEN/CLOSED) reusing the existing select renderer. Verified live: CLOSED → register → 403; OPEN → register succeeds (USR-000006, cleaned up via admin delete); setting persisted.
- **6.2 Platform settings** — schema: new `PlatformSetting` model (key unique, value Json, group, updatedBy) + migration `20260808185730_add_platform_settings` + `updatedPlatformSettings` back-relation on User. New module `src/modules/platform-settings/` (service mirroring `SettingsService` merge/upsert pattern; controller at `GET/PUT /admin/platform-settings` gated by `JwtAuthGuard + PlatformAdminGuard + @PlatformAdmin()`); registered in `app.module.ts`. Defaults: `platformName` (CommunityOS), `supportEmail`. Frontend `features/admin/`: `types/platform-settings.ts`, `services/platform-settings.ts`, `hooks/use-platform-settings.ts`, `pages/admin-platform-settings-page.tsx` (field-config inputs + bulk Save); `/admin/settings` route + Settings (gear) nav item in `admin-shell.tsx`. Verified live: GET returns 2 merged defaults, PUT round-trip persisted `configured=true`, restored defaults.
- **6.3 Platform analytics** — backend `admin.service.ts analytics()`: last-12-month growth buckets (new communities, new users, PAID-invoice revenue) + subscription status groupBy; `GET /admin/analytics` in `admin.controller.ts`. Frontend: `AdminAnalytics` types in `types/api.ts`, `fetchAdminAnalytics` + `useAdminAnalytics`, and recharts AreaChart (communities/users growth) + donut PieChart (subscription status) on `admin-overview-page.tsx`. Verified live: 12 monthly rows (2026-08: 1 community, 5 users, 99 revenue), subscriptionStatus ACTIVE=1.
- **Housekeeping** — renamed `Cummunity-os-concept.md` → `docs/Community-os-concept.md` (git mv); fixed the 3 PROGRESS.md filename references; removed stale notes (roles-UI, concept-file typo) and stale "Partial/deviates" entries (token-in-memory, community-settings, platform-settings UI all since built); known gaps now: Events RSVP/attendee model + binary (non-approval) registration gate.
- Verified: frontend `npx tsc --noEmit` + `vite build` exit 0; backend `npx tsc --noEmit` + `nest build` clean; all endpoints re-tested through the :5173 dev proxy. Note: migration's `prisma generate` hit the same Windows DLL EPERM (dev server running); backend was restarted, `prisma generate` re-ran clean, both servers relaunched detached (backend log `%TEMP%\opencode\backend.log`, frontend log `%TEMP%\opencode\frontend.log`).

### 2026-08-09 — Production-readiness plan recorded (P1–P4, code-first)
- User confirmed the direction shift: build for production, not demo. Decisions recorded: code-ready first, deploy later · few communities (single instance, no queue) · payments stay manual · full testing.
- Replaced the tentative "Phase 7 — Recommendations" block in the Todo section with the approved **P1–P4 production plan** (Security hardening / Correctness / Testing + CI / Reliability + code quality), including an explicit "deferred" list (hosting/TLS, object storage, payment gateway, email verification, queueing).
- Cleaned the Known gaps section: removed the dormant-settings line (now scheduled under P2); kept RSVP, APPROVAL registration mode, Command Menu, and the future-capabilities list.
- Grounding research confirmed: no `Upload` model exists (uploads are unauthenticated static files), `NotificationsService.notifyMany()` exists (ready to wire dormant settings), Jest is configured but only scaffold specs exist, frontend has no lint/test tooling, docker-compose contains hardcoded fallback secrets.





always read this md and add todo and progress here 