# Ideas — Ideus packaging

Ideas is the Ideus cowork surface. **Origin:** [github.com/internetmatt/Ideas](https://github.com/internetmatt/Ideas). Apache-2.0 upstream is iOfficeAI/AionUi.

Do not treat this checkout as upstream AionUi. Token sources and local ports are Ideus-mapped.

## Docs this repo owns

| Surface | Path | Published to VitePress? |
| --- | --- | --- |
| This packaging card | `docs/IDEUS-PACKAGING.md` | Yes — synced to `/family/ideas` |
| Chat Hub contract | `docs/architecture/ideus-core-chat-hub.md` | **No** (stay here; wiki links) |
| Product / architecture docs | `docs/` (`guides/`, `architecture/`, `prds/`, `specs/`) | **No** (stay here; wiki links, does not vendor the tree) |
| Contributor rules | `AGENTS.md`, `CONTRIBUTING.md` | No |

## Local

| Surface | URL / port |
| --- | --- |
| Ideas WebUI | http://localhost:3011 (`AIONUI_PORT`, default `WEBUI_DEFAULT_PORT`) |
| Ideas whitelabel WebUI | :3012 (`AIONUI_MULTI_INSTANCE=1`) |

Start from this repo’s docs: `docs/README.md` and `docs/contributing/development.md`.

## Chat Hub / Agents (shared with Core)

- **Chat Hub** — Core `/home/chat`. Ideas conversations are the cowork analog. Mapper: `packages/desktop/src/common/chat/ideusChatHub.ts`.
- **Agents** — shared chrome label. Core `/home/agents` redirects to workflows; Ideas Agents are local/remote coding agents. Do not conflate them.

## Design tokens

Figma catalog id: `ideas`. Brand / primary tokens use AskDilly-Core `--color--dilly-orange-500` (`#f99334`) in `packages/desktop/src/renderer/styles/themes/default-color-scheme.css`. Snapshot + bridge live in sibling **Core-Framework** (`pnpm ideus:snapshot`, `pnpm ideus:bridge` on `:4317`). Cloud file: [Ideus Studio](https://www.figma.com/design/ttvYCRmdUkdGSPQEWhSbQG).

## Publish boundary

- **Do** keep a packaging card here so AskDilly-Core VitePress can sync it.
- **Do not** dump this `docs/` tree into `@ideus/platform-docs`.
- **No OpenAPI** is published from Ideas.

Aggregator: sibling `AskDilly-Core/docs` (`pnpm docs:sync-family`). After sync, VitePress serves this card at `/family/ideas` and the narrative at `/ideus-wiki/architecture/product-family`.
