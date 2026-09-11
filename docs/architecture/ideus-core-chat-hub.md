# Ideas ↔ AskDilly-Core Chat Hub

Thin contract so Ideas cowork (`:3011`) can sit beside AskDilly-Core Chat Hub
(`:5678` / `:15678`) without pretending they share a runtime.

Types: `packages/desktop/src/common/chat/ideusChatHub.ts`.
Shared labels: `CHAT_HUB_NAME` / `AGENTS_NAME` in `packages/desktop/src/common/branding.ts`.

## Surfaces

| Ideus name | Core | Ideas |
| --- | --- | --- |
| **Chat Hub** | `/home/chat`, `/home/chat/:id` | Conversation list (WebUI + desktop) |
| **Agents** | `/home/agents` → Overview (`/home/workflows`) | Settings → Agents (local / remote coding agents) |
| **OpenIdeas canvas** | `workflow.meta.engine === 'flowise'` + `externalFlowId` | Not this repo — see internetmatt/OpenIdeas `:3010` |

Do not map Ideas Agents onto Core workflow rows. The word is shared chrome only.

## Session DTO

| Core `ChatHubSessionDto` | Ideas `TChatConversation` |
| --- | --- |
| `id` | `id` |
| `title` | `name` |
| `chatProjectId` | `project_id` |
| `pinned` / `pinnedAt` | `extra.pinned` / `extra.pinned_at` (ms) |
| `agentName` | `extra.agent_name` |
| `createdAt` / `updatedAt` (ISO) | `created_at` / `modified_at` (ms) |
| `workflowId` / `agentId` | unused on Ideas (OpenIdeas / Core canvas) |

Core timestamps are ISO strings. Ideas uses epoch milliseconds. The mapper
converts both ways; it does not persist.

## Ports

| Port | Owner |
| --- | --- |
| 3011 | Ideas WebUI (`AIONUI_PORT` / `WEBUI_DEFAULT_PORT`) |
| 3012 | Ideas whitelabel |
| 3010 | OpenIdeas |
| 5678 / 15678 | AskDilly-Core |

## Sequencing

This note unblocks a later Ideas ↔ Core conversation bridge in parallel with
the OpenIdeas canvas swap on `wt-flowise-replacement`. Do not file PLAT-245/25*
from this PR — those stay on the Core / Atlas board.
