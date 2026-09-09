#!/usr/bin/env bash
set -euo pipefail
export PATH="${HOME}/.bun/bin:${HOME}/.local/bin:${PATH}"

if ! command -v bun >/dev/null 2>&1; then
  curl -fsSL https://bun.sh/install | bash
  export PATH="${HOME}/.bun/bin:${PATH}"
fi

bun install --frozen-lockfile

AIONCORE_VER="${AIONCORE_VERSION:-v0.2.1}"
AIONCORE_ASSET="aioncore-${AIONCORE_VER}-x86_64-unknown-linux-gnu.tar.gz"
AIONCORE_URL="https://github.com/iOfficeAI/AionCore/releases/download/${AIONCORE_VER}/${AIONCORE_ASSET}"
mkdir -p "${HOME}/.local/bin" resources/bundled-aioncore/linux-x64

if [[ ! -x "${HOME}/.local/bin/aioncore" ]]; then
  tmp="$(mktemp -d)"
  curl -fL --retry 3 -o "${tmp}/aioncore.tgz" "${AIONCORE_URL}"
  tar -xzf "${tmp}/aioncore.tgz" -C "${tmp}"
  install -m 755 "${tmp}/aioncore" "${HOME}/.local/bin/aioncore"
  rm -rf "${tmp}"
fi

cp -f "${HOME}/.local/bin/aioncore" resources/bundled-aioncore/linux-x64/aioncore
chmod +x resources/bundled-aioncore/linux-x64/aioncore

if [[ ! -f out/renderer/index.html ]]; then
  bun run package
fi

if [[ "${CLOUD_AGENT_INSTALL_OPENIDEAS:-1}" == "1" ]]; then
  bash "$(dirname "$0")/cloud-agent-openideas-install.sh"
fi

echo "[cloud-agent-install] ready (bun=$(bun --version); aioncore=$(command -v aioncore))"
