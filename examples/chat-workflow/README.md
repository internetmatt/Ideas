# Chat + Workflow Session (prototype)

Browser prototype for the Ideas fork vision: **an AionUi chat session with a Flowise-style, buildable, runnable workflow attached to that same session**.

## What this demos

- One session owns both the chat transcript and a node graph
- Build a workflow on the canvas (session input → LLM / tool / branch → reply)
- **Run** the graph; step highlights stream into the chat as the assistant turn
- Edit the graph mid-session without leaving the conversation

## Run

```bash
cd examples/chat-workflow
python3 -m http.server 4173
```

Open [http://localhost:4173](http://localhost:4173).

No npm/Bun required — static HTML/CSS/JS so it runs under restricted egress.

## E2E + snapshots

Zero-dependency CDP runner (system Chrome, no Playwright install):

```bash
node examples/chat-workflow/e2e/run.mjs
# refresh PNG baselines:
UPDATE_SNAPSHOTS=1 node examples/chat-workflow/e2e/run.mjs
```

Baselines live in `examples/chat-workflow/__snapshots__/`:

| Snapshot              | Scene                              |
| --------------------- | ---------------------------------- |
| `01-initial-load.png` | Seeded chat + 4-node graph         |
| `02-after-send.png`   | After sending a user message       |
| `03-after-run.png`    | After Run workflow (steps + reply) |
| `04-after-reset.png`  | After Reset                        |

Playwright twin (needs `@playwright/test`):

```bash
npx playwright test examples/chat-workflow/e2e/chat-workflow.e2e.ts
```

## Next integration (into AionUi)

1. Persist `workflow` JSON on `TChatConversation.extra` (aioncore)
2. Mount this canvas as a `ChatLayout` side panel (same slot as Preview)
3. Swap the mock runner for Flowise `buildChatflow` / agentflow execution
4. Ship via WebUI (`bun run webui`) once registry egress is available

## Real fork integration

The production attach points now live in the AionUi desktop package (this Ideas fork):

- Full-page canvas route: `#/flowise` (`packages/desktop/src/renderer/pages/flowise`)
- Session-bound panel: conversation header **Canvas** toggle → `conversation.extra.session_workflow`
- Flowise URL resolution: `packages/desktop/src/renderer/services/flowise/resolveFlowiseUrl.ts`
  - Default Flowise base: `http://127.0.0.1:3010` (Ideas WebUI is **3011**; Projecto shell-router is **3000**)

This `examples/chat-workflow` demo remains a zero-dep UX sandbox / snapshot harness.
