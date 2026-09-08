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

## Next integration (into AionUi)

1. Persist `workflow` JSON on `TChatConversation.extra` (aioncore)
2. Mount this canvas as a `ChatLayout` side panel (same slot as Preview)
3. Swap the mock runner for Flowise `buildChatflow` / agentflow execution
4. Ship via WebUI (`bun run webui`) once registry egress is available
