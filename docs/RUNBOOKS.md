# CommunityOS — Runbooks

Operational guide for deploying and operating CommunityOS.

- Frontend: React + Vite static build — hosted on **Vercel** (or any static host)
- Backend: NestJS API — hosted on **Railway / Render** (Docker image)
- Database: **PostgreSQL** — managed (Railway Postgres / Neon) or self-hosted via `docker-compose.yml`
- Emails: SMTP (any provider) — OTP registration codes + renter set-password emails
- Files: uploaded documents live on the backend's local disk (`uploads/`) — **attach a persistent volume** or uploads are lost on redeploy (object storage is deferred)

---

## 1. Environment variables

Reference for the backend. See `Community-os-backend/.env.example`.

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Prisma connection string, `?schema=public` |
| `JWT_SECRET` | yes | Generate: `openssl rand -hex 32` |
| `JWT_EXPIRES_IN` | yes | e.g. `15m` |
| `REFRESH_SECRET` | yes | Generate separately: `openssl rand -hex 32` |
| `REFRESH_EXPIRES_IN` | yes | e.g. `7d` |
| `CORS_ORIGINS` | yes | Comma-separated origins, e.g. `https://app.yourdomain.com` |
| `APP_URL` | yes | The public frontend URL (used in reset-password / account emails) |
| `COOKIE_SECURE` | yes | `true` in production (requires HTTPS) |
| `NODE_ENV` | yes | `production` in prod (enables JSON logs etc.) |
| `PORT` | no | Defaults to `3000`; platforms inject their own `PORT` |
| `BCRYPT_SALT_ROUNDS` | no | Default `10` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` | for email | Without these, mail is logged to console and OTP emails are NOT sent |
| `MAIL_FROM` | for email | e.g. `no-reply@yourdomain.com` |
| `SENTRY_DSN` | no | Enables Sentry error tracking when set |
| `SEED_DB` | no | `true` seeds superadmin/roles/plans on container boot (see §3) |

## 2. Deploy checklist

### 2.1 Database (Railway Postgres / Neon)
1. Create a Postgres instance (16.x). Copy the connection string.
2. Append `?schema=public`.

### 2.2 Backend (Railway / Render — Docker deploy)
1. New service from the repo's `Community-os-backend/Dockerfile` (the entrypoint runs `prisma migrate deploy` on boot, so migrations apply automatically).
2. Set the env vars from §1 (`DATABASE_URL` = managed Postgres URL; `CORS_ORIGINS` + `APP_URL` = the frontend URL; `COOKIE_SECURE=true`; real secrets; SMTP block).
3. **Attach a persistent volume mounted at `/app/uploads`** (uploads survive restarts/redeploys).
4. First boot: set `SEED_DB=true`, start once, wait for "Seeding database…" + "Server running", then set `SEED_DB=false` and restart. This creates the platform admin (`admin@communityos.com` — change the password after first login), system roles, and subscription plans.
5. Verify:
   - `GET /api/health` → `{"status":"ok"}`
   - `GET /api/health/ready` → `{"status":"ok","database":"up"}`
   - `GET /api/docs` loads (Swagger)
   - A tenant signup actually sends an OTP email (proves SMTP works)

### 2.3 Frontend (Vercel)
1. Import the repo, root = `Community-os-frontend`, framework preset = Vite, build command `npm run build`, output `dist`.
2. The API is called via a relative `/api` path, so add a **rewrite** so the browser hits the backend:
   - `vercel.json` in `Community-os-frontend/`:
     ```json
     {
       "rewrites": [{ "source": "/api/(.*)", "destination": "https://your-backend-url/api/$1" }]
     }
     ```
   - (or an equivalent proxy/rewrite rule on any static host)
3. Redeploy; verify a login + a document upload/download round-trip in the browser.

## 3. Seeding

The seed (`npm run seed`) creates: the platform admin `admin@communityos.com`, demo anchor community + system roles (President/Member/Renter) + all permissions + subscription plans. Run it exactly once on a fresh database (`SEED_DB=true` in the Docker entrypoint, or `npx prisma db seed` against a local DB).

## 4. Backups & restore

### 4.1 Database
```sh
# backup
pg_dump "$DATABASE_URL" -Fc -f communityos-$(date +%F).dump

# restore (into an empty database)
pg_restore --clean --if-exists -d "$DATABASE_URL" communityos-YYYY-MM-DD.dump
```
Schedule nightly (e.g. a cron/CloudWatch/`pg_cron` job); keep 30 days.

### 4.2 Uploaded files
```sh
# backup
tar -czf uploads-$(date +%F).tar.gz -C /app/uploads .

# restore
mkdir -p /app/uploads && tar -xzf uploads-YYYY-MM-DD.tar.gz -C /app/uploads
```
Restore both DB and files together so document rows keep pointing at real files.

## 5. Day-2 operations

- **Health:** use `/api/health` (liveness) and `/api/health/ready` (DB readiness) as platform health-check paths.
- **Logs:** request lines are single-line JSON with `requestId`, `method`, `url`, `status`, `durationMs`; correlate errors via the `x-request-id` response header. Set `SENTRY_DSN` to forward 5xx errors.
- **Migrations:** applied automatically on boot (`prisma migrate deploy`). To run manually: `npx prisma migrate deploy`.
- **Restart:** plain restart is safe; only redeploys without the uploads volume lose files.
- **Rollback:** redeploy a previous image/tag; DB migrations are additive-forward (no auto-downgrade).

## 6. Common failure modes

| Symptom | Cause / fix |
|---|---|
| Registration succeeds but no OTP email | `SMTP_*` not set (mail is console-logged). Configure SMTP and resend. |
| Documents 404 after redeploy | Uploads volume missing / not mounted at `/app/uploads`. |
| `403 Forbidden` on cross-site requests | `CORS_ORIGINS` missing the frontend origin. |
| Refresh cookie not sent/`Secure` error | `COOKIE_SECURE` mismatch — must be `true` over HTTPS, `false` over plain HTTP. |
| App boots but `/api/health/ready` is 503 | DB unreachable (`DATABASE_URL` wrong / Postgres down). |
| 401 on every call after deploy | `JWT_SECRET`/`REFRESH_SECRET` differ between sessions — keep them stable. |
