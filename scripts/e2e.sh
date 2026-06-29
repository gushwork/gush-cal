#!/usr/bin/env bash
# E2E wrapper — starts dev server when START_SERVER=1; seeds when SEED_E2E=1 (default).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Next.js reads .env.local; Playwright globalSetup/seed need DATABASE_URL too.
if [[ -f "$ROOT/.env.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env.local"
  set +a
fi

PORT="${PORT:-4000}"
export PLAYWRIGHT_BASE_URL="${PLAYWRIGHT_BASE_URL:-http://localhost:${PORT}}"
export USE_STUBS="${USE_STUBS:-1}"
export SEED_E2E="${SEED_E2E:-1}"
SERVER_PID=""

cleanup() {
  if [[ -n "${SERVER_PID}" ]] && kill -0 "${SERVER_PID}" 2>/dev/null; then
    kill "${SERVER_PID}" 2>/dev/null || true
    wait "${SERVER_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

wait_for_server() {
  local url="$1"
  local attempts="${2:-60}"
  local i=0
  while (( i < attempts )); do
    if curl -fsS -o /dev/null -m 2 "${url}/login" 2>/dev/null; then
      return 0
    fi
    sleep 1
    (( i += 1 )) || true
  done
  echo "e2e: timed out waiting for ${url}" >&2
  return 1
}

if [[ "${START_SERVER:-0}" == "1" ]]; then
  echo "e2e: starting dev server on ${PLAYWRIGHT_BASE_URL} ..."
  npm run dev &
  SERVER_PID=$!
  wait_for_server "${PLAYWRIGHT_BASE_URL}"
fi

if [[ "${PLAYWRIGHT_SKIP_INSTALL:-0}" != "1" ]]; then
  npx playwright install chromium
fi
npx playwright test --config=playwright.config.ts "$@"
