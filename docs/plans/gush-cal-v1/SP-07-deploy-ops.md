# SP-07: Deploy ops

## Type
Parallel

## Blocked by
- SP-01 (app scaffold, env var names)

## Goal
Make the app deployable on Fly.io with Supabase Postgres locally/prod, documented env setup, and a production-ready container — without blocking feature sub-plans.

## Owns
- `Dockerfile`
- `fly.toml`
- `.env.example`
- `.dockerignore`
- `README.md` (project setup + deploy sections only — create file if absent)
- `app/api/health/route.ts` (liveness: DB ping)

## Provides
- `GET /api/health` → `{ ok: true }` when DB reachable
- Documented env vars matching SP-01 + SP-02
- `fly deploy` instructions
- Local dev: any Postgres via `DATABASE_URL`

## Consumes
| From | Contract | Until merged, use |
|------|----------|-------------------|
| SP-01 | App builds with `pnpm build` | placeholder health route OK before full app |

## Out of scope
- Feature code in `lib/` or admin/booking UI
- Supabase project provisioning (document steps only)
- Google Workspace admin steps (see SP-02 ADR)
- CI pipeline (optional follow-up)

## Implementation notes
- Multi-stage Docker: install deps, build Next.js standalone output, run as non-root.
- Fly: `internal_port = 3000`, health check on `/api/health`.
- `.env.example` lists all vars from plan: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `ALLOWED_DOMAIN`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `APP_URL`.
- README: local `pnpm install`, `db:migrate`, `pnpm dev`; link to `docs/adr/001-google-dwd.md`.
- Do not commit secrets.

## Done when
- [ ] `docker build` succeeds after SP-01 merge
- [ ] `.env.example` complete
- [ ] README documents local + Fly deploy
- [ ] `/api/health` returns 200 with DB up
- [ ] No edits outside **Owns**

## Agent spawn brief
Implement **SP-07 Deploy ops**. Add Dockerfile, fly.toml, .env.example, .dockerignore, README setup/deploy docs, and `app/api/health/route.ts` with DB ping. Assume Next.js 16 standalone from SP-01. Do not implement features. Done when Docker build succeeds and env vars are documented. Own only SP-07 paths.
