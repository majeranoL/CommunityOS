# CommunityOS — System Accounts

This document lists every account that exists in the system today, what it is,
what it can do, and how to log in.

## Quick reference

| Account | Email | Password | Role | Type |
| --- | --- | --- | --- | --- |
| System Administrator (Superadmin) | `admin@communityos.com` | `Admin123!` | President | Seeded |
| Juan Dela Cruz | `juan.delacruz@example.com` | `Admin123!` | Member | Seeded |
| Pedro Reyes | `pedro.reyes@example.com` | `Admin123!` | Member | Seeded |
| Smoke Test | `smoketest@example.com` | `TestPass123!` | Member | Created via self-registration |

> All passwords above are **demo credentials** for local development only. The
> seeded accounts share the same password (`Admin123!`) because they are created
> by the database seed script (`prisma/seed.ts`).

## Access URLs

- Frontend (login page): `http://localhost:5173/login`
- Frontend (registration): `http://localhost:5173/register`
- Backend API: `http://localhost:3000/api`

## 1. System Administrator — Superadmin

- **Email:** `admin@communityos.com`
- **Password:** `Admin123!`
- **User:** System Administrator (`USR-000001`)
- **Role:** **President** (system role)
- **Community:** CommunityOS Demo HOA (`COMMUNITY001`)

> The demo HOA uses its own contact email (`hoa@communityosdemo.com`) — it is
> **not** the superadmin login address, so the tenant and platform admin are kept
> separate at login.

This is the top-level account in the demo. There is no separate
platform-level "superadmin" account — the seeded **President** role is granted
**every permission** defined in `prisma/permissions.ts`, so this account has
full control:

- Dashboard, analytics, reports and audit logs
- Announcements, events, polls, documents, messages
- Complaints (assign/resolve/close), reservations (approve/reject/cancel/complete)
- Facilities, households, residents, vehicles, visitors, staff, maintenance
- Billing / assessments / payments (issue, confirm, refund)
- Users and roles / permissions management
- Community settings, subscriptions and invoices
- Communities (`community.create/update/delete/view`) — the account is a full
  superadmin inside this build

### How to log in
1. Open `http://localhost:5173/login`.
2. Enter `admin@communityos.com` and `Admin123!`.
3. Sign in. You land on the **management dashboard** with management KPIs
   (pending reservations, draft announcements, open complaints, available
   facilities) and a "Needs attention" panel.

## 2. HOA Member — seeded account (Juan Dela Cruz)

- **Email:** `juan.delacruz@example.com`
- **Password:** `Admin123!`
- **User:** Juan Dela Cruz (`USR-000002`)
- **Role:** **Member** (system role)
- **Linked resident:** Juan Dela Cruz (`RES-000001`, Block A Lot 1)

### Member permissions
`dashboard.view`, `message.*`, `event.view`, `document.view`, `assessment.view`,
`payment.view`, `announcement.view`, `complaint.create`, `complaint.view`,
`facility.view`, `reservation.create`, `reservation.view`,
`notification.view`, `notification.update`, `poll.view`, `poll.vote`,
`settings.view`.

### What a Member sees
- Resident dashboard (available facilities, upcoming events, announcements,
  open complaints)
- Announcements, events, polls (can vote), documents, messages
- Complaints — can **create** and **view** their own
- Facilities — can **book** facilities; bookings are self-listed under "My
  reservations" and are auto-linked to the member's own name
- Notifications (including status updates for their complaints and reservation
  approval/rejection)

## 3. HOA Member — seeded account (Pedro Reyes)

- **Email:** `pedro.reyes@example.com`
- **Password:** `Admin123!`
- **User:** Pedro Reyes (`USR-000003`)
- **Role:** **Member**
- **Linked resident:** Pedro Reyes (`RES-000003`, Block B Lot 3)

Same Member role and capabilities as Juan Dela Cruz. Useful as a second
resident account for testing interactions between two members (e.g. a
complaint filed by one resident and reviewed by the President).

## 4. Smoke Test — self-registered resident

- **Email:** `smoketest@example.com`
- **Password:** `TestPass123!`
- **Role:** **Member** (auto-assigned by registration)
- **Linked resident:** created automatically (Block 10, Lot 22)

Created through the public self-registration flow during development. It proves
the registration workflow works end-to-end and is handy for testing resident
flows without touching the seed accounts.

## Residents without login access

These people exist as residents in the directory but have **no user account**
and cannot log in:

| Resident | Block/Lot |
| --- | --- |
| Maria Dela Cruz (`RES-000002`) | Block A Lot 1 |
| Ana Garcia (`RES-000004`) | Block B Lot 3 |

They appear in the residents/vehicles/visitors modules but have no portal
credentials. A user account can be created for them by the President via the
Users module, or they can self-register.

## Roles overview

| Role | System? | Permissions | Assigned to |
| --- | --- | --- | --- |
| President | Yes | All permissions | `admin@communityos.com` |
| Member | Yes | Resident-facing subset | Juan, Pedro, Smoke Test |

## Where accounts are defined

- Seed script: `Community-os-backend/prisma/seed.ts`
- Permission catalog: `Community-os-backend/prisma/permissions.ts`
- Data model: `Community-os-backend/prisma/schema.prisma`
