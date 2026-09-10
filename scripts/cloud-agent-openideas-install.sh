#!/usr/bin/env bash
# Clone, install, and build internetmatt/OpenIdeas for Ideas canvas sidecars.
# Primary engine :3010 (Ideas WebUI :3011). Whitelabel engine :3013 (Ideas :3012).
set -euo pipefail

export PATH="${HOME}/.bun/bin:${HOME}/.local/bin:${PATH}"
export PUPPETEER_SKIP_DOWNLOAD=1
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

OPENIDEAS_REPO="${OPENIDEAS_REPO:-https://github.com/internetmatt/OpenIdeas.git}"
OPENIDEAS_DIR="${OPENIDEAS_DIR:-${HOME}/src/OpenIdeas}"
OPENIDEAS_REF="${OPENIDEAS_REF:-main}"

ensure_pnpm() {
  if command -v pnpm >/dev/null 2>&1; then
    return 0
  fi
  if command -v corepack >/dev/null 2>&1; then
    corepack enable >/dev/null 2>&1 || true
    corepack prepare pnpm@10.33.3 --activate >/dev/null 2>&1 || true
  fi
  if ! command -v pnpm >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
    npm install -g pnpm@10.33.3
  fi
  command -v pnpm >/dev/null 2>&1
}

if ! command -v node >/dev/null 2>&1; then
  echo "[cloud-agent-openideas-install] node is required but not on PATH" >&2
  exit 1
fi

if ! ensure_pnpm; then
  echo "[cloud-agent-openideas-install] pnpm is required but could not be installed" >&2
  exit 1
fi

mkdir -p "$(dirname "${OPENIDEAS_DIR}")"

if [[ ! -d "${OPENIDEAS_DIR}/.git" ]]; then
  git clone --depth 1 --branch "${OPENIDEAS_REF}" "${OPENIDEAS_REPO}" "${OPENIDEAS_DIR}"
elif [[ -n "${OPENIDEAS_REF}" ]]; then
  git -C "${OPENIDEAS_DIR}" fetch --depth 1 origin "${OPENIDEAS_REF}" >/dev/null 2>&1 || true
  git -C "${OPENIDEAS_DIR}" checkout "${OPENIDEAS_REF}" >/dev/null 2>&1 || true
fi

cd "${OPENIDEAS_DIR}"
pnpm install --frozen-lockfile
pnpm build

mkdir -p "${HOME}/.openideas-data" "${HOME}/.openideas-data-whitelabel"

echo "[cloud-agent-openideas-install] ready (openideas=${OPENIDEAS_DIR}; pnpm=$(pnpm --version); node=$(node --version))"
