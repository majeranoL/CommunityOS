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
- Frontend: `npm run dev` in `Community-os-frontend` (proxies `/api` → :3000)
- Typecheck: `npx tsc --noEmit` (frontend) · Build: `npx nest build` (backend)
- Frontend tests: `npm run test` (vitest) · E2E smoke: `npm run test:e2e` in `Community-os-frontend` (Playwright; auto-starts backend via `nest build` + `node dist/src/main.js` and vite dev — or reuses already-running servers; requires Postgres up + seeded DB: `admin@communityos.com` / `Admin123!`)
- Migrations: `npx prisma migrate dev` in backend (requires DB running)

---

## Progress — Built and verified

### Platform / infrastructure
- [x] Multi-tenant core: `Community` = tenant, all services scoped by `communityId`
- [x] Auth: login / register / refresh (rotating) / logout / forgot+reset password / `/auth/me`
- [x] Access token (JWT, 15m) + refresh token (7d) persisted in localStorage; axios single-flight 401→refresh→retry
- [x] RBAC: `User → Role → Permission` (per-community), `JwtAuthGuard` + `PermissionsGuard` + `@Permissions()`
- [x] Seed: demo community, 118-permission catalog, President (all) + Member (16) + Renter (16) system roles, `admin@communityos.com` platform admin
- [x] Response envelope `{ success, message, data }` + pagination envelope
- [x] Soft deletes, audit-log interceptor (all mutating requests), uploads (auth-gated `Upload` model + local disk, streaming)
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

Re-verified on this session against the actual codebase. All claims in this file confirmed accurate (React 19.2.8 / Vite 8.2 / router-dom 7.18; 118 permission codes in `prisma/permissions.ts` after B8 removed the 4 `message.*` codes; Member role = 16 perms; frontend routes match the list above).

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
- [x] Auth cookies — refresh token → `httpOnly` + `Secure` + `SameSite=Strict` cookie (DB-backed rotation stays); access token stays in-memory; CSRF origin/referer guard on the cookie-bearing routes (`refresh`/`logout`); frontend on `credentials`, no refresh-token localStorage *(already implemented — verified, no changes needed)*
- [x] Throttling — per-route `@Throttle` on `/auth/login`, `/register`, `/forgot-password` (keep the global rule) *(already implemented — 5/60s on login/register/forgot/reset, global 100/min; verified)*
- [x] Uploads — new `Upload` model (communityId, uploadedById, module, filename, originalName, mimetype, size) + migration `20260810041439_add_upload_model`; JWT-gated, community-scoped streaming (`GET /api/uploads/:id`) replaces static `/uploads`; mimetype + magic-byte allowlist (pre-existing `file-validation.ts`, now enforced) + SVG/HTML blocked; 10MB cap kept; cascade cleanup of row + file on document delete/replace; `access` field dropped (single consumer, JWT-gated)
- [x] Headers/secrets — Helmet + HSTS + CSP; remove docker-compose fallback secrets (`CommunityOSSecretKey`); cookie/`APP_URL` vars in `validateEnv` + `.env.example`
- [x] Auth hardening — login lockout (failed-attempt tracking) + password strength validation *(both already implemented — Account `failedLoginAttempts`/`lockedUntil` lockout in `auth.service.ts`; `PASSWORD_RULE` on register/reset-password/create-user/provision-community; verified — marking done)*

#### Phase P2 — Correctness
- [x] Wire dormant settings — `eventReminders`/`pollReminders` → `notifyMany()` on publish; `guestPassAutoApprove` → auto-approve on visitor create *(already implemented — events.service.ts `publish()` reads `eventReminders`, polls.service.ts `notifyVotersIfEnabled()` reads `pollReminders`, visitors.service.ts `create()` reads `guestPassAutoApprove`; verified, no changes needed)*
- [x] Tenant-scoping audit — swept all 36 services: 30 scoped (`communityId` filter on every prisma query), 6 intentionally global (auth/jwt/upload-token/upload-serve/provision/admin) with no tenant data cross-leak. Zero gaps found. Added isolation regression test `src/modules/documents/documents.service.spec.ts` (5 tests: cross-community access throws NotFound, no mutation occurs, upload cleanup stays scoped) — all pass.
- [x] Audit-log gap review — `AuditInterceptor` is registered globally via `APP_INTERCEPTOR` (audit-logs.module.ts), so every mutating POST/PUT/PATCH/DELETE on authenticated routes is covered; non-authenticated routes (register/login/refresh/forgot/reset/provision) have no `req.user` and are intentionally skipped.

#### Phase P3 — Testing + CI
- [x] Backend unit — register gate (OPEN/CLOSED/ownership), settings merge, billing sweep, upload gating. Added 4 specs (21 tests): `auth.service.spec.ts` (CLOSED→Forbidden no-op, default-OPEN, explicit-OPEN, active-household-owner→Conflict, INACTIVE household reactivation, email lowercase); `settings.service.spec.ts` (mergeDefaults: stored values win, configured flags, custom keys, sorted output — made `SettingsService.findAll` return merged settings sorted by key to match DB `orderBy`); `billing.service.spec.ts` (overdue marking, expired vs renewed, PAST_DUE never auto-renews, zero-price renews without invoice); `uploads.service.spec.ts` (valid PNG accepted, blocked ext, disallowed mimetype, HTML-in-text, empty file). Suite: 8 passed / 29 tests. `nest build` clean, eslint 0 errors.
- [x] Backend e2e (supertest + test DB) — full suite built and green (4 suites / 15 tests). New test infra: `test/setup-test-db.ts` auto-creates `community_os_test` (via Prisma raw on the maintenance DB), applies all migrations, seeds 2 plans; `test/setup-e2e.ts` (jest setupFiles) points `DATABASE_URL` at the test DB; `test/bootstrap-app.ts` mirrors `main.ts` (global `api` prefix, cookie-parser, validation pipe, prisma filter) and disables throttling. Specs: `app.e2e-spec.ts` (public smoke), `auth.e2e-spec.ts` (signup → refresh-cookie session, `/me`, refresh rotation, logout invalidation, CLOSED register gate → 403, duplicate unit ownership → 409), `isolation.e2e-spec.ts` (cross-community read/update/delete of an event → 404 with no mutation; list scoping), `uploads.e2e-spec.ts` (401 unauthenticated, blocked extension → 400, upload + stream back, cross-community stream → 404). `npm run test:e2e` idempotent. eslint 0 errors.
- [x] Frontend vitest + Testing Library — session bootstrap, login, register, settings save *(built in B12/B9; `src/features/auth/__tests__/auth.test.tsx` + `login-page.test.tsx` + `src/features/settings/__tests__/settings.test.tsx` — verified `vitest run` 10/10)*
- [x] Playwright smoke — login → dashboard → register gate → admin settings
- [x] CI (GitHub Actions) — typecheck, lint, build, backend tests (unit + e2e), frontend tests, migration dry-run; frontend eslint/prettier config landed first (done 2026-08-11)

#### Phase P4 — Reliability + code quality
- [ ] Structured JSON logs + request-ID middleware; `/health` + `/ready`; Sentry wiring
- [ ] Index audit on hot queries
- [ ] Complete `.env.example` + runbooks (backup/restore, deployment checklist)
- [x] Frontend lint config — `eslint.config.js` (tseslint + `react-hooks` recommended-latest + `react-refresh` + prettier), lint runs `0 errors` (45 pre-existing warnings) — done 2026-08-11

**Explicitly deferred:** real hosting/TLS, object storage (auth-gated local disk is fine at this scale), payment gateway, queueing/Redis.

#### New batch — 2026-08-11 (approved; code-first, sequential, verify after each)
- [x] **B8 — Remove messaging system + sidebar Notifications item** — delete backend `messaging` module + `Message`/`MessageStatus` schema + message.* perms + dashboard `unreadMessages`; delete frontend `features/messages/`, route, nav items, `PERMISSIONS.message*`, Secretary template entries, `unreadMessages` type. KEEP notifications feature (navbar bell + `/app/notifications` page).
- [x] **B11 — Fix suspend-login bug** — `login()`/`refresh()` reject non-ACTIVE `user.status` (PENDING/SUSPENDED/INACTIVE/REJECTED messages); suspend revokes the user's active sessions + refresh tokens.
- [x] **B12 — Registration: gender + SMTP OTP + PENDING approval** — `UserStatus` += `PENDING`/`REJECTED`; new `OtpVerification` model; `POST /auth/otp/send` (email OTP via existing MailService/nodemailer); register requires verified OTP, creates Account+User **PENDING** (no session); gender field on register (stored on Resident); Approve/Deny (reuse `user.update`) in Users page.
- [x] **B9 — Replace "Mark deceased" with "Mark moved out"** — `POST /residents/:id/move-out` sets `MOVED_OUT` + `movedOutAt`, deactivates linked account (frees unit for new owner, history kept); `remove` also deactivates; `DECEASED` removed from enum/type/filter/UI; ConfirmDialog; `MOVED_OUT` badge; household owner = ACTIVE holder only.
- [x] **B13 — Roles dialog hides platform-scope modules** — exclude Communities/Subscriptions/Billing/Invoices (13 codes) from the role-permissions dialog; count only assignable (President shows 109).
- [x] **B10 — Officer-created limited renter accounts** — seed/provision system `Renter` role (restricted perms); `POST /users/renters` (gate `user.create`) creates Account (temp password + forgot-password email) + Resident + User ACTIVE + Renter role, deactivates current holder; "Assign renter" action in Household details.
- [ ] Then **P3/P4** (frontend vitest, Playwright, CI) + original feature backlog B0–B7.

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

### 2026-08-10 — Production P1.4: Headers/secrets (complete); P1.1/P1.2/P1.5 verified already-implemented
- **P1.4** Backend: installed `helmet` (8.3.0, bundled types); `src/main.ts` adds `app.use(helmet())` (default strict CSP `script-src 'self'`, HSTS on HTTPS, `nosniff`, `X-Frame-Options`, Referrer-Policy — Swagger UI unaffected because all its scripts are external same-origin files, no inline script). `docker-compose.yml`: removed the hardcoded fallback secrets — `JWT_SECRET`/`REFRESH_SECRET` now use `${VAR:?…}` (compose fails fast without them); added `COOKIE_SECURE` + `APP_URL` passthrough. `.env.example`: added `COOKIE_SECURE=false` + `NODE_ENV=development` (with comment). `src/config/env.ts`: `validateEnv` now also warns when `APP_URL`/`COOKIE_SECURE`/`NODE_ENV` are unset (falls back to documented defaults).
- Verified: backend `npx tsc --noEmit` exit 0, `nest build` clean, eslint clean; live smoke 8/8 — server boots, JSON responses carry CSP/nosniff/X-Frame-Options/Referrer-Policy, Swagger loads + serves bundle + init.js under strict CSP; re-ran the P1.3 uploads smoke (12/12) confirming helmet doesn't break login/upload/streaming/cascade-cleanup.
- **P1.1 (auth cookies)** verified already-implemented: `auth-cookies.ts` sets refresh token `httpOnly` + `Secure` (COOKIE_SECURE/NODE_ENV) + `SameSite=Strict` path `/api/auth`; `CsrfGuard` (origin/referer allowlist) guards `refresh`/`logout`; frontend `token.ts` keeps only an in-memory access token (no refresh-token localStorage), `api.ts` + refresh calls use `withCredentials`. No changes needed.
- **P1.2 (throttling)** verified already-implemented: per-route `@Throttle` 5/60s on `/auth/login`, `/register`, `/forgot-password`, `/reset-password`; global `ThrottlerGuard` 100/min retained. No changes needed.
- **P1.5 (auth hardening)** verified already-implemented: Account `failedLoginAttempts`/`lockedUntil` lockout (`MAX_FAILED_ATTEMPTS`/`LOCKOUT_MS`) in `auth.service.ts` with `recordFailedAttempt`/`clearFailedAttempts`; `PASSWORD_RULE` strength validator applied on register/reset-password/create-user/provision-community. No changes needed.
- Note: PROGRESS.md now reflects P1.1–P1.5 all `[x]`; only the P1 remaining items after this are none — **Phase P1 complete**.
- Housekeeping: the P1.3 work-log entry (below) plus this entry record the uploads overhaul and the P1 security hardening respectively.

### 2026-08-10 — Production P1.3: Uploads overhaul (complete)
- Backend `prisma/schema.prisma`: new `Upload` model (`communityId`, `uploadedById`, `module`, `filename` unique, `originalName`, `mimetype`, `size`, `createdAt`) + relations (Cascade on user delete) + migration `20260810041439_add_upload_model` + `prisma generate`.
- Backend `src/modules/uploads/`: rewritten `uploads.service.ts` (`uploadFile`/`uploadFiles` persist to `uploads/<uuid><ext>`, create the `Upload` row, return `{ id, url: /api/uploads/:id, filename, originalName, mimetype, size }`; `getUploadForCommunity` community-scoped; new `removeUploadForCommunity` unlinks file + deletes row) and `uploads.controller.ts` (`POST /uploads`, `POST /uploads/multiple` gated by `upload.file`, multer memory storage + `fileFilter` allowlist with `BadRequestException`; `GET /uploads/:id` JWT + community-scoped stream, `inline` for `module=document` else `attachment`, `nosniff`). `uploads.module.ts` now imports `PrismaModule`.
- Backend `src/main.ts`: removed static `express.static('/uploads')` serving + unused fs/path imports; `void bootstrap()`.
- Backend `src/modules/documents/documents.service.ts`: on `remove()` and on `update()` when the file URL is replaced, cascade-deletes the old upload (row + disk file) only when no other live document references it; `documents.module.ts` imports `UploadsModule`.
- Backend `prisma/seed.ts`: creates real `Upload` rows + placeholder files for the 3 seeded documents (fileUrl = `/api/uploads/<id>`); seed cleanup now `upload.deleteMany()` + wipes the `uploads/` dir (`rm` recursive) so reseeds stay clean.
- Frontend `vite.config.ts`: dropped the `/uploads` proxy (only `/api` remains).
- Frontend `features/documents/services/documents.ts`: new `openFile(doc)` — authenticated blob fetch of `/uploads/<id>` → object URL → new tab (old `window.open(fileUrl)` would 401); `documents-page.tsx` uses it with an error toast.
- Verified: frontend + backend `npx tsc --noEmit` exit 0; `nest build` clean; eslint no errors (pre-existing `req.user` `any` warnings only); live smoke test 12/12 — login → upload → stream w/ auth 200 → stream w/o auth 401 → create doc → delete doc → upload row 404 + physical file gone, seed files intact; seed re-run leaves only the 3 seeded files.
- User confirmed the direction shift: build for production, not demo. Decisions recorded: code-ready first, deploy later · few communities (single instance, no queue) · payments stay manual · full testing.
- Replaced the tentative "Phase 7 — Recommendations" block in the Todo section with the approved **P1–P4 production plan** (Security hardening / Correctness / Testing + CI / Reliability + code quality), including an explicit "deferred" list (hosting/TLS, object storage, payment gateway, email verification, queueing).
- Cleaned the Known gaps section: removed the dormant-settings line (now scheduled under P2); kept RSVP, APPROVAL registration mode, Command Menu, and the future-capabilities list.
- Grounding research confirmed: no `Upload` model exists (uploads are unauthenticated static files), `NotificationsService.notifyMany()` exists (ready to wire dormant settings), Jest is configured but only scaffold specs exist, frontend has no lint/test tooling, docker-compose contains hardcoded fallback secrets.

### 2026-08-11 — New batch planned + recorded (Step 0; no code changed yet)
- Recorded the approved batch in the Todo section: **B8** messaging removal, **B11** suspend-login fix, **B12** registration (gender + SMTP OTP + PENDING approval), **B9** move-out/remove-resident, **B13** roles dialog platform-scope filter, **B10** officer-created limited renter accounts — then P3/P4 + B0–B7 backlog.
- Decisions locked this session: move-out deactivates the account + frees the unit + keeps history + removes DECEASED; rentals keep one account per household with officer-created limited renter accounts; role-permission dialog hides platform-scope modules only; OTP is email-based via SMTP (nodemailer, existing MailService); approve/deny reuses `user.update`.
- Grounding findings: login/refresh only check `Account.status` while suspend only flips `User.status` → suspended users can still log in (B11). `AccountStatus.PENDING` + `Account.emailVerifiedAt` already exist but are unused. Frontend register returns an authenticated session today (will change to pending-submission). `StatusBadge` already knows PENDING/REJECTED variants. Role-permission dialog counts the full 122-code catalog; President is granted all 122 (13 are platform-scope: Communities/Subscriptions/Billing/Invoices).

### 2026-08-11 — B8 messaging removal (done)
- Backend: deleted `src/modules/messaging/`; `app.module.ts` unregistered `MessagingModule`; schema dropped `Message` model + `MessageStatus` enum + `Community.messages` + `User.sentMessages/receivedMessages`; `prisma/permissions.ts` removed all 4 `message.*` codes; `seed.ts` removed `MessageStatus` import, `message.deleteMany()`, member `message.*` codes, and the whole MESSAGES seed section; `communities.service.ts` removed `message.*` from `PROVISION_MEMBER_PERMISSIONS`; `dashboard.service.ts` removed `MessageStatus` import, the `unreadMessages` count query, destructure slot, return field, and the now-unused `userId` param (controller call updated).
- Migration: created `20260811000000_remove_messaging` (drop table + type) manually via `migrate diff` + `db execute` + `migrate resolve --applied` (migrate dev is blocked in non-interactive shells; winpty needs a real console).
- Frontend: deleted `src/features/messages/`; `router.tsx` removed MessagesPage + route; `nav-items.tsx` removed the Messages and Notifications sidebar items (+ unused `Bell`/`MessageSquare` imports; notifications stay reachable via topbar bell → `/app/notifications`); `constants/permissions.ts` removed `message*`; `role-templates.ts` removed message perms (President) + "messages" from Secretary description; `features/dashboard/types/dashboard.ts` removed `unreadMessages`.
- Verified: frontend `npx tsc --noEmit` exit 0, backend `nest build` clean, `prisma generate` clean, `prisma migrate status` = "Database schema is up to date", `prisma db seed` success.

### 2026-08-11 — B11 suspend-login fix (done)
- `auth.service.ts`: new private `ensureActiveUser(user)` helper — throws tailored `UnauthorizedException` for non-ACTIVE `UserStatus` (PENDING approval / SUSPENDED / INACTIVE / REJECTED); `login()` and `refresh()` now call it after the account checks (previously only `Account.status` was checked, so a suspended user could still log in).
- `users.service.ts`: new private `revokeUserSessions(accountId)` — revokes ACTIVE sessions (`SessionStatus.REVOKED`) + unexpired refresh tokens (`revokedAt`). Called in `update()` when status changes away from ACTIVE, and in `remove()` (account deactivation).
- Schema: `UserStatus` extended with `PENDING` + `REJECTED`; migration `20260811000001_user_status_pending_rejected` applied (2× `ALTER TYPE ADD VALUE`). `prisma generate` + `nest build` clean; `prisma migrate status` = up to date.

### 2026-08-11 — B12 registration: gender + SMTP OTP + PENDING approval (done)
- Schema: new `OtpPurpose` enum (`REGISTER`) + `OtpVerification` model (`email`, `purpose`, hashed `code`, `expiresAt`, `consumedAt`, `attempts`, indexes on email+purpose and expiresAt); migration `20260811000002_add_otp_verification` applied/resolved.
- Backend auth: `POST /auth/otp/send` (`SendOtpDto` = email + communityId, throttled 5/min) → `sendRegistrationOtp()` (409 if email already registered, invalidates prior unconsumed OTPs, generates 6-digit code stored as sha256, emails via `MailService.sendRegistrationOtpEmail`); private `verifyRegistrationOtp()` (expiry + max 5 attempts + hash compare, consume on match). `register()` now: requires `otpCode` + optional `gender`, verifies the OTP, creates Account + User as **PENDING** (no session), stores gender on Resident, returns "Registration submitted for approval…".
- Backend users: `update()` sets Account `ACTIVE` + `emailVerifiedAt` when approving (`status === ACTIVE`), enabling the Users-page Approve/Deny flow via existing `user.update`.
- Frontend: `register-page.tsx` added gender `Select` (Male/Female/Other) + "Send code" section (button enabled once email + community are filled) + 6-digit OTP input; success now shows a toast and redirects to `/login` instead of auto-login; `authService` gained `sendOtp()` and `register` now sends `gender`/`otpCode` (returns `ApiEnvelope<null>`); `useSendOtp` hook added; `registerSchema` + `RegisterValues` extended; `user-details-dialog.tsx` added Approve/Deny (PENDING) + Approve (REJECTED) buttons with `warning`/`destructive` badge variants; `user.ts` status union += `PENDING`/`REJECTED`; auth test updated (pending-approval flow, no session).
- Verified: frontend `tsc --noEmit` exit 0, `vitest run src/features/auth` 8/8 pass, `npm run build` (vite) OK; backend `nest build` clean, `prisma migrate status` = up to date (25), `prisma db seed` success.

### 2026-08-11 — B9 move-out / remove-resident (done)
- Schema: `ResidentStatus` dropped `DECEASED`; `Resident` gained `movedOutAt DateTime?`. Migration `20260811000003_resident_moved_out` (prepends an `UPDATE` mapping legacy `DECEASED` → `MOVED_OUT`, then Prisma's recreate-enum pattern + `ADD COLUMN`) applied/resolved.
- Backend `resident.service.ts`: new private `deactivateLinkedAccount(user)` (Account → `DISABLED`, User → `INACTIVE`, revokes ACTIVE sessions + refresh tokens); new `moveOut()` — 404 if missing, 400 if already `MOVED_OUT`, deactivates linked account, sets `MOVED_OUT` + `movedOutAt`, returns updated resident; `remove()` now also deactivates the linked account before soft-deleting; `findOne()` select includes `movedOutAt`. New route `POST /residents/:id/move-out` (`resident.update`).
- Frontend: `resident.ts` type dropped `DECEASED` (+ `movedOutAt` on detail); `residentsService.moveOut()` + `useMoveOutResident` hook; `resident-details-dialog.tsx` "Mark moved out" button opens a `ConfirmDialog` (destructive, warns account deactivation + unit freed), shows "Moved out" date row for `MOVED_OUT`, badge now maps `MOVED_OUT`; `residents-page.tsx` filter dropped `DECEASED`; `StatusBadge` gained `MOVED_OUT: muted`.
- Verified: frontend `tsc --noEmit` exit 0, `vitest run` 10/10 pass, `npm run build` OK; backend `nest build` clean, `prisma generate` clean, `prisma migrate status` = up to date (26), `prisma db seed` success. Live endpoint smoke test deferred (dev servers stopped by user choice).

### 2026-08-11 — B13 roles dialog platform-scope filter (done)
- `role-permissions-dialog.tsx`: `PLATFORM_SCOPE_MODULES` = Communities/Subscriptions/Billing/Invoices (13 codes total: 4+2+5+2). The assignable catalog now excludes those modules from the grouped list, the counter shows only assignable permissions (President: 109/109), and applying a template replaces only the assignable set while preserving any hidden platform-scope grants. Added an inline note explaining platform-scope modules are managed by platform admins. Frontend-only — no schema/backend change.
- Verified: `tsc --noEmit` exit 0, `npm run build` OK, `vitest run` 10/10 pass.

### 2026-08-11 — B10 officer-created limited renter accounts (done)
- Backend `src/modules/users/`: new `dto/create-renter.dto.ts` (`CreateRenterDto`: names, email, phone, optional gender, `householdId`); `users.service.ts` new `createRenter(communityId, dto)` — cleans inputs (capitalize/trim/lowercase), duplicate-email → 409, validates household (community-scoped, not deleted) → 404, resolves system `Renter` role → 404 if absent, generates `USR-*/RES-*` numbers (max-based, matching existing generators), random temp password (bcrypt, never revealed), then in a `$transaction`: deactivates the current ACTIVE holder of the unit (Account → DISABLED, User → INACTIVE, revokes ACTIVE sessions + unexpired refresh tokens), creates Account (ACTIVE) + Resident (ACTIVE, linked to the household) + User (ACTIVE, `residentId` set) + `userRole` → Renter; then signs a 30m `password_reset` JWT (same payload as `forgotPassword`) and emails a set-password link via new `MailService.sendAccountCreatedEmail`. `users.controller.ts` new `POST /users/renters` gated by `user.create`; `users.module.ts` now imports `MailModule` + `JwtModule.register` (same secret/signOptions as auth).
- Backend provisioning: `communities.service.ts` `provision()` creates a system **Renter** role (same 16 `PROVISION_MEMBER_PERMISSIONS` as Member) in the same transaction; `prisma/seed.ts` creates the Renter role + assigns the member permission codes.
- Frontend: `features/users` — `CreateRenterInput` type, `usersService.createRenter()`, `useCreateRenter` hook (toasts + invalidates users + households); `features/households/components/create-renter-dialog.tsx` (firstName/middle/last/email/phone/gender form, zod `validation/create-renter.ts`); `household-details-dialog.tsx` gained an "Assign renter" button in the Account holder section — shown only when the unit is ACTIVE, has no holder yet, and the caller has `user.create`.
- Verified: backend `nest build` clean, eslint 0 errors (pre-existing `req.user` `any` warnings only); frontend `tsc --noEmit` exit 0, eslint clean; reset-token payload/route matches the existing `forgotPassword`/`resetPassword` flow. (Note: backend `tsc --noEmit` still reports pre-existing B12-era type errors in `src/modules/auth/auth.service.spec.ts` + `test/auth.e2e-spec.ts`; those files are compiled by jest, not `nest build`, and are untouched by B10.)

### 2026-08-11 — DB reset: keep only the Superadmin (done)
- Provisioned the Renter role into the existing live community non-destructively (temp script, `rolePermission` createMany), then — per user request — wiped all demo data while keeping only the Superadmin. Kept: `admin@communityos.com` Account + System Administrator User (`isPlatformAdmin`), its anchor Community (required by schema: `User.communityId` + `formatUser` reads `user.community`), the 3 system roles (President/Member/Renter) + all 118 permissions + rolePermissions, the superadmin's userRole, the 3 subscription plans, and 2 platform settings. Deleted: 2 demo users/accounts, 5 households, 4 residents, 4 facilities, 3 vehicles, 2 visitors, 3 staff, 3 maintenance, 3 assessments, 3 payments, 3 documents, 3 uploads, 3 events, polls, 2 invoices, the demo subscription, 9 settings, and all sessions/refresh tokens/OTPs. Temp scripts cleaned up.

### 2026-08-11 — P3 Playwright smoke suite (done)
- New `Community-os-frontend/playwright.config.ts`: testDir `e2e`, chromium only, 1 worker, `test:e2e` npm script; auto-starts both servers via `webServer` (backend `npm run build && node dist/src/main.js` on `/api/docs`, frontend `npm run dev` on :5173) with `reuseExistingServer` locally (CI restarts clean). Added `pg` + `@types/pg` devDeps; `npx playwright install chromium`.
- New `e2e/db.ts` test helper (raw `pg`, reads `DATABASE_URL` from backend `.env` when the var is unset): seeds a valid registration OTP (`gen_random_uuid()` id + sha256 code — Prisma `@default(uuid())` is client-side, the DB column has no default), seeds a minimal ACTIVE tenant **Member** user (reuses the superadmin's password hash so it can log in), flips the community `registrationMode` Setting (JSON-encoded value) with prior-state capture/restore, and cleans up created accounts/households. All inserts supply `updatedAt`/`id` explicitly (`@updatedAt` and `uuid()` have no DB defaults).
- New `e2e/smoke.spec.ts` — 4 tests, all green:
  1. **tenant login → dashboard** — seeds a Member user, logs in via the UI, asserts `/app/dashboard` + greeting heading + resident KPI card.
  2. **register page renders** — heading, Send code, Submit for approval.
  3. **registration gate** — seeds OTP, sets `registrationMode=CLOSED` → `POST /api/auth/register` returns 403 "Registration is closed"; restores `OPEN` with a fresh OTP → 201 "Registration submitted for approval"; restores the prior mode + deletes the created account/household/OTPs (verified zero DB leftovers).
  4. **platform settings** — superadmin login lands on `/admin/overview` (Decision 12: platform admin redirect), `/admin/settings` renders heading + `#setting-platformName` + Save settings.
- Pitfalls fixed along the way: superadmin redirects to the **platform shell** (`/admin/overview`), not the tenant dashboard; the app's password inputs are wrapped in a div inside `FormControl`, so the shadcn `id` lands on the div and the input's accessible name falls back to the placeholder `••••••••` (login test targets the placeholder — logged as a minor a11y issue, left unfixed); dashboard greeting is time-based ("Good morning/afternoon/evening"), assertion matches the name only; vitest `exclude` in `vite.config.ts` now skips `e2e/**` so `npm run test` doesn't pick up Playwright specs; `.gitignore` += `playwright-report` + `test-results`.
- Verified: `npx playwright test` 4/4 pass (against a freshly built backend + vite dev), DB left clean (0 smoke rows, no leftover `registrationMode`), frontend `npx tsc --noEmit` exit 0, `eslint e2e` 0 errors, `vitest run` 10/10 pass.

### 2026-08-11 — Frontend lint: fixed all 9 errors + added eslint config (done)
- Root cause: the frontend had no working eslint setup; this session established `eslint.config.js` (tseslint + `react-hooks` recommended-latest + `react-refresh` + `eslint-config-prettier`) and fixed **every** error it surfaced (9 errors → 0).
- `react-hooks/set-state-in-effect` (6 files, 8 calls) — refactored the "load data → copy into local state" anti-pattern to React's recommended **key-remount + lazy `useState`** approach:
  - `admin-platform-settings-page.tsx` + `community-settings.tsx` — extracted inner form components (`PlatformSettingsForm` / `CommunitySettingsForm`) with lazy init from the query data, keyed by a serialized snapshot of the settings so identical refetches don't remount; parent gates on `isLoading || !data`.
  - `role-permissions-dialog.tsx` — extracted `PermissionsEditor` keyed by `role.id`, lazy `useState(() => new Set(role.permissions...))` so selections reset on every open (also fixed the old bug where reopened dialogs kept stale selections); parent renders a skeleton until the role loads.
  - `document-form-dialog.tsx` — extracted keyed `DocumentForm` mounted only while `open`; `useForm` `defaultValues` + lazy `fileUrl` replace the reset effect entirely.
  - `community-picker.tsx` — removed the `value`↔`selected` sync effect (derived `selectedItem` in render) and the `setResults([])` in the fetch effect (dropdown now gates on `open && query.trim() !== ''`; `setLoading` moved into the debounce callback).
- `react-hooks/rules-of-hooks` (announcements-page) — conditional `useHasPermission(A) || useHasPermission(B)` in a `||` chain → `useHasAnyPermission([A, B])`.
- `@typescript-eslint/no-empty-object-type` (2) — `interface Payment extends PaymentListItem {}` → `type Payment = PaymentListItem`; `interface UpdateVehicleInput extends Partial<CreateVehicleInput> {}` → type alias.
- Verified: `npm run lint` exit 0 (0 errors, 45 pre-existing warnings), `npx tsc --noEmit` exit 0, `prettier --write` on all touched files. **Unblocks the P3 CI item** (frontend lint config was a stated prerequisite).

### 2026-08-11 — Backend lint cleanup (done)
- Ran `npm run lint` (`--fix`) to clear the prettier-format errors in `src/**` + `test/**`, then fixed the 3 remaining `@typescript-eslint/no-unused-vars` errors in `src/modules/auth/auth.service.ts`: `register()` dropped its unused `ipAddress`/`userAgent` params (`register(dto: RegisterDto)`); `const createdAccount = await this.prisma.$transaction(...)` → `await this.prisma.$transaction(...)`; `auth.controller.ts` register handler simplified to `register(@Body() dto: RegisterDto) { return this.authService.register(dto); }` (removed req/res + `applySession` chain; `applySession` stays on login/refresh).
- Verified: `npx eslint "src/**/*.ts" "test/**/*.ts"` exit 0 (0 errors, 647 pre-existing `any` warnings), `npx tsc --noEmit` exit 0, unit `npm test` 29/29 (8 suites). (Backend lint is now a clean CI gate without `--fix`.)

### 2026-08-11 — Backend e2e fixes: OTP-gated registration + PENDING ownership (done)
- B12 made registration OTP-gated, which broke the pre-B12 `test/auth.e2e-spec.ts` registration tests (register returned 400 validation instead of 403/201). Fix: `test/test-helpers.ts` gained `seedRegistrationOtp(prisma, email, code)` (sha256-hashes the code, writes an `OtpVerification` row with `expiresAt` 10min; Prisma client-side `@default(uuid())`/`@default(now())` fill id/createdAt) + exported `TEST_OTP_CODE='123456'`; the CLOSED and OPEN tests now seed an OTP per email and send `otpCode`.
- Found and fixed a real B12 regression in `auth.service.ts register()`: the duplicate-unit ownership check only blocked an **ACTIVE** owner, but B12 registers users as **PENDING** → two people could register the same unit. The check now blocks `status: { in: [ACTIVE, PENDING] }` (a pending application claims the unit; REJECTED frees it).
- Verified: `npm run test:e2e` 4 suites / 15 tests all pass; `npx tsc --noEmit` exit 0; `npx eslint "src/**/*.ts" "test/**/*.ts"` exit 0; unit 29/29.

### 2026-08-11 — P3 CI: GitHub Actions workflow (done)
- Extended `.github/workflows/ci.yml` (was backend-only lint/build/test/docker) to the full approved P3 scope. All jobs Node 22 + `npm ci` (cached per project lockfile). Jobs: `backend-lint` (prisma generate + `eslint src test` **without** `--fix`), `backend-build` (prisma generate + `tsc --noEmit` + `nest build`), `backend-unit` (`npm test -- --runInBand`), `backend-e2e` (**Postgres 16 service container**; `DATABASE_URL` set; `setup-test-db.ts` auto-creates `community_os_test` on the `/postgres` maintenance DB), `migration` (`prisma validate` + `prisma migrate diff --from-empty --to-schema-datamodel ... --script` dry-run), `frontend` (lint + `vitest run` + `tsc && vite build`), `docker` (unchanged, now `needs: [backend-lint, backend-build, backend-unit]`). Added `concurrency: cancel-in-progress`. Backend jobs set a dummy `DATABASE_URL` env (prisma requires the datasource var resolvable).
- Verified every CI command locally first: backend eslint/tsc/unit/e2e green, `prisma validate` + `migrate diff` exit 0, frontend lint + `vitest run` 10/10 + build green; workflow YAML parses (js-yaml).



always read this md and add todo and progress here 

always read this md and add todo and progress here 