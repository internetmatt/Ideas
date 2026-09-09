#!/usr/bin/env bash
# Ideas local stack for Cloud Agents and operator hosts.
#
# Port map:
#   3010 OpenIdeas (primary)     ↔ Ideas WebUI :3011 (foreground — keeps start alive)
#   3013 OpenIdeas (whitelabel)  ↔ Ideas WebUI :3012 (background, optional)
#
# Multi-tenant production routing stays in Projecto runtime + Ideas Admin (separate
# monorepo). This script only boots isolated local cores for dev / whitelabel QA.
set -euo pipefail

export PATH="${HOME}/.bun/bin:${HOME}/.local/bin:${PATH}"

IDEAS_DIR="${IDEAS_DIR:-/workspace}"
OPENIDEAS_DIR="${OPENIDEAS_DIR:-${HOME}/src/OpenIdeas}"
WHITELABEL_STACK="${IDEAS_START_WHITELABEL_STACK:-1}"
OPENIDEAS_PRIMARY_PORT="${OPENIDEAS_PRIMARY_PORT:-3010}"
OPENIDEAS_WHITELABEL_PORT="${OPENIDEAS_WHITELABEL_PORT:-3013}"
IDEAS_PRIMARY_PORT="${IDEAS_PRIMARY_PORT:-3011}"
IDEAS_WHITELABEL_PORT="${IDEAS_WHITELABEL_PORT:-3012}"

wait_for_openideas() {
  local port="$1"
  local label="$2"
  local i
  for i in $(seq 1 60); do
    if curl -sf --max-time 2 "http://127.0.0.1:${port}/api/v1/ping" >/dev/null 2>&1; then
      echo "[cloud-agent-start-stack] ${label} ready on :${port}"
      return 0
    fi
    sleep 1
  done
  echo "[cloud-agent-start-stack] ${label} did not respond on :${port}/api/v1/ping" >&2
  return 1
}

start_openideas() {
  local port="$1"
  local data_dir="$2"
  local label="$3"
  mkdir -p "${data_dir}"
  if curl -sf --max-time 2 "http://127.0.0.1:${port}/api/v1/ping" >/dev/null 2>&1; then
    echo "[cloud-agent-start-stack] ${label} already listening on :${port}"
    return 0
  fi
  if [[ ! -d "${OPENIDEAS_DIR}/packages/server" ]]; then
    echo "[cloud-agent-start-stack] OpenIdeas missing at ${OPENIDEAS_DIR}; run scripts/cloud-agent-openideas-install.sh" >&2
    exit 1
  fi
  (
    cd "${OPENIDEAS_DIR}"
    export PORT="${port}"
    export DATABASE_PATH="${data_dir}"
    exec pnpm start
  ) &
  wait_for_openideas "${port}" "${label}"
}

start_ideas_webui() {
  local port="$1"
  local flowise_url="$2"
  local product_name="$3"
  local whitelabel="${4:-}"
  local multi="${5:-0}"

  if curl -sf --max-time 2 "http://127.0.0.1:${port}/" >/dev/null 2>&1; then
    echo "[cloud-agent-start-stack] Ideas WebUI already listening on :${port}"
    return 0
  fi

  export AIONUI_PORT="${port}"
  export AIONUI_FLOWISE_URL="${flowise_url}"
  export AIONUI_PRODUCT_NAME="${product_name}"
  export AIONUI_NO_BUILD=1
  export AIONUI_OPEN_BROWSER=0
  export AIONUI_BACKEND_BIN="${HOME}/.local/bin/aioncore"
  if [[ -n "${whitelabel}" ]]; then
    export AIONUI_WHITELABEL="${whitelabel}"
  else
    unset AIONUI_WHITELABEL || true
  fi
  if [[ "${multi}" == "1" ]]; then
    export AIONUI_MULTI_INSTANCE=1
  else
    unset AIONUI_MULTI_INSTANCE || true
  fi

  (
    cd "${IDEAS_DIR}"
    exec bun run webui -- --no-build --no-open --port "${port}"
  ) &
  echo "[cloud-agent-start-stack] Ideas WebUI (${product_name}) starting on :${port} → OpenIdeas ${flowise_url}"
}

start_openideas "${OPENIDEAS_PRIMARY_PORT}" "${HOME}/.openideas-data" "OpenIdeas primary"

if [[ "${WHITELABEL_STACK}" == "1" ]]; then
  start_openideas "${OPENIDEAS_WHITELABEL_PORT}" "${HOME}/.openideas-data-whitelabel" "OpenIdeas whitelabel"
  start_ideas_webui \
    "${IDEAS_WHITELABEL_PORT}" \
    "http://127.0.0.1:${OPENIDEAS_WHITELABEL_PORT}" \
    "${AIONUI_WHITELABEL_PRODUCT_NAME:-Projecto}" \
    "${AIONUI_WHITELABEL_PROFILE:-projecto}" \
    1
fi

# Foreground process — Cloud Agent start must stay attached on the primary Ideas port.
export AIONUI_PORT="${IDEAS_PRIMARY_PORT}"
export AIONUI_FLOWISE_URL="http://127.0.0.1:${OPENIDEAS_PRIMARY_PORT}"
export AIONUI_PRODUCT_NAME="${AIONUI_PRODUCT_NAME:-Ideas}"
export AIONUI_NO_BUILD=1
export AIONUI_OPEN_BROWSER=0
export AIONUI_BACKEND_BIN="${HOME}/.local/bin/aioncore"
unset AIONUI_MULTI_INSTANCE || true
unset AIONUI_WHITELABEL || true

cd "${IDEAS_DIR}"
exec bun run webui -- --no-build --no-open --port "${IDEAS_PRIMARY_PORT}"
