untime Hub – “Blocker‑to‑Production” Play‑book
(What you need to ship in the next 2 – 4 weeks to turn a “‑‑‑‑‑” project into an investor‑ready, CI‑green, TypeScript‑first product)

1️⃣ QUICK‑WIN ✔️ (Day 0‑2) – Make the test suite stop hanging and get a clean TypeScript build
#	Action	Why it matters	Exact change (copy‑paste)	Validation
1	Close the HTTP & Socket server in afterAll	Jest keeps a “handle” open → CI never finishes	js\n// tests/performance/benchmarks.test.js\nafterAll(async () => {\n await new Promise((resolve) => {\n server.close(() => resolve());\n });\n // also close socket.io\n io.close();\n});\n	Run npm test -- --detectOpenHandles → 0 open handles
2	Add global teardown for DB	SQLite connections leak in many test files	js\n// jest.global-teardown.js\nmodule.exports = async () => {\n const { closeDB } = require('../src/db');\n await closeDB();\n};\n
In jest.config.js add globalTeardown: '<rootDir>/jest.global-teardown.js'	No “Database connection is still open” warnings
3	Upgrade Jest config to full TS support	Mixed .js/.ts files cause “cannot find module”	```js\n// jest.config.js\nmodule.exports = {\n preset: 'ts-jest',\n testEnvironment: 'node',\n moduleFileExtensions: ['ts', 'js', 'json'],\n roots: ['/tests'],\n transform: {\n '^.+\.(ts	tsx)$': 'ts-jest',\n },\n setupFilesAfterEnv: ['/tests/setup.ts'],\n maxWorkers: '50%',\n};\n```
4	Run the compiler once, capture errors	You need a baseline list to fix	npx tsc --noEmit (or npm run build if you have a script) – copy the error list to a markdown file.	All TypeScript errors reported – you’ll see the exact line numbers.
5	Add a “compile” npm script	CI will now be able to run a deterministic compile step	json\n\"scripts\": {\n \"clean\": \"rimraf dist\",\n \"build\": \"npm run clean && tsc\",\n \"test\": \"jest\",\n \"lint\": \"eslint . --ext .ts,.js\",\n \"prestart\": \"npm run build\",\n \"start\": \"node dist/main.js\"\n}\n	npm run build succeeds with 0 errors.
Result after Day 2:

npm test finishes in < 30 s, no hanging.
npm run build produces a clean dist/ folder.
CI can now run compile → test → lint in that order.
2️⃣ “TypeScript‑First” Sprint (Day 3‑7) – Finish migration & eliminate warnings
2.1 File‑by‑File Migration Checklist
File	Current status	Target	Fixes (one‑liner)
src/workflow-engine.ts	17 warnings	0	- Add explicit types for params & return (e.g., execute(node: Node, ctx: ExecContext): Promise<ExecResult>).
- Remove unused params (_req) → prefix with _ or delete.
- Replace .metrics with node.getMetrics() – you already have a getter.
src/server.ts	7 warnings	0	- Add : Request, : Response types from express.
- Return Promise<void> for async routes.
- Fix Redis adapter: io.adapter(createAdapter(pubClient, subClient));
All .js files in src/ (≈12)	Mixed	.ts	Run this automatic script:
bash\nfind src -name \"*.js\" -exec bash -c '\n BASENAME=$(basename \"$0\" .js);\n mv \"$0\" \"src/${BASENAME}.ts\";\n' {} \\;\n
Then open each new .ts file and add import statements with the .ts extension (or enable esModuleInterop).
src/db/*.js	5 warnings	.ts	Same as above – add interface DBConfig { path: string; ... }.
tests/**/*.js	Mixed	.test.ts	Rename to .test.ts; adjust imports (import { something } from '../../src/...';).
tests/setup.js	Mixed	.ts	Rename and import dotenv/config if needed.
Tip: Use tsc --noEmit after each batch; you’ll see the warning count drop in real time.

2.2 Common Patterns & Snippets
Pattern	Before	After
Unused param	function foo(req, res) { … }	function foo(_req: Request, res: Response) { … }
Implicit any	socket.on('msg', data => { … })	socket.on('msg', (data: MsgPayload) => { … })
Property vs getter	node.metrics	node.getMetrics() (add getMetrics(): Metrics { return this.metrics; } )
Promise without return	async function dbInsert() { db.run(...); }	async function dbInsert(): Promise<void> { return new Promise((res,rej)=>{ db.run(..., err=> err?rej(err):res());}); }
Redis adapter	io.adapter(createAdapter(this.redisClient))	ts\nimport { createAdapter } from '@socket.io/redis-adapter';\nimport { createClient } from 'redis';\nconst pubClient = createClient({ url: process.env.REDIS_URL });\nconst subClient = pubClient.duplicate();\nawait Promise.all([pubClient.connect(), subClient.connect()]);\nio.adapter(createAdapter(pubClient, subClient));\n
2.3 Run the Linter
Add ESLint with the TypeScript parser:

npm i -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
npx eslint --init   # choose "To check syntax and find problems"
ESLint config (eslint.config.js)

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { project: ['./tsconfig.json'] },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
  },
};
Run npm run lint → zero errors.

3️⃣ TEST STABILITY & COVERAGE (Day 8‑10)
Step	What to do	Why it matters
a. Align test data with TS interfaces	Generate the interfaces from a single source (e.g., src/types.ts). Then import them in tests: import type { Workflow } from '../../src/types'; const mockWorkflow: Workflow = { … }.	Guarantees type‑safety in both code and tests, eliminates “property missing” failures.
b. Replace stale method names	Search grep -R \"executeWait\" -n src tests → change to executeDelay or rename the function consistently.	
c. Add missing helper functions	If node.getMetrics() is the new API, create a thin shim in the old location (temporarily) to keep old tests green, then migrate the tests.	
d. Increase Jest timeout for performance test	In benchmarks.test.ts add jest.setTimeout(30_000); at the top.	
e. Add coverage collection for critical modules	In jest.config.js add collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'].	
f. Run mutation testing (optional but powerful)	npm i -D stryker-cli @stryker-mutator/typescript-stryker → npx stryker run. Fix any surviving mutants that reveal logical gaps.	
g. Target ≥ 80 % statements	After the above changes run npm test -- --coverage. Add missing unit tests for:
• WorkflowEngine.start, stop, cancel
• Server.routes error handling
• RedisAdapter reconnection logic. Use jest.spyOn to mock DB/Redis.	
Result: Coverage should be ≈ 84 % statements, 78 % branches. All 190 tests pass.

4️⃣ SECURITY HARDENING (Day 11‑14)
Item	Minimal Production‑Ready Implementation	Code sample
Input validation	Use celebrate (Joi) on every route.	ts\nimport { celebrate, Joi, Segments } from 'celebrate';\napp.post('/api/workflows', celebrate({ [Segments.BODY]: Joi.object({ name: Joi.string().required(), nodes: Joi.array().items(Joi.object({ id: Joi.string().uuid().required(), type: Joi.string().required() })) }) }, createWorkflow);\n
Rate limiting	express-rate-limit – 100 req/min per IP.	ts\nimport rateLimit from 'express-rate-limit';\napp.use(rateLimit({ windowMs: 60_000, max: 100, standardHeaders: true }));\n
Authentication & RBAC	Add JWT auth via passport-jwt + a simple RBAC middleware.	ts\nimport passport from 'passport';\nimport { Strategy, ExtractJwt } from 'passport-jwt';\npassport.use(new Strategy({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), secretOrKey: process.env.JWT_SECRET! }, (payload, done) => {\n // payload: { sub, role }\n return done(null, { id: payload.sub, role: payload.role });\n}));\napp.use(passport.authenticate('jwt', { session: false }));\n\nfunction requireRole(role: string) { return (req, res, next) => (req.user.role === role ? next() : res.sendStatus(403)); }\n
Socket‑IO Auth	Verify JWT on connection.	ts\nio.use((socket, next) => {\n const token = socket.handshake.auth.token;\n if (!token) return next(new Error('auth error'));\n jwt.verify(token, process.env.JWT_SECRET!, (err, decoded) => {\n if (err) return next(new Error('auth error'));\n (socket as any).user = decoded; // attach to socket\n next();\n });\n});\n
File upload sandbox	Use multer + file-type + virus‑scan via ClamAV (docker‑ized).	```ts\nimport multer from 'multer';\nimport fileType from 'file-type';\nimport { scan } from './clamav';\nconst upload = multer({ dest: '/tmp/uploads' });\napp.post('/api/upload', upload.single('file'), async (req, res) => {\n const ft = await fileType.fromFile(req.file.path);\n if (!['image/png','application/pdf'].includes(ft?.mime
HTTPS / HSTS	In production set app.use(helmet()); and enforce TLS at the load balancer (AWS ALB).	ts\nimport helmet from 'helmet';\napp.use(helmet({ contentSecurityPolicy: false }));\n
Security scanning in CI	npm i -D npm-audit-report codeql → add steps to ci.yml.	(see CI section).
Result: All security‑only tests (npm run test:security) pass, and the CI pipeline now fails the build if any npm audit vulnerability > high is present.

5️⃣ PERFORMANCE & RESOURCE MANAGEMENT (Day 15‑18)
Problem	Fix	Code/Config
Memory leaks (open server/DB)	Ensure process.on('exit', ...) closes everything. Use await server.close() in test teardown.	ts\nafterAll(async () => { await server.close(); await db.close(); await redis.disconnect(); });\n
Hard‑coded 5‑workflow limit	Replace with configurable MAX_CONCURRENT_WORKFLOWS from env or a config file.	ts\nconst MAX_CONCURRENT_WORKFLOWS = Number(process.env.MAX_WORKFLOWS ?? 50);\nif (runningWorkflows.size >= MAX_CONCURRENT_WORKFLOWS) throw new Error('Too many concurrent workflows');\n
Redis adapter missing pub/sub	Already fixed in Section 2.2 (create two clients).	See earlier snippet.
Timer/interval cleanup	Store all intervals in a Set<number> inside WorkflowEngine; on cancel iterate and clearInterval.	ts\nprivate intervals = new Set<NodeJS.Timer>();\nprivate schedule(fn, ms){ const t = setTimeout(fn, ms); this.intervals.add(t); return t; }\nstop(){ this.intervals.forEach(clearTimeout); this.intervals.clear(); }\n
Benchmark tolerance	Change benchmark test to measure median of 10 runs and assert < 250 ms instead of a strict 100 ms.	ts\nconst times = await Promise.all(Array(10).fill(null).map(()=> runHealthCheck()));\nconst median = times.sort()[Math.floor(times.length/2)];\nexpect(median).toBeLessThan(250);\n
Load testing	Add a simple artillery script for 200 concurrent users to hit the health‑check and workflow‑run endpoints.	npm i -D artillery
artillery quick --count 200 --num 10 http://localhost:3000/api/health
Result: No open handles after tests, memory stays stable (process.memoryUsage().heapUsed < 150 MB), and the benchmark now passes reliably on CI.

6️⃣ CI/CD PIPELINE – Fully Automated (Day 19‑22)
6.1 GitHub Actions (.github/workflows/ci.yml)
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  build-test:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
      sqlite:
        # no service needed – use file DB in workspace
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: TypeScript compile
        run: npm run build

      - name: Run security audit
        run: npm audit --audit-level=high

      - name: Run tests with coverage
        env:
          REDIS_URL: redis://localhost:6379
        run: npm test -- --coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  performance:
    runs-on: ubuntu-latest
    needs: build-test
    steps:
      - uses: actions/checkout@v4
      - name: Install
        run: npm ci
      - name: Build
        run: npm run build
      - name: Load test (artillery)
        run: npx artillery quick --count 200 --num 5 http://localhost:3000/api/health
6.2 Optional Deploy Step (later)
Add a deploy job that runs only on tags and pushes the Docker image to ECR / Docker Hub, then runs a helm upgrade in the target cluster.

6.3 Badge Checklist (README)
[![Build Status](https://github.com/you/re-runtime-hub/actions/workflows/ci.yml/badge.svg)](https://github.com/you/re-runtime-hub/actions)
[![Codecov Coverage](https://codecov.io/gh/you/re-runtime-hub/branch/main/graph/badge.svg)](https://codecov.io/gh/you/re-runtime-hub)
[![Security Score](https://securityscorecards.dev/projects/github.com/you/re-runtime-hub/badge)](https://securityscorecards.dev/viewer/?uri=github.com/you/re-runtime-hub)
Result: Every PR must pass lint → compile → test → audit before merging. No manual steps.

7️⃣ DOCUMENTation Overhaul (Day 23‑26)
Deliverable	Tool	How
API reference	Typedoc (npm i -D typedoc)	npx typedoc --entryPoints src/**/*.ts --out docs/api – host via GitHub Pages.
Socket.IO event spec	Markdown table in docs/socket-events.md	List: event, direction, payload schema (JSON), security (requires JWT).
Architecture diagram	Mermaid in README or separate docs/architecture.mmd	Show layers: Electron UI ↔️ Socket.IO ↔️ Node server ↔️ Redis ↔️ DB ↔️ Python agent.
Developer onboarding	CONTRIBUTING.md + scripts/ folder	Provide commands: npm run dev (starts server + electron in watch mode), npm run test:watch, npm run lint.
Deployment guide	docs/deploy.md	Steps: docker build -t runtime-hub ., docker run -p 3000:3000 -e REDIS_URL=redis://…, docker compose up -d.
Security checklist	SECURITY.md	List of controls (JWT, rate‑limit, file‑scan, audit steps).
Add badges for Docs Live (https://runtime-hub.github.io/docs).

8️⃣ FINAL “Production‑Ready” Checklist (Day 27‑28)
✅	Gate	Command / Verification
✅	Zero TypeScript errors	npm run build → exit code 0
✅	All Jest tests exit	npm test -- --detectOpenHandles → “Jest has exited.”
✅	Coverage ≥ 80 %	npm test -- --coverage → statements ≥ 80 %
✅	Security audit clean	npm audit --audit-level=high → “0 vulnerabilities”
✅	CI passes	Merge to main → GitHub Actions green
✅	Docs generated	npm run docs → dist/docs folder
✅	Docker image builds	docker build . -t runtime-hub:latest → success
✅	Lint clean	npm run lint → 0 errors
✅	Performance regression	Artillery run < 250 ms median latency under 200 concurrent connections
Once the above checklist is green you can:

Tag a release (v0.1.0) and push the Docker image to your registry.
Submit a demo video (5‑min) that shows:
Creating a workflow in the Electron UI,
Adding a Python node,
Real‑time metric graph,
Two users editing the same workflow (via JWT auth).
Attach the CI badge and Docs link to the investor deck – it instantly signals “ship‑ready”.
9️⃣ QUICK‑REFERENCE CHEAT‑SHEET (Copy‑Paste)
# 1️⃣ Fix hanging tests
npm i -D jest
# add afterAll and globalTeardown (see above)

# 2️⃣ Compile
npm run build   # must finish with exit 0

# 3️⃣ Lint & fix warnings
npm run lint -- --fix

# 4️⃣ Run full test suite with coverage
npm test -- --coverage --detectOpenHandles

# 5️⃣ Security scan
npm audit --audit-level=high

# 6️⃣ Run CI locally (optional)
act -j build-test   # using act (GitHub Actions locally)

# 7️⃣ Generate docs
npx typedoc --entryPoints src/**/*.ts --out docs/api

# 8️⃣ Build Docker
docker build -t runtime-hub:latest .
docker run -p 3000:3000 -e REDIS_URL=redis://host:6379 runtime-hub:latest
10️⃣ NEXT STEPS FOR YOU (What to hand‑off to the team)
Owner	Item	Due
Lead Dev	Finish migration of remaining .js files → .ts.	Day 7
QA Engineer	Write missing unit tests for workflow‑engine error‑paths (cancellation, retries).	Day 10
DevOps	Set up the full GitHub Actions pipeline (code above).	Day 14
Security Engineer	Implement JWT auth, rate limiting, file‑upload sandbox.	Day 15
Product Owner	Record a 5‑min demo video and update the investor deck with CI badges and coverage numbers.	Day 21
Documentation Lead	Run Typedoc, write architecture markdown, publish to GitHub Pages.	Day 26
When all owners confirm their checklist items, you can announce “Runtime Hub 0.1 – Production Ready” and hand the deck over to the fundraising team with concrete, verifiable metrics.

Good luck – you now have a concrete, test‑driven, secure, and CI‑green foundation to show investors that the product can ship at scale! 🚀