# CommunityOS — Login & Account Workflows

Step-by-step workflows for every way someone can get into the system and use it.

## How authentication works (behind the scenes)

1. The user submits email + password at `/login`.
2. The backend verifies the credential against the `Account` record and hashes
   (`POST /api/auth/login`).
3. On success the backend returns:
   - **access token** (JWT, short-lived) used for API calls
   - **refresh token** (JWT, 7 days by default) stored server-side and rotated
     on every refresh
   - the **user profile** (roles, permissions, linked resident, community)
4. The frontend stores the session and redirects to the dashboard.
5. The sidebar and pages are rendered **based on permissions**, so two users can
   log in with the same URL but see completely different menus.
6. Logging out revokes the refresh token and closes the session server-side.

## Workflow A — Superadmin (President) login

Who: the top-level account `admin@communityos.com`.

1. Open `http://localhost:5173/login`.
2. Enter:
   - Email: `admin@communityos.com`
   - Password: `Admin123!`
3. Click **Sign in**.
4. You are redirected to the **management dashboard**, which shows:
   - Management KPIs: pending reservations, draft announcements, open
     complaints, available facilities
   - "Needs attention" shortcuts (pending reservations, draft announcements,
     open complaints, pending payments)
   - Recent reservations list
5. The sidebar contains every module (announcements, events, polls, complaints,
   facilities, billing, residents, users, settings, etc.).
6. Example actions: approve a reservation (Facilities → Reservations →
   Approve), publish an announcement, assign a complaint.

## Workflow B — HOA member login (seeded accounts)

Who: a resident with a pre-created account, e.g.
`juan.delacruz@example.com` or `pedro.reyes@example.com` (both `Admin123!`).

1. Open `http://localhost:5173/login`.
2. Enter the member's email and password.
3. Click **Sign in**.
4. You are redirected to the **resident dashboard**, which shows:
   - Available facilities, upcoming events, announcements, open complaints
5. The sidebar is limited to resident features: announcements, events, polls,
   complaints, facilities, notifications, etc.
6. Example actions: book a facility (Facilities → Book → the form is prefilled
   under your own name), file a complaint, vote in a poll.

## Workflow C — Self-registration for a new HOA resident

Who: a resident who does not have an account yet. Registration is open and
does not require an invite.

1. Open `http://localhost:5173/register`.
2. Pick the community in the community picker (e.g. **CommunityOS Demo HOA**).
3. Fill in first name, last name, email, phone number (optional), password.
4. Provide **unit information** — at least one of block, lot, unit, or address
   (this is required; it is used to locate or create the household).
5. Submit. The backend automatically:
   - finds or creates the **household** for that block/lot/unit
   - creates a **resident** record linked to the household
   - creates the **account + user** and links the user to the resident
   - assigns the system **Member** role
6. You are signed in automatically and land on the resident dashboard.

> Note: self-registration always produces a **Member**. Only the President can
> create accounts with elevated roles.

## Workflow D — Login for a different HOA (multi-community)

The backend already supports multiple communities (`Community` model, per-
community roles/permissions/settings). Every account is bound to exactly one
community.

1. The person from HOA "X" registers via `/register` and picks their community
   in the picker.
2. Their account, roles, residents and data are all scoped to that community.
3. They log in the same way at `/login` with their own email/password.
4. The system only ever shows data from **their** community — the access token
   carries `communityId` and every API query is filtered by it.

> There is currently no account that can switch between multiple communities in
> one session; an account belongs to one community. Cross-community switching is
> a future/optional feature.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| "Invalid credentials" | Wrong email/password | Re-check the credentials in `docs/ACCOUNTS.md` |
| "Account has no user profile" | Account exists but has no linked user | Create the user via the Users module or seed |
| "Account is not active" | Account status is not ACTIVE | Reactivate via the backend/database |
| Page or menu missing | Role lacks the permission | Log in with the President account to see it |
| Backend unreachable | API not running | Start backend on port 3000 (`npm run start:prod` in `Community-os-backend`) |

## API endpoints used

- `POST /api/auth/login` — email + password → session
- `POST /api/auth/register` — self-registration → session
- `POST /api/auth/refresh` — rotate refresh token
- `POST /api/auth/logout` — revoke refresh token + session
- `GET /api/auth/me` — current user profile (roles/permissions/resident)
