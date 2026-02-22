# Project 1: Runtime Monitor - Implementation Plan
**Date:** February 17, 2026
**Decision:** Option A - Focus on Runtime Monitor Only

## Quick Verdict

Your local AI's recommendation (Option A — focus on Project 1: Runtime Monitor) is the right call. It gives immediate value, reduces scope, and creates a stable foundation you can extend later into the Workflow Builder.

## Why Option A is Best

| Option | Pros | Cons |
|--------|------|------|
| A — Focus on Runtime Monitor | Fast delivery; immediate debugging value; simpler scope; easier to test and harden; forms a stable base for Project 2. | Delays visual workflow features; may require later refactor to integrate UI/LLM features. |
| B — Move code and start fresh | Keeps history; clean separation; less risk of breaking current work. | Extra overhead to migrate; slower initial progress. |
| C — Two projects in parallel | Parallel progress on both goals. | Higher complexity, context switching, slower delivery, more bugs. |

**Recommendation:** Proceed with Option A now. Build a robust Runtime Monitor, then add Workflow Builder on top of it.

## Project 1: Runtime Monitor — Scope, Tech, and Architecture

**Goal:** Real-time monitoring and debugging for Python apps and other desktop processes: function tracing, parameters, timing, errors, and a desktop UI for live inspection.

### Core Features (MVP):

1. Lightweight agent to instrument Python processes (and optionally other apps).
2. Function tracing: call entry/exit, args, return values, exceptions, execution time.
3. Error capture: stack traces, exception context, local variables snapshot.
4. Live telemetry: streaming logs, metrics, and traces to a UI.
5. Desktop UI: process list, live trace viewer, timeline, variable inspector, search/filter.
6. Persistence: SQLite for sessions and traces; export to YAML for human edits.
7. Plugin hook: simple extension API so Workflow Builder can later consume traces.

### Recommended Tech Stack

- **Agent / instrumentation:** Python (use sys.settrace, sys.setprofile, or wrapt), or use pyinstrument/opentelemetry hooks for lower overhead.
- **IPC / transport:** WebSocket or gRPC for streaming telemetry from agent → UI. For simplicity start with WebSocket (JSON messages).
- **UI:** WPF (.NET 7) for native Windows UI, or Electron/React if you prefer web tech. WPF recommended if you want deep Windows integration and performance.
- **Storage:** SQLite canonical store; YAML export for human edits.
- **Plugin interface:** JSON-RPC over WebSocket or local REST for extensions.

### Security & Safety

- Agent must require explicit opt-in per process.
- Limit captured data by default (no secrets); provide redaction options.
- Signed installers and permission prompts for production use.

## 2-Week Implementation Plan (Daily Milestones)

### Week 1 — Core Agent + Basic UI

- **Day 1:** Scaffold repo: monitor-agent (Python), monitor-ui (WPF/.NET or Electron). Add CI, linting, and SQLite dependency.
- **Day 2:** Implement minimal agent that attaches to a Python process and sends a heartbeat over WebSocket.
- **Day 3:** Add function tracing in agent: emit call_enter, call_exit, exception events (include timestamp, function name, module, args summary).
- **Day 4:** Build simple UI that lists running agents/processes and shows incoming events in a console view.
- **Day 5:** Persist events to SQLite; implement basic query and timeline view in UI.
- **Day 6:** Add filtering (by module, function name) and search in UI.
- **Day 7:** Buffering and reconnect logic; basic tests for agent attach/detach.

### Week 2 — Polishing, Error Capture, and Plugin Hook

- **Day 8:** Capture exception stack traces and local variables snapshot (configurable depth).
- **Day 9:** Add execution timing metrics and per-function histogram aggregation.
- **Day 10:** Implement session export to YAML and import back into SQLite; add unit tests for round-trip.
- **Day 11:** Add a variable inspector panel and ability to expand captured locals.
- **Day 12:** Implement a simple plugin hook: UI can call a local extension with selected trace context (JSON-RPC).
- **Day 13:** UX polish: highlight slow functions, add color-coded severity, and add basic documentation.
- **Day 14:** Acceptance testing, bug fixes, and prepare a small demo build.

## Deliverables at End of 2 Weeks

1. Working agent that instruments Python processes and streams traces.
2. Desktop UI that shows live traces, timeline, and variable inspector.
3. SQLite persistence and YAML export/import.
4. Basic plugin hook and documentation for how to extend.

## Acceptance Criteria (How You'll Know It's Done)

- Agent can attach to a running Python process and stream function events to the UI.
- UI displays live events, supports filtering, and highlights slow calls.
- Exceptions are captured with stack traces and local variable snapshots.
- Session data persists to SQLite and can be exported/imported as YAML without data loss.
- Plugin hook accepts a trace context and returns a response; plugin crashes do not crash the UI.

## Concrete Prompts to Give Your Local LLM (Copy/Paste)

### Scaffold Repo
```
Create a repository with two projects: monitor-agent (Python) and monitor-ui (WPF .NET 7). Add a shared schema package for JSON messages. Include a simple README and CI pipeline.
```

### Agent: Basic Tracing
```
Implement a Python agent that uses sys.settrace to emit JSON events over WebSocket to ws://localhost:8765. Events: call_enter, call_exit, exception. Include timestamp, pid, thread id, module, function, args summary, return value (if available), and duration on exit.
```

### UI: WebSocket Receiver
```
Create a WPF .NET 7 app that connects to ws://localhost:8765, lists connected agents, and displays incoming events in a scrolling console. Persist events to SQLite with tables: sessions, events, traces.
```

### Exception Capture
```
Extend the agent to capture exception stack traces and a snapshot of local variables (configurable max depth and size). Send exception events with full stack frames and locals.
```

### YAML Export/Import
```
Implement ExportSessionToYaml(sessionId, path) and ImportSessionFromYaml(path) in the persistence layer. Validate round-trip integrity with unit tests.
```

### Plugin Hook
```
Add a plugin API: UI can POST selected trace JSON to a local plugin endpoint (JSON-RPC). Provide a sample plugin that receives trace context and returns a short analysis string.
```

## Minimal Data Model (For LLM to Implement)

```yaml
Session:
  id: string
  agent_pid: int
  started_at: timestamp

Event:
  id: string
  session_id: string
  type: call_enter|call_exit|exception|heartbeat
  timestamp: timestamp
  module: string
  function: string
  thread_id: int
  payload: json  # args summary, return, stack, locals, duration
```

## Next Steps for You Right Now

1. **Confirm Option A** (you already signaled interest — proceed).
2. **Drop PROJECT_PLAN_2026-02-17.md** and the prompts above into your local LLM and run the Scaffold repo prompt.
3. **Start with the agent heartbeat** and a minimal UI console so you can see live events quickly.
4. **Share the first scaffolded code** or any errors and I'll provide targeted code snippets (agent tracing, WebSocket server/client, SQLite schema, YAML export) and debugging help.

## Current Project Status

**Current Directory:** `windsurf-project-13`
**Current State:** Has basic Node.js/Electron setup that needs to be refactored to match this plan.
**Next Action:** Simplify current code to focus on Python agent + desktop UI monitoring only.
