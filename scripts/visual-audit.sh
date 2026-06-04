#!/usr/bin/env bash
# SP-25 visual QA wrapper — smoke today; baselines, axe, perf, touch audit hooks later.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PORT="${PORT:-4000}"
export PLAYWRIGHT_BASE_URL="${PLAYWRIGHT_BASE_URL:-http://localhost:${PORT}}"
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
  echo "visual-audit: timed out waiting for ${url}" >&2
  return 1
}

if [[ "${START_SERVER:-0}" == "1" ]]; then
  echo "visual-audit: building and starting server on ${PLAYWRIGHT_BASE_URL} ..."
  npm run build
  npm run start &
  SERVER_PID=$!
  wait_for_server "${PLAYWRIGHT_BASE_URL}"
fi

if [[ "${RUN_AXE:-0}" == "1" ]]; then
  echo "visual-audit: axe pass not yet implemented — set RUN_AXE=0 or add @axe-core/playwright in SP-25 follow-up." >&2
fi

if [[ "${RUN_PERF:-0}" == "1" ]]; then
  echo "visual-audit: perf gate not yet implemented — use npm run test:ui9-22 for week fetch bench." >&2
fi

if [[ "${RUN_TOUCH_AUDIT:-0}" == "1" ]]; then
  echo "visual-audit: touch-target audit not yet implemented — see reconciliation.md manual checklist." >&2
fi

# Authenticated admin E2E (future): save storage state after manual Google login once:
#   npx playwright codegen --save-storage=tests/visual/.auth/admin.json http://localhost:4000/calendars
# Then set PLAYWRIGHT_STORAGE_STATE=tests/visual/.auth/admin.json before running full route baselines.

echo "visual-audit: running Playwright smoke (route tests skip when no server on :${PORT}) ..."
npx playwright install chromium
npx playwright test --config=playwright.visual.config.ts "$@"
