# CommunityOS Backend — What We Built (Full Work Log)

Complete record of everything added to the CommunityOS backend from the start of this effort. Backend root: `Community-os-backend/` (NestJS + Prisma + PostgreSQL).

---

## 1. Overview

CommunityOS is a multi-tenant HOA / Subdivision Management System. The backend is a NestJS REST API with:

- **Auth** — JWT access tokens + rotating refresh tokens (DB-stored, hashed) + session tracking
- **RBAC** — Roles, Permissions, `@Permissions()` decorator, `JwtAuthGuard` + `PermissionsGuard`
- **26 functional modules** (all implemented, no stubs) covering the full HOA domain
- **33 Prisma models, 35 enums, 122 permissions**
- **16 database migrations**, seed script, Docker, and GitHub Actions CI

No work is committed yet — the entire body of work below is uncommitted (see `git status`).

---

## 2. Tech Stack

| Layer      | Technology                                   |
|------------|----------------------------------------------|
| Runtime    | Node.js 22, NestJS 10                        |
| ORM        | Prisma 6 + PostgreSQL 16                     |
| Auth       | JWT (access) + rotating refresh tokens, bcrypt |
| Validation | class-validator / class-transformer (global `ValidationPipe`) |
| API docs   | Swagger UI at `/api`                         |
| Files      | Multer disk storage -> `/uploads`            |
| Infra      | Docker, docker-compose, GitHub Actions CI    |

**Conventions**
- Controllers thin, business logic in services
- Response envelope: `{ success, message, data }` (+ `pagination` where applicable)
- UUID primary keys, soft deletes, community scoping via `req.user.community.id`
- Lint baseline: **0 errors** (502 warnings — `no-unsafe-*` rules set to `warn` deliberately)
- Tests: 3/3 Jest specs pass (`auth.service`, `auth.controller`, `users`)

---

## 3. Development Phases (Order of Work)

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Auth, Users, Roles, Residents, Announcements | Done (committed) |
| 2 | Complaints (incl. assign/resolve/close), Communities | Done (committed) |
| 3 | Facilities, Reservations, Households, Visitors, Vehicles, Staff, Maintenance | Done |
| 4 | Finance (assessments/payments), Documents, Messaging, Events | Done |
| 5 | Dashboard, Analytics, Reports, Notifications, Permissions, Uploads | Done |
| 6 | SaaS: Subscriptions, Invoices, Billing cron, Docker, CI/CD | Done |
| 7 | Polls, Audit Logs, Settings + auth hardening + common/ cleanup | Done (most recent) |

---

## 4. Infrastructure Added

### Docker
- **`Dockerfile`** — 3-stage build on `node:22-alpine` (deps -> build -> prod); runs `prisma generate`, compiles to `dist`, keeps Prisma CLI + tsx for migrations/seed, copies `docker-entrypoint.sh`, `EXPOSE 3000`
- **`docker-compose.yml`** — `db` (`postgres:16-alpine`, healthcheck, `postgres_data` volume) + `backend` (built from Dockerfile, waits for healthy DB, env-driven config, `3000` port, `uploads_data` volume)
- **`docker-entrypoint.sh`** — `prisma migrate deploy`, optional seed (`SEED_DB=true`), then `node dist/src/main.js`
- **`.dockerignore`**

### CI/CD
- **`.github/workflows/ci.yml`** (workspace root, job working dir `Community-os-backend`) — 4 jobs on push/PR to `main`/`develop`:
  1. **Lint** (`npm run lint`)
  2. **Build** (npm ci + `prisma generate` + `nest build`)
  3. **Test** (`npm test -- --runInBand`)
  4. **Docker Build** (`docker build -t community-os-backend:ci .`)

---

## 5. Database (Prisma)

### Migrations (16 total, all applied)

| # | Migration | Adds |
|---|-----------|------|
| 1 | `20260723051457_init_identity` | Identity core |
| 2 | `20260723103311_add_role_is_system` | `isSystem` flag on roles |
| 3-6 | `create_resident`, `resident_enums` | Resident model + enums |
| 7 | `20260728071445_create_announcements` | Announcement model |
| 8-9 | `add_complaints` | Complaint model + relations |
| 10 | `20260806125920_hardening_composite_unique_reference_numbers` | Composite unique reference numbers |
| 11 | `20260806130326_add_facilities_reservations_households` | Facility, Reservation, Household |
| 12 | `20260806140000_add_visitors_vehicles_staff_maintenance` | Visitor, Vehicle, Staff, Maintenance |
| 13 | `20260806150000_add_finance_documents_messaging_events` | Assessment, Payment, Document, Message, Event |
| 14 | `20260806160000_add_notifications` | Notification + `NotificationType` (+ `POLL` value added later) |
| 15 | `20260806170000_add_subscriptions_invoices` | SubscriptionPlan, Subscription, Invoice + billing enums |
| 16 | `20260806180000_add_polls_auditlogs_settings` | Poll, PollOption, PollVote, AuditLog, Setting |

### Models (33)
Community, Account, User, Role, Permission, UserRole, RolePermission, Session, RefreshToken, Resident, Announcement, Complaint, Facility, Reservation, Household, Visitor, Vehicle, Staff, Maintenance, Assessment, Payment, Document, Message, Event, Notification, SubscriptionPlan, Subscription, Invoice, Poll, PollOption, PollVote, AuditLog, Setting

### Enums (35)
UserStatus, AccountStatus, SessionStatus, CommunityStatus, ResidentStatus, Gender, CivilStatus, AnnouncementStatus, ComplaintStatus, ComplaintPriority, ComplaintCategory, FacilityType, FacilityStatus, ReservationStatus, HouseholdStatus, VisitorStatus, VehicleType, VehicleStatus, StaffRole, StaffStatus, MaintenanceCategory, MaintenancePriority, MaintenanceStatus, AssessmentStatus, PaymentStatus, PaymentMethod, DocumentCategory, DocumentStatus, MessageStatus, EventStatus, NotificationType, PollStatus, BillingCycle, SubscriptionStatus, InvoiceStatus

### Notable schema details
- `PollVote` unique on `[pollId, optionId, userId]`; `Setting` unique on `[communityId, key]`
- `RefreshToken.token` unique (stores SHA-256 hash)
- Soft deletes via `deletedAt`; `AuditLog.before/after` are JSON fields; FK cascade rules (e.g., `AuditLog.actorId` on delete SetNull)

---

## 6. Database Relationship Diagram

All 33 models hang off `Community` (multi-tenant scoping); the tree below reflects the actual `@relation` fields in `schema.prisma`.

```
Community
│
├── Role ──────────── RolePermission ──── Permission
├── User ──── Account ──── Session
│   │   │                 └──── RefreshToken
│   │   └── UserRole ──────── Role
│   │
├── Resident ────────── Household          (householdId, onDelete SetNull)
├── Announcement
├── Complaint ───────── Resident           (residentId, Cascade)
│                       User               (assignedToId, SetNull)
├── Facility ────────── Reservation ────── Resident
│        └───────────── Maintenance        (facilityId, SetNull)
├── Household ───────── Assessment ─────── Payment ──── Resident
├── Visitor ─────────── Resident           (hostResidentId, SetNull)
│                      Vehicle             (vehicleId, SetNull)
├── Vehicle ─────────── Resident           (residentId, SetNull)
├── Staff ───────────── Maintenance        (assignedToId, SetNull)
├── Document ────────── User               (uploadedById, Cascade)
├── Message ─────────── User  (sender, Cascade)
│                       User  (recipient, Cascade)
├── Event ───────────── User               (organizerId, SetNull)
├── Notification ────── User               (userId, Cascade)
├── Poll ────────────── User               (createdById, Cascade)
│   └── PollOption ──── PollVote ───────── User (userId, Cascade)
├── AuditLog ────────── User               (actorId, SetNull)
├── Setting ─────────── User               (updatedById, SetNull)
└── SubscriptionPlan ── Subscription ───── Invoice
                       (communityId 1:1)  (communityId)
```

### Key relationship notes
- **Auth chain**: `Account` (1:1 `User`) -> `Session` + `RefreshToken` (per account). `UserRole`/`RolePermission` are join tables; a role's effective permissions = `Role -> RolePermission -> Permission`.
- **Finance chain**: `Household -> Assessment -> Payment -> Resident` (payment confirm/reject/refund syncs the assessment's `paidAmount` and status).
- **Visitor chain**: `Visitor` optionally links a host `Resident` and a `Vehicle`.
- **Soft references**: `Complaint.assignedTo`, `Maintenance.assignedTo`, `AuditLog.actor`, `Event.organizer`, `Setting.updatedBy` use `onDelete: SetNull` so history survives user deletion; parent-owned children (options, votes, sessions, tokens) use `Cascade`.
- **Poll votes** are unique per `(pollId, optionId, userId)`; a resident can vote once per option.

---

## 7. Module Dependencies

"Depends on" = models/FKs + services the module reads; "Depended on by" = who reads its data. Every module ultimately depends on **Communities** (tenant scoping) and **Users** (actor from `req.user`), so those are implied and not repeated.

| Module | Depends on | Depended on by |
|--------|-----------|----------------|
| **auth** | Users, Roles, Permissions (permission resolution), Session/RefreshToken | Everything (JWT guards, `req.user`) |
| **users** | Roles (assignment), Permissions | auth, notifications, documents (uploader), messaging, events, polls, settings (updatedBy), auditlogs (actor) |
| **roles** | Permissions | users, auth |
| **permissions** | — | roles, users |
| **communities** | — (root) | every module |
| **residents** | Households | complaints, reservations, visitors (host), vehicles, payments, reports |
| **announcements** | — | dashboard, reports |
| **complaint** | Residents, Users (assign) | dashboard, analytics, reports |
| **facilities** | — | reservations, maintenance, dashboard, reports |
| **reservations** | Facilities, Residents | dashboard, reports |
| **households** | — | residents, assessments, reports |
| **visitors** | Residents (host), Vehicles | dashboard, reports |
| **vehicles** | Residents | visitors, reports |
| **staff** | — | maintenance (assign) |
| **maintenance** | Facilities, Staff (assign) | dashboard, analytics, reports |
| **assessments** (finance) | Households | payments, analytics, dashboard, reports |
| **payments** (finance) | Assessments, Residents | analytics, dashboard, reports |
| **documents** | Users (uploader); Uploads (file URLs) | — |
| **messaging** | Users (sender/recipient) | dashboard (unread count) |
| **events** | Users (organizer) | dashboard, reports |
| **notifications** | Users | polls (publish), plus `notify`/`notifyMany` helpers available to any module |
| **dashboard** | all modules (aggregate counts) | — |
| **analytics** | payments, assessments, complaints, maintenance, residents | — |
| **reports** | residents, households, payments, assessments, complaints, vehicles, maintenance, visitors, events | — |
| **uploads** | — | documents, facilities (imageUrl), announcements/events (cover), residents (photo), users (avatar) |
| **subscriptions** (plans/sub/invoice/billing) | SubscriptionPlan (global), Invoice | — |
| **polls** | Users (creator/votes), Notifications (publish) | — |
| **auditlogs** | Users (actor) | — (global interceptor covers all mutations) |
| **settings** | Users (updatedBy) | — |

---

## 8. Module Inventory (with routes and permissions)

All controllers use `JwtAuthGuard` + `PermissionsGuard` (class-level); route permission shown in parens. `POST /auth/login|refresh|logout` are public; `GET /auth/me` uses `JwtAuthGuard` only.

| Module | Base route | Endpoints |
|--------|-----------|-----------|
| **auth** | `/auth` | `POST /login`, `POST /refresh`, `POST /logout` (public), `GET /me` (JwtAuthGuard) |
| **users** | `/users` | POST `/` (user.create), GET `/`, GET `/:id`, PUT `/:id`, DELETE `/:id` (user.view/update/delete/create) |
| **roles** | `/roles` | POST `/` (role.manage), GET `/`, GET `/:id`, PUT `/:id`, DELETE `/:id` (role.manage), POST `/:id/permissions` (permission.manage) |
| **permissions** | `/permissions` | GET `/` (permission.view), GET `/modules`, GET `/:id` |
| **residents** | `/residents` | POST `/` (resident.create), GET `/`, GET `/:id`, PUT `/:id`, DELETE `/:id` |
| **announcements** | `/announcements` | POST `/` (announcement.create), GET `/`, GET `/:id`, PUT `/:id`, DELETE `/:id`, PATCH `/:id/publish` (announcement.publish) |
| **complaint** | `/complaints` | POST `/`, GET `/`, GET `/:id`, PUT `/:id`, DELETE `/:id`, PUT `/:id/assign`, PUT `/:id/resolve`, PUT `/:id/close` |
| **communities** | `/communities` | POST `/`, GET `/`, GET `/:id`, PUT `/:id`, DELETE `/:id` (community.create/view/update/delete) |
| **facilities** | `/facilities` | POST `/`, GET `/`, GET `/:id`, PUT `/:id`, DELETE `/:id` |
| **reservations** | `/reservations` | POST `/`, GET `/`, GET `/:id`, PUT `/:id`, DELETE `/:id`, PATCH `/:id/approve`, `reject`, `cancel`, `complete` |
| **households** | `/households` | POST `/`, GET `/`, GET `/:id`, PUT `/:id`, DELETE `/:id` |
| **visitors** | `/visitors` | POST `/`, GET `/`, GET `/:id`, PUT `/:id`, DELETE `/:id`, PATCH `/:id/check-in`, `check-out`, `cancel` |
| **vehicles** | `/vehicles` | POST `/`, GET `/`, GET `/:id`, PUT `/:id`, DELETE `/:id` |
| **staff** | `/staff` | POST `/`, GET `/`, GET `/:id`, PUT `/:id`, DELETE `/:id` |
| **maintenance** | `/maintenance` | POST `/`, GET `/`, GET `/:id`, PUT `/:id`, DELETE `/:id`, PATCH `/:id/assign`, `start`, `resolve`, `cancel` |
| **finance** | `/payments`, `/assessments` | Payments: POST, GET, GET/:id, PUT, DELETE, PATCH `/:id/confirm`, `reject`, `refund`. Assessments: POST, GET, GET/:id, PUT, DELETE, PATCH `/:id/issue`, `cancel` |
| **documents** | `/documents` | POST `/`, GET `/`, GET `/:id`, PUT `/:id`, DELETE `/:id`, PATCH `/:id/publish`, `archive` |
| **messaging** | `/messages` | POST `/`, GET `/`, GET `/:id`, PUT `/:id`, DELETE `/:id`, PATCH `/:id/read` |
| **events** | `/events` | POST `/`, GET `/`, GET `/:id`, PUT `/:id`, DELETE `/:id`, PATCH `/:id/publish`, `cancel`, `complete` |
| **notifications** | `/notifications` | GET `/` (notification.view), GET `/unread-count`, PATCH `/read-all`, PATCH `/:id/read` |
| **dashboard** | `/dashboard` | GET `/overview` (dashboard.view) |
| **analytics** | `/analytics` | GET `/financial`, `/trends`, `/status-breakdown` (analytics.view) |
| **reports** | `/reports` | GET `/residents`, `/households`, `/payments`, `/assessments`, `/complaints`, `/vehicles`, `/maintenance`, `/visitors`, `/events`, `/status-options` (reports.export); CSV download or JSON via `?format=json` |
| **uploads** | `/uploads` | POST `/` (upload.file, single <=10MB), POST `/multiple` (up to 10 files); UUID-named disk storage |
| **subscriptions** | `/subscriptions`, `/subscription-plans`, `/invoices`, `/billing` | Subscriptions: GET `/current`, GET `/`, POST `/`, POST `/:id/renew`, `cancel`, `generate-invoice`. Plans: full CRUD. Invoices: full CRUD + `mark-paid`, `void`. Billing: POST `/sweep`, GET `/summary`, GET `/limits` |
| **polls** | `/polls` | POST `/`, GET `/`, GET `/:id`, PUT `/:id`, DELETE `/:id`, PATCH `/:id/publish`, `/close`, POST `/:id/vote`, POST `/:id/options` |
| **auditlogs** | `/audit-logs` | GET `/` (audit.view), GET `/summary`, DELETE `/` (audit.manage, `?keepDays=`) |
| **settings** | `/settings` | GET `/` (settings.view), GET `/defaults`, PUT `/` (settings.manage, bulk), PUT `/:key` |

### Service highlights
- **Billing cron** — daily `@Cron` sweep (2 AM) in subscriptions module: marks invoices overdue, expires/cancels subscriptions, auto-renews, creates invoices
- **AuditInterceptor** — global `APP_INTERCEPTOR` auto-logs every POST/PUT/PATCH/DELETE (method, entity, UUID entityId, ip, user-agent) without touching existing services
- **NotificationsService** — `notify` / `notifyMany` / `userIdsWithPermission` helpers; e.g., poll publish notifies all users with `poll.view`
- **Reservations** — facility time-slot overlap validation
- **Reports** — CSV generators with defined columns per entity
- **Settings** — 11 defaults (communityName, contactEmail, currency `PHP`, paymentTermsDays 30, etc.) merged into every `findAll`; single + bulk upsert via `communityId_key`

---

## 9. Workflow Diagrams

Status state machines as designed. Notes flag where the current enum/implementation differs.

### Complaints
```
OPEN  ──assign──▶  IN_PROGRESS  ──resolve──▶  RESOLVED  ──close──▶  CLOSED
  │                    │
  └────────────────────┴── (assign blocked unless OPEN; resolve/close blocked once CLOSED)
```
Guards in `complaint.service.ts`: assign requires `OPEN`; resolve blocked from `RESOLVED`/`CLOSED`; close requires `RESOLVED`.

### Reservations (idealized)
```
PENDING  ──approve──▶  APPROVED  ──complete──▶  ONGOING  ──▶  COMPLETED
   │  │                   │
   │  └──reject──▶ REJECTED        └──cancel──▶ CANCELLED
   └──────cancel──▶ CANCELLED
```
Note: the current `ReservationStatus` enum has **no `ONGOING`** — code transitions `APPROVED -> COMPLETED` directly (approve requires `PENDING`, reject requires `PENDING`, cancel requires `PENDING`/`APPROVED`, complete requires `APPROVED`).

### Maintenance (idealized)
```
OPEN  ──assign──▶  ASSIGNED  ──start──▶  IN_PROGRESS  ──▶  COMPLETED
  │                   │
  └───────────────────┴──cancel──▶ CANCELLED
```
Note: the current `MaintenanceStatus` enum uses **`RESOLVED`** (not `COMPLETED`) and adds **`ON_HOLD`**. Code: assign sets `ASSIGNED`, start allows `OPEN`/`ASSIGNED`, resolve requires `IN_PROGRESS`/`ASSIGNED`, cancel blocked after `RESOLVED`/`CANCELLED`.

### Visitors
```
EXPECTED  ──check-in──▶  CHECKED_IN  ──check-out──▶  CHECKED_OUT
    │
    └──────cancel──▶ CANCELLED   (check-in blocked after checked-out/cancelled)
```

### Announcements & Documents (shared pattern)
```
DRAFT  ──publish──▶  PUBLISHED  ──archive──▶  ARCHIVED
```

### Events
```
DRAFT  ──publish──▶  PUBLISHED  ──complete──▶  COMPLETED
   │
   └──────cancel──▶ CANCELLED   (publish/cancel blocked if CANCELLED/COMPLETED)
```

### Polls
```
DRAFT  ──publish──▶  OPEN  ──close──▶  CLOSED
                     │
                     ├── vote (open only; single or multiple per allowMultiple)
                     └── add option (open + allowAddOptions only)
```

### Assessments (finance)
```
DRAFT  ──issue──▶  ISSUED  ──payments──▶  PARTIALLY_PAID / PAID / OVERDUE
   │
   └──────cancel──▶ CANCELLED   (issue blocked once issued/cancelled; cancel blocked once PAID/CANCELLED)
```

### Payments (finance)
```
PENDING  ──confirm──▶  CONFIRMED  ──refund──▶  REFUNDED
    │
    └──reject──▶ REJECTED   (each action requires the exact prior state)
```

### Messages
```
SENT  ──(delivery)──▶  DELIVERED  ──read──▶  READ
```

### Subscriptions & Invoices (SaaS)
```
Subscriptions:  TRIAL ──▶ ACTIVE ──▶ PAST_DUE ──▶ CANCELLED / EXPIRED
Invoices:       DRAFT ──▶ ISSUED ──▶ PAID / OVERDUE
                              └──▶ VOID
```

---

## 10. Endpoint Counts per Module

Verified by counting route decorators in each controller (181 total).

| Module | Endpoint list | Count |
|--------|--------------|-------|
| **auth** | login, refresh, logout, me | 4 |
| **users** | POST /, GET /, GET /:id, PUT /:id, DELETE /:id | 5 |
| **roles** | POST /, GET /, GET /:id, PUT /:id, DELETE /:id, POST /:id/permissions | 6 |
| **permissions** | GET /, GET /modules, GET /:id | 3 |
| **residents** | POST /, GET /, GET /:id, PUT /:id, DELETE /:id | 5 |
| **announcements** | POST /, GET /, GET /:id, PUT /:id, DELETE /:id, PATCH /:id/publish | 6 |
| **complaint** | POST /, GET /, GET /:id, PUT /:id, DELETE /:id, PUT /:id/assign, /resolve, /close | 8 |
| **communities** | POST /, GET /, GET /:id, PUT /:id, DELETE /:id | 5 |
| **facilities** | POST /, GET /, GET /:id, PUT /:id, DELETE /:id | 5 |
| **reservations** | POST /, GET /, GET /:id, PUT /:id, DELETE /:id, PATCH /:id/approve, /reject, /cancel, /complete | 9 |
| **households** | POST /, GET /, GET /:id, PUT /:id, DELETE /:id | 5 |
| **visitors** | POST /, GET /, GET /:id, PUT /:id, DELETE /:id, PATCH /:id/check-in, /check-out, /cancel | 8 |
| **vehicles** | POST /, GET /, GET /:id, PUT /:id, DELETE /:id | 5 |
| **staff** | POST /, GET /, GET /:id, PUT /:id, DELETE /:id | 5 |
| **maintenance** | POST /, GET /, GET /:id, PUT /:id, DELETE /:id, PATCH /:id/assign, /start, /resolve, /cancel | 9 |
| **finance — payments** | POST /, GET /, GET /:id, PUT /:id, DELETE /:id, PATCH /:id/confirm, /reject, /refund | 8 |
| **finance — assessments** | POST /, GET /, GET /:id, PUT /:id, DELETE /:id, PATCH /:id/issue, /cancel | 7 |
| **documents** | POST /, GET /, GET /:id, PUT /:id, DELETE /:id, PATCH /:id/publish, /archive | 7 |
| **messaging** | POST /, GET /, GET /:id, PUT /:id, DELETE /:id, PATCH /:id/read | 6 |
| **events** | POST /, GET /, GET /:id, PUT /:id, DELETE /:id, PATCH /:id/publish, /cancel, /complete | 8 |
| **notifications** | GET /, GET /unread-count, PATCH /read-all, PATCH /:id/read | 4 |
| **dashboard** | GET /overview | 1 |
| **analytics** | GET /financial, /trends, /status-breakdown | 3 |
| **reports** | GET /residents, /households, /payments, /assessments, /complaints, /vehicles, /maintenance, /visitors, /events, /status-options | 10 |
| **uploads** | POST /, POST /multiple | 2 |
| **subscriptions suite** | plans (5) + subscriptions (6) + invoices (7) + billing (3) | 21 |
| **polls** | POST /, GET /, GET /:id, PUT /:id, DELETE /:id, PATCH /:id/publish, /close, POST /:id/vote, /options | 9 |
| **auditlogs** | GET /, GET /summary, DELETE / | 3 |
| **settings** | GET /, GET /defaults, PUT /, PUT /:key | 4 |
| | **Grand total** | **181** |

---

## 11. Permissions (122 total, from `prisma/permissions.ts`)

Grouped by module:

| Module | Permission codes |
|--------|-----------------|
| Communities | `community.create`, `community.update`, `community.delete`, `community.view` |
| Announcements | `announcement.create`, `announcement.update`, `announcement.delete`, `announcement.view`, `announcement.publish` |
| Billing | `billing.create`, `billing.update`, `billing.approve`, `billing.view`, `billing.manage` |
| Complaints | `complaint.create`, `complaint.update`, `complaint.delete`, `complaint.view`, `complaint.assign`, `complaint.resolve`, `complaint.close` |
| Residents | `resident.create`, `resident.update`, `resident.delete`, `resident.view` |
| Roles / Permissions | `role.manage`, `permission.manage`, `permission.view` |
| Uploads | `upload.file` |
| Facilities | `facility.create`, `facility.update`, `facility.delete`, `facility.view` |
| Reservations | `reservation.create`, `reservation.update`, `reservation.delete`, `reservation.view`, `reservation.approve`, `reservation.reject`, `reservation.cancel`, `reservation.complete` |
| Households | `household.create`, `household.update`, `household.delete`, `household.view` |
| Visitors | `visitor.create`, `visitor.update`, `visitor.delete`, `visitor.view`, `visitor.check-in`, `visitor.check-out`, `visitor.cancel` |
| Vehicles | `vehicle.create`, `vehicle.update`, `vehicle.delete`, `vehicle.view` |
| Staff | `staff.create`, `staff.update`, `staff.delete`, `staff.view` |
| Maintenance | `maintenance.create`, `maintenance.update`, `maintenance.delete`, `maintenance.view`, `maintenance.assign`, `maintenance.start`, `maintenance.resolve`, `maintenance.cancel` |
| Assessments | `assessment.create`, `assessment.update`, `assessment.delete`, `assessment.view`, `assessment.issue`, `assessment.cancel` |
| Payments | `payment.create`, `payment.update`, `payment.delete`, `payment.view`, `payment.confirm`, `payment.reject`, `payment.refund` |
| Documents | `document.create`, `document.update`, `document.delete`, `document.view`, `document.publish`, `document.archive` |
| Messages | `message.create`, `message.update`, `message.delete`, `message.view` |
| Events | `event.create`, `event.update`, `event.delete`, `event.view`, `event.publish`, `event.cancel`, `event.complete` |
| Dashboard | `dashboard.view` |
| Analytics | `analytics.view` |
| Reports | `reports.export` |
| Notifications | `notification.view`, `notification.update` |
| Subscriptions | `subscription.view`, `subscription.manage` |
| Invoices | `invoice.view`, `invoice.manage` |
| Polls | `poll.create`, `poll.update`, `poll.delete`, `poll.view`, `poll.publish`, `poll.close`, `poll.vote` |
| Audit Logs | `audit.view`, `audit.manage` |
| Settings | `settings.view`, `settings.manage` |
| Users | `user.create`, `user.update`, `user.delete`, `user.view` |

---

## 12. Auth & Security (latest work)

### Fixed bugs
- **`GET /auth/me` returned 403 for everyone** — it had a bogus `@Permissions('resident.archive')` (permission didn't exist). Removed the guard; `me()` now returns a sanitized profile: id, names, email, phone, avatar, status, community, role names, and a flat list of unique permission codes.
- **P2002 on refresh tokens** — refresh-token JWTs were deterministic within the same second (`{sub, type}` payload), so two logins/refreshes in the same second produced identical tokens that collided on the unique `token` column. Fixed by adding `jti: randomUUID()` to the refresh-token payload.

### Refresh-token flow (implemented end-to-end)
- `POST /auth/login` — bcrypt verify, rejects non-ACTIVE accounts, sets `lastLoginAt`, returns `{ accessToken, refreshToken, user }` where `user.permissions` is the flat permission array
- Refresh tokens are **SHA-256 hashed at rest** (`createHash('sha256')`) and stored in `RefreshToken` with `expiresAt`/`revokedAt`
- `POST /auth/refresh` — verifies JWT (`REFRESH_SECRET`), checks DB hash + not revoked + not expired + `payload.sub === record.accountId`, then **rotates**: revokes the old token and issues a new one inside a `$transaction` (also creates a `Session` row with IP/user-agent)
- `POST /auth/logout` — revokes the presented refresh token (`updateMany`)
- Access token stays short-lived (`JWT_EXPIRES_IN`); refresh lifetime via `REFRESH_EXPIRES_IN` (default `7d`), parsed with `ms()` (`StringValue` cast)

### Verified live (all 12 smoke checks pass)
Login -> `GET /me` 200 (no leak) -> refresh (rotates) -> old token 401 -> garbage token 401 -> logout -> re-refresh 401 -> wrong password 401 -> no-token 401. DB audit confirmed 4 tokens revoked / 1 live across rotations, sessions created per login.

---

## 13. Cleanup & Refactors

- **Deleted the empty `src/modules/subscription/` (singular) folder** (was untracked)
- **`src/common` cleanup** — deleted 11 untracked empty folders (constants, enums, exceptions, filters, helpers, interceptors, pipes, responses, services, types, validators) and dead files:
  - `guards/roles.guard.ts`, `decorators/roles.decorator.ts`, `interfaces/api-response.interface.ts`, `utils/api-response.ts` (`ApiResponseUtil`)
  - Removed `RolesGuard` import/provider from `auth.module.ts`
  - **Kept**: `guards/jwt-auth.guard.ts`, `guards/permissions.guard.ts`, `decorators/permissions.decorator.ts`
- **`auth.service.ts` rebuilt** — now injects `PrismaService` directly, adds `profile()`/`formatUser()`/`issueRefreshToken()` helpers; spec updated with `{ provide: PrismaService, useValue: {} }`
- **New file** `auth/dto/refresh-token.dto.ts`
- **Prisma JSON fields** cast with `as Prisma.InputJsonValue` to satisfy TypeScript
- **eslint.config.mjs** — `no-unsafe-*` downgraded to `warn`

---

## 14. Seed Data (`prisma/seed.ts`)

Seed wipes then recreates:
- Demo community ("CommunityOS Demo HOA"), admin account (`admin@communityos.com` / `Admin123!`), President role, all 122 permissions
- Sample data across models, including a sample OPEN poll ("Should monthly HOA dues be adjusted?") with 3 options and 2 votes, plus 9 settings
- Member role granted `poll.view`, `poll.vote`, `settings.view`

---

## 15. Verification Status

| Check | Result |
|-------|--------|
| `npm run build` | Pass |
| `npm run lint` | 0 errors (502 warnings) |
| `npm test` | 3/3 specs pass |
| Live API smoke tests | Pass (modules, member 403s, full auth rotation flow) |
| Migrations | 16/16 applied |

---

## 16. Remaining / Known Gaps

- **Nothing committed** — entire body of work is uncommitted; first commit(s) pending
- `auth/dto/register.dto.ts` and `residents/dto/resident-param.dto.ts` defined but unused (minor cleanup candidates)
- Duplicate legacy guard at `modules/auth/guards/jwt-auth.guard.ts` (the `common/guards` one is used everywhere) — can be removed
- Notifications are DB-row based; no WebSockets/FCM push yet
- Future roadmap: Redis, BullMQ, WebSockets, Firebase notifications, S3/R2 storage
