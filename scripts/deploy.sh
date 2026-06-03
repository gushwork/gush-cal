#!/usr/bin/env bash
# Deploy gush-cal: Supabase Postgres migrations + Fly.io secrets + deploy.
#
# Usage:
#   ./scripts/deploy.sh                    # migrate → sync secrets → fly deploy
#   ./scripts/deploy.sh --migrate-only     # database only
#   ./scripts/deploy.sh --deploy-only      # skip migrate + secrets sync
#   ./scripts/deploy.sh --db-push          # drizzle push (dev/first boot) instead of migrate
#   ./scripts/deploy.sh --env-file .env.production --app gush-cal
#
# First-time Supabase:
#   1. Create a project at https://supabase.com/dashboard
#   2. Settings → Database → Connection string → URI (Direct connection, port 5432)
#   3. Append ?sslmode=require if not present
#   4. Copy .env.production.example → .env.production and fill values
#
# Requires: node 20+, npm, flyctl, Docker (https://fly.io/docs/hands-on/install-flyctl/)
# Image builds use local Docker by default (--local-only) to avoid Depot/remote OOM on next build.
# Use --remote-build or FLY_REMOTE_BUILD=1 to build on Fly/Depot instead.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${DEPLOY_ENV_FILE:-.env.production}"
FLY_APP="${FLY_APP:-gush-cal}"
SKIP_MIGRATE=false
SKIP_SECRETS=false
SKIP_DEPLOY=false
MIGRATE_MODE="migrate"
DB_PUSH=false
USE_REMOTE_FLY_BUILD=false

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}→${NC} $*"; }
ok() { echo -e "${GREEN}✓${NC} $*"; }
fail() { echo -e "${RED}✗${NC} $*" >&2; exit 1; }

usage() {
  cat <<'EOF'
Usage: ./scripts/deploy.sh [options]

Options:
  --env-file PATH   Env file (default: .env.production)
  --app NAME        Fly.io app name (default: gush-cal)
  --migrate-only    Run DB connection test + migrations only
  --deploy-only     Skip migrations and secret sync; fly deploy only
  --skip-migrate    Skip database step
  --skip-secrets    Skip fly secrets sync
  --db-push         Use `npm run db:push` instead of `db:migrate`
  --remote-build    Build image on Fly/Depot (default: local Docker via --local-only)
  -h, --help        Show this help

Environment:
  FLY_REMOTE_BUILD=1   Same as --remote-build (e.g. CI with no Docker)

Environment (in env file):
  DATABASE_URL              Supabase Postgres URI (direct connection)
  AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET
  ALLOWED_DOMAIN, APP_URL
  GOOGLE_SERVICE_ACCOUNT_JSON, GOOGLE_DWD_SUBJECT_EMAIL (optional but recommended)

Optional Supabase CLI (if project not created yet):
  SUPABASE_ORG_ID, SUPABASE_PROJECT_NAME, SUPABASE_DB_PASSWORD, SUPABASE_REGION
  Run with --init-supabase to create project via CLI (requires `supabase` logged in)
EOF
}

INIT_SUPABASE=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file) ENV_FILE="$2"; shift 2 ;;
    --app) FLY_APP="$2"; shift 2 ;;
    --skip-migrate) SKIP_MIGRATE=true; shift ;;
    --skip-secrets) SKIP_SECRETS=true; shift ;;
    --deploy-only) SKIP_MIGRATE=true; SKIP_SECRETS=true; shift ;;
    --migrate-only) SKIP_SECRETS=true; SKIP_DEPLOY=true; shift ;;
    --db-push) DB_PUSH=true; MIGRATE_MODE="push"; shift ;;
    --init-supabase) INIT_SUPABASE=true; shift ;;
    --remote-build) USE_REMOTE_FLY_BUILD=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) fail "Unknown option: $1 (try --help)" ;;
  esac
done

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

# Load env file via Node/dotenv (handles JSON values safely)
load_env() {
  if [[ ! -f "$ENV_FILE" ]]; then
    fail "Env file not found: $ENV_FILE\n  Copy .env.production.example to .env.production and fill in values."
  fi

  log "Loading $ENV_FILE"
  # shellcheck disable=SC2046
  eval "$(node <<NODE
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

const envPath = path.resolve("$ENV_FILE");
const parsed = dotenv.parse(fs.readFileSync(envPath));

const exportKeys = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "AUTH_GOOGLE_ID",
  "AUTH_GOOGLE_SECRET",
  "ALLOWED_DOMAIN",
  "APP_URL",
  "GOOGLE_SERVICE_ACCOUNT_JSON",
  "GOOGLE_DWD_SUBJECT_EMAIL",
  "SUPABASE_ORG_ID",
  "SUPABASE_PROJECT_NAME",
  "SUPABASE_DB_PASSWORD",
  "SUPABASE_REGION",
  "SUPABASE_PROJECT_REF",
];

for (const key of exportKeys) {
  const val = parsed[key] ?? process.env[key];
  if (val != null && val !== "") {
    process.stdout.write("export " + key + "=" + JSON.stringify(String(val)) + "\n");
  }
}
NODE
)"
}

validate_env() {
  local missing=()
  for var in DATABASE_URL AUTH_SECRET AUTH_GOOGLE_ID AUTH_GOOGLE_SECRET ALLOWED_DOMAIN APP_URL; do
    [[ -z "${!var:-}" ]] && missing+=("$var")
  done
  if [[ ${#missing[@]} -gt 0 ]]; then
    fail "Missing required variables in $ENV_FILE: ${missing[*]}"
  fi

  if [[ "$DATABASE_URL" != *"sslmode="* ]] && [[ "$DATABASE_URL" == *"supabase"* ]]; then
    log "Hint: Supabase URLs usually need ?sslmode=require"
  fi
}

init_supabase_project() {
  require_cmd supabase

  [[ -n "${SUPABASE_ORG_ID:-}" ]] || fail "Set SUPABASE_ORG_ID in $ENV_FILE for --init-supabase"
  [[ -n "${SUPABASE_PROJECT_NAME:-}" ]] || fail "Set SUPABASE_PROJECT_NAME in $ENV_FILE"
  [[ -n "${SUPABASE_DB_PASSWORD:-}" ]] || fail "Set SUPABASE_DB_PASSWORD in $ENV_FILE"
  SUPABASE_REGION="${SUPABASE_REGION:-us-east-1}"

  log "Creating Supabase project: $SUPABASE_PROJECT_NAME (region: $SUPABASE_REGION)"
  supabase projects create "$SUPABASE_PROJECT_NAME" \
    --org-id "$SUPABASE_ORG_ID" \
    --db-password "$SUPABASE_DB_PASSWORD" \
    --region "$SUPABASE_REGION"

  ok "Supabase project created — add DATABASE_URL from dashboard to $ENV_FILE and re-run"
  exit 0
}

link_supabase_ref() {
  if [[ -z "${SUPABASE_PROJECT_REF:-}" ]] || ! command -v supabase >/dev/null 2>&1; then
    return 0
  fi

  if [[ -z "${DATABASE_URL:-}" ]]; then
    log "Linking Supabase project ref: $SUPABASE_PROJECT_REF"
    supabase link --project-ref "$SUPABASE_PROJECT_REF" 2>/dev/null || true
    fail "DATABASE_URL not set. After linking, copy the direct connection URI from Supabase dashboard → Settings → Database"
  fi
}

test_db_connection() {
  log "Testing database connection"
  DATABASE_URL="$DATABASE_URL" node <<'NODE'
const postgres = require("postgres");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const sql = postgres(url, { max: 1, connect_timeout: 15, ssl: url.includes("supabase") ? "require" : undefined });
  try {
    const [{ ok }] = await sql`select 1 as ok`;
    if (ok !== 1) throw new Error("unexpected result");
    console.log("  Connection OK");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error("  Connection failed:", err.message);
  process.exit(1);
});
NODE
  ok "Database reachable"
}

run_migrations() {
  if [[ "$DB_PUSH" == true ]]; then
    log "Pushing schema (drizzle-kit push)"
    npm run db:push
  else
    log "Applying migrations (drizzle-kit migrate)"
    npm run db:migrate
  fi
  ok "Database schema up to date"
}

ensure_fly_app() {
  if fly apps list 2>/dev/null | awk '{print $1}' | grep -qx "$FLY_APP"; then
    return 0
  fi

  log "Creating Fly.io app: $FLY_APP"
  fly apps create "$FLY_APP" --yes 2>/dev/null || fly apps create "$FLY_APP"
  ok "Fly app $FLY_APP ready"
}

sync_fly_secrets() {
  require_cmd fly
  ensure_fly_app

  log "Staging Fly.io secrets for $FLY_APP"

  local -a secret_pairs=()
  local keys=(
    DATABASE_URL
    AUTH_SECRET
    AUTH_GOOGLE_ID
    AUTH_GOOGLE_SECRET
    ALLOWED_DOMAIN
    APP_URL
    GOOGLE_DWD_SUBJECT_EMAIL
    GOOGLE_SERVICE_ACCOUNT_JSON
  )

  for key in "${keys[@]}"; do
    local val="${!key:-}"
    if [[ -n "$val" ]]; then
      secret_pairs+=("${key}=${val}")
    fi
  done

  if [[ ${#secret_pairs[@]} -eq 0 ]]; then
    fail "No secrets to sync"
  fi

  # --stage applies secrets on next deploy (atomic with deploy)
  fly secrets set "${secret_pairs[@]}" --app "$FLY_APP" --stage
  ok "Secrets staged (applied on deploy)"
}

use_remote_fly_build() {
  [[ "$USE_REMOTE_FLY_BUILD" == true ]] && return 0
  case "${FLY_REMOTE_BUILD:-}" in
    1 | true | yes) return 0 ;;
  esac
  return 1
}

deploy_fly() {
  require_cmd fly
  local -a fly_args=(deploy --app "$FLY_APP")

  if use_remote_fly_build; then
    log "Deploying to Fly.io ($FLY_APP) — remote image build (Depot)"
  else
    require_cmd docker
    if ! docker info >/dev/null 2>&1; then
      fail "Docker is not running. Start Docker, or pass --remote-build / set FLY_REMOTE_BUILD=1 to use Fly's remote builder."
    fi
    fly_args+=(--local-only)
    log "Deploying to Fly.io ($FLY_APP) — local Docker build (--local-only)"
  fi

  fly "${fly_args[@]}"
  ok "Deployed — check: fly open --app $FLY_APP"
}

main() {
  require_cmd node
  require_cmd npm

  if [[ "$INIT_SUPABASE" == true ]]; then
    load_env
    init_supabase_project
  fi

  load_env
  validate_env
  export DATABASE_URL

  link_supabase_ref

  if [[ "$SKIP_MIGRATE" != true ]]; then
    test_db_connection
    run_migrations
  fi

  if [[ "$SKIP_SECRETS" != true ]]; then
    sync_fly_secrets
  fi

  if [[ "$SKIP_DEPLOY" != true ]]; then
    deploy_fly
  fi

  ok "Deployment pipeline complete"
}

main "$@"
