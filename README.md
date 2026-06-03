# Panel Scheduling

Schedule panel interviews by pooling Google Calendar availability across a team. A **Scheduler** (recruiter) creates **Calendars** with **Members** (panelists); candidates book **Meetings** via a public link or the Scheduler books on their behalf.

Domain terms: [CONTEXT.md](./CONTEXT.md)

---

## Prerequisites

| Requirement | Purpose |
|-------------|---------|
| **Node.js 20+** | Run the Next.js app |
| **Postgres 14+** | Store Calendars, Members, Meetings |
| **Google Cloud project** | OAuth for Scheduler login + Calendar API |
| **Google Workspace** | Domain-restricted sign-in and domain-wide delegation (DWD) |

You can run locally **without** the service account at first (`USE_STUBS=1`) to explore the UI; real availability and calendar invites need DWD configured.

---

## Quick start (local UI only)

Use this to verify the app boots before configuring Google Workspace.

```bash
git clone <your-repo-url>
cd calendar-sharing-app
npm install
cp .env.local.example .env.local
```

Edit `.env.local`:

1. Set `AUTH_SECRET` — `openssl rand -base64 32`
2. Set `ALLOWED_DOMAIN` to your Workspace domain (e.g. `acme.com`)
3. Add `USE_STUBS=1` (keeps calendar/slot logic on stubs; no service account needed)
4. Set `DATABASE_URL` (see [Database](#database) below)

```bash
npm run db:push          # create tables (or npm run db:migrate)
npm run dev
```

Open [http://localhost:4000](http://localhost:4000). Sign-in still requires [Google OAuth](#1-google-oauth-scheduler-sign-in) below.

---

## Full setup

### 1. Google OAuth (Scheduler sign-in)

Schedulers sign in with their Workspace Google account. Only emails on `ALLOWED_DOMAIN` are accepted.

1. Open [Google Cloud Console](https://console.cloud.google.com/) → your project → **APIs & Services** → **Credentials**.
2. **Create credentials** → **OAuth client ID** → type **Web application**.
3. **Authorized redirect URIs** (local dev):
   - `http://localhost:4000/api/auth/callback/google`
4. Copy **Client ID** and **Client secret** into `.env.local`:
   - `AUTH_GOOGLE_ID`
   - `AUTH_GOOGLE_SECRET`
5. Configure the [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent) (Internal for Workspace-only apps).
6. Set `ALLOWED_DOMAIN` to your email domain (e.g. `acme.com`, no `@`).

Generate `AUTH_SECRET`:

```bash
openssl rand -base64 32
```

Add to `.env.local` as `AUTH_SECRET=...`.

### 2. Database

#### Option A — Docker (recommended for local dev)

```bash
docker run --name gush-cal-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=panel_scheduling \
  -p 5432:5432 \
  -d postgres:16
```

`.env.local`:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/panel_scheduling
```

#### Option B — Supabase / Neon / other hosted Postgres

Create a database and set `DATABASE_URL` to the provider’s connection string (include `?sslmode=require` if required).

#### Apply schema

```bash
npm run db:migrate
```

Or for rapid local iteration without migration files:

```bash
npm run db:push
```

### 3. Google Calendar API (domain-wide delegation)

Required for real FreeBusy reads, creating events, and Google Meet links. See [docs/adr/001-google-dwd.md](./docs/adr/001-google-dwd.md) for architecture notes.

**Workspace admin steps:**

1. In Google Cloud Console → **APIs & Services** → **Library** → enable **Google Calendar API**.
2. **IAM & Admin** → **Service Accounts** → create a service account.
3. Enable **Domain-wide delegation** on that account; note the **Client ID** (numeric).
4. Google **Admin console** → **Security** → **Access and data control** → **API controls** → **Domain-wide delegation** → **Add new**:
   - Client ID: service account client ID
   - OAuth scopes: `https://www.googleapis.com/auth/calendar`
5. Create a **JSON key** for the service account (Keys → Add key → JSON). Store securely; never commit.

**App configuration:**

Put the entire JSON on one line in `.env.local`:

```env
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...",...}
```

Recommended — user to impersonate for batch FreeBusy (someone who can see panelists’ free/busy):

```env
GOOGLE_DWD_SUBJECT_EMAIL=recruiter@your-company.com
```

If omitted, the app falls back to the first Member email on the Calendar.

Remove `USE_STUBS=1` from `.env.local` when using the real Google adapter.

### 4. Application URL

Booking links use `APP_URL`:

```env
APP_URL=http://localhost:4000
```

In production, set this to your public origin (e.g. `https://scheduling.your-company.com`).

### 5. Run the app

```bash
npm install
npm run dev
```

| URL | Description |
|-----|-------------|
| [http://localhost:4000](http://localhost:4000) | Redirects to Calendars after sign-in |
| [http://localhost:4000/login](http://localhost:4000/login) | Scheduler Google sign-in |
| [http://localhost:4000/calendars](http://localhost:4000/calendars) | Manage Calendars and Members |
| `http://localhost:4000/book/{slug}` | Public candidate booking (after SP-06) |

---

## Environment variables reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Postgres connection string |
| `AUTH_SECRET` | Yes | Auth.js session encryption (`openssl rand -base64 32`) |
| `AUTH_GOOGLE_ID` | Yes | OAuth Web client ID |
| `AUTH_GOOGLE_SECRET` | Yes | OAuth Web client secret |
| `ALLOWED_DOMAIN` | Yes | Workspace domain for Scheduler sign-in (e.g. `acme.com`) |
| `PORT` | No | Dev/prod server port (default **4000** via `npm run dev`) |
| `APP_URL` | Yes | Public base URL for `/book/{slug}` links (e.g. `http://localhost:4000`) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Prod | Service account key JSON (single line) |
| `GOOGLE_DWD_SUBJECT_EMAIL` | Recommended | Workspace user for FreeBusy impersonation |
| `USE_STUBS` | No | `1` = stub Google/slot engines (local/CI without DWD) |

Copy the template:

```bash
cp .env.local.example .env.local
```

---

## Verify installation

```bash
npm test          # unit tests (uses USE_STUBS=1 via package.json)
npm run build     # production build check
```

Sign in at `/login` with a `@ALLOWED_DOMAIN` account, then:

1. Create a **Calendar** at `/calendars/new`
2. Add **Members** (emails must be on the same domain)
3. Copy the public booking link from the Calendar detail page

---

## npm scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm test` | Run all Vitest tests |
| `npm run db:migrate` | Apply Drizzle migrations |
| `npm run db:push` | Push schema directly (dev) |
| `npm run db:generate` | Generate migration from schema changes |
| `npm run lint` | ESLint |

Sub-plan test aliases: `npm run test:sp-02` … `test:sp-06`.

---

## Troubleshooting

### Sign-in rejected or redirect loop

- Confirm `ALLOWED_DOMAIN` matches your Google account domain.
- Check OAuth redirect URI is exactly `http://localhost:4000/api/auth/callback/google` (or your `APP_URL` + `/api/auth/callback/google`).
- Ensure `AUTH_SECRET` is set and stable (changing it invalidates sessions).

### `DATABASE_URL is not set`

- Create `.env.local` from `.env.local.example`.
- Restart `npm run dev` after editing env vars.

### Calendar API / FreeBusy errors

- Confirm DWD Client ID and scope in Admin console.
- Set `GOOGLE_DWD_SUBJECT_EMAIL` to a user who can view panelists’ calendars.
- Member emails must be valid Workspace addresses on `ALLOWED_DOMAIN`.
- For local debugging without Google, set `USE_STUBS=1`.

### Migration failures

- Ensure Postgres is running and the database exists.
- Try `npm run db:push` on a fresh local database.

---

## Project layout

| Path | Purpose |
|------|---------|
| `app/(admin)/calendars/` | Scheduler UI |
| `app/api/calendars/` | Calendar/Member REST API |
| `lib/google/` | Google Calendar DWD adapter |
| `lib/slots/` | Availability and assignment engine |
| `lib/deps.ts` | Wires real vs stub adapters |
| `docs/plans/gush-cal-v1/` | Implementation sub-plans |
| `docs/adr/001-google-dwd.md` | DWD design decision |

---

## Production deployment

Deploy to **Fly.io** with **Supabase Postgres** using the included script:

```bash
cp .env.production.example .env.production
# Fill DATABASE_URL (Supabase direct URI), auth, Google, APP_URL

chmod +x scripts/deploy.sh   # once
npm run deploy               # migrate → sync secrets → fly deploy
```

### First-time Supabase

1. [Create a project](https://supabase.com/dashboard) (or use CLI — see below).
2. **Settings → Database → Connection string** → **URI** (Direct connection, port **5432**).
3. Add `?sslmode=require` if not in the string.
4. Put the URI in `.env.production` as `DATABASE_URL`.

Optional — create project via [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
# Add SUPABASE_ORG_ID, SUPABASE_PROJECT_NAME, SUPABASE_DB_PASSWORD to .env.production
./scripts/deploy.sh --init-supabase --env-file .env.production
# Then add DATABASE_URL from the dashboard and run npm run deploy
```

### Deploy script options

| Command | Description |
|---------|-------------|
| `npm run deploy` | Full pipeline: DB migrate → Fly secrets → deploy |
| `npm run deploy:migrate` | Supabase schema only (`drizzle-kit migrate`) |
| `npm run deploy:fly` | `fly deploy` only (skip DB + secrets) |
| `./scripts/deploy.sh --db-push` | Use `db:push` instead of migrations (empty DB bootstrap) |
| `./scripts/deploy.sh --deploy-only` | Same as `deploy:fly` |

### Fly.io prerequisites

```bash
# Install: https://fly.io/docs/hands-on/install-flyctl/
fly auth login
```

The script creates the Fly app `gush-cal` (override with `FLY_APP` in env or `--app`).

### After deploy

1. Set Google OAuth redirect URI to `https://<your-domain>/api/auth/callback/google`.
2. Update `APP_URL` in `.env.production` and re-run `npm run deploy` if the URL changed.
3. Health check: `GET /api/health` (used by Fly).

See also [docs/adr/001-google-dwd.md](./docs/adr/001-google-dwd.md) for Workspace DWD setup.

---

## Brand customization

The app ships with **Gushwork** defaults (Resolution Blue primary, warm paper background). Override via environment variables — all are optional:

| Variable | Default | Purpose |
|----------|---------|---------|
| `BRAND_APP_NAME` | `Gushwork Scheduling` | App title in shell, metadata, and login |
| `BRAND_LOGO_URL` | `https://www.gushwork.ai/logo.svg` | Header logo (URL or path under `public/`) |
| `BRAND_FAVICON_URL` | `/favicon.ico` | Browser tab icon |
| `BRAND_PRIMARY_COLOR` | `#0066FF` | Primary brand color (buttons, links, accents) |
| `BRAND_ACCENT_COLOR` | `#0047AB` | Secondary brand color |
| `BRAND_FONT_DISPLAY` | *(Fraunces)* | Google Font family name for headings; omit for Fraunces |

Runtime CSS variables (`--primary`, `--primary-soft`, `--accent`) are derived from the color env vars. See [docs/plans/design-system-overhaul/contracts.md](./docs/plans/design-system-overhaul/contracts.md).

---

## Further reading

- [CONTEXT.md](./CONTEXT.md) — domain language
- [docs/adr/001-google-dwd.md](./docs/adr/001-google-dwd.md) — Google Workspace integration
- [docs/plans/gush-cal-v1/](./docs/plans/gush-cal-v1/) — implementation plan
