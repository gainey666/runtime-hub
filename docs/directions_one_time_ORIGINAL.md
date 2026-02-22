You are an automated code editor. Edit the file auto-clicker-tool/src/api-server.js and apply the following changes exactly. Produce three outputs in this order: (A) a unified diff patch (git-style) that can be applied with git apply, (B) the full updated file contents, and (C) a short changelog (5–8 lines) describing what you changed and why. Do not modify any other files.

Context and constraints

    Keep the existing coding style and CommonJS module format.

    Target Node.js 18+ (global fetch available). If you add a runtime check for fetch, keep it minimal.

    Do not add new npm dependencies.

    Preserve existing log emojis and messages where possible.

    Ensure edits are safe to run in a development environment; add a DRY_RUN mode that prevents OS events.

    Make async functions await where appropriate and handle promise rejections.

    Keep changes minimal and focused to implement the fixes below.

Required fixes and features

    Fix event wiring

        Remove reliance on this.autoClicker for session events. When creating a session in POST /api/auto-clicker/start, attach event handlers to that session's clicker instance. Handlers must include the sessionId in logs and webhook payloads.

    Make engine require path portable

        Replace the hardcoded absolute require path with a relative path using path.join(__dirname, '..', '..', 'windsurf-project-13', 'src', 'core', 'auto-clicker', 'auto-clicker-engine'). Use require() with that computed path.

    Validate config.area before destructuring

        In validateConfig, check config and config.area exist and are objects before destructuring. Throw a clear error if missing.

    Await async engine methods

        Treat start, stop, saveConfig, and loadConfig as possibly async. Use await and handle errors.

    Add emergency stop and dry run

        Add this.EMERGENCY_STOP and this.DRY_RUN flags in the constructor. DRY_RUN should be enabled when process.env.DRY_RUN === '1'.

        Add POST /api/emergency-stop that sets EMERGENCY_STOP = true, stops all sessions (awaiting stop()), and returns a JSON confirmation.

        Add a helper sendOsEvent or executeAction wrapper that logs and no-ops when DRY_RUN is true. Use it where OS events would be sent by the engine if applicable; at minimum, ensure start uses DRY_RUN to avoid real OS events during tests.

    Per-session rate limiter

        Add a simple per-session action counter with a default maxPerMinute = 120. Expose a helper allowAction(sessionId) and call it before dispatching actions or before starting a session if appropriate. Return HTTP 429 when limit exceeded.

    Webhook validation and session existence check

        In POST /api/webhook/:sessionId, validate that sessionId exists in this.sessions and that url is a valid http or https URL before storing.

    Remove or repurpose this.autoClicker

        If this.autoClicker is unused for session work, remove it from the constructor and setupEventHandlers. If you keep it, clearly mark it as a global monitor and do not rely on it for per-session events.

    Await stop for all sessions

        In the stop-all branch, await each session.clicker.stop() and collect results.

    Robust start binding error handling

        Ensure tryListen() does not throw inside the error handler; instead log and process.exit(1) after exhausting attempts.

Output formatting requirements

    Part A: Unified diff only. Start with *** Begin Patch and end with *** End Patch. The diff must be applicable to the original file path auto-clicker-tool/src/api-server.js.

    Part B: Full updated file content inside a fenced code block labeled with the filename.

    Part C: Changelog as a short bullet list.

Tests to run after applying patch

    Set dry run and start server:
    Code

    DRY_RUN=1 node auto-clicker-tool/src/api-server.js
    curl -s http://localhost:3001/health

    Start a session (dry run) and then stop it:
    Code

    curl -X POST -H "Content-Type: application/json" -d '{"area":{"x":0,"y":0,"width":100,"height":100}}' http://localhost:3001/api/auto-clicker/start
    curl -X POST http://localhost:3001/api/auto-clicker/stop/<sessionId>

    Trigger emergency stop:
    Code

    curl -X POST http://localhost:3001/api/emergency-stop

If anything cannot be implemented because the engine API is unknown

    Make minimal, safe assumptions: start(config) returns a Promise, stop() returns a Promise resolving to stats, saveConfig(name, config) and loadConfig(name) are async. Add comments where assumptions are made.

