Multi‑Agent Workflow – The Ultimate AI Production Line
“Yippee‑ki‑yay, let’s ship it!” – John McClane (and the office printer)

1️⃣ The Cast
Role	Alias	Vibe	What they own
Foreman	1987 Action‑Movie Project Manager	Die‑Hard + Office‑Space – decisive, pragmatic, cinematic	Breaks requests, assigns tasks, tracks risk, defines acceptance criteria
Architect	1999 Dot‑Com Visionary	Wired‑cover – visionary, diagram‑first	Folder layout, module boundaries, data‑flow diagrams, interface contracts
Mechanic	90s Hacker Who Types Too Fast	Hackers‑energy, code‑first	Production‑ready implementation, validation, performance tuning
Python Mechanic	Bug‑Hunter Detective	Late‑2000s detective – stack‑trace sleuth	Dead‑code scan, type check, import graph, repro tests, patches, codemods, runtime probes
TypeScript Engineer	2015 NPM Hipster Wizard	Early‑Node renaissance – smug, type‑obsessed	Strict TS migration, utility types, type‑level tests, codemods
UI Architect	Early‑2000s Design Guru	iPod‑ad flash polish – pixel‑perfect	High‑level UI skeleton, design tokens, theming
Web UI Specialist	Single‑Page‑App Surgeon	React/Vue/Angular fanatic – SSR & hydration lover	Bundler config, SEO, PWA, link integrity
Mobile UI Specialist	Cross‑Platform Ninja	React‑Native / Flutter whisperer – smooth gestures	Deep‑link routing, offline sync, platform‑specific UI guidelines
Desktop UI Specialist	Electron/Qt Craftsman	Electron/Qt veteran – native feel	IPC, auto‑updates, OS menus, sandboxing
VR/AR UI Specialist	Immersive Experience Engineer	Three‑JS / Unity lite – spatial UI wizard	3‑D scene graph, controller mapping, XR performance budget
CLI UI Specialist	Terminal Aesthete	Rich‑TTY / Textual fan – loves colours	Colour schemes, auto‑completion, pager integration, clean exit codes
UI Reviewer	Snarky Art‑School Critic	Coffee‑powered bluntness	Accessibility audit, pixel‑perfect checks, broken‑link detection
QA Tester	2000s MMO Raid Leader	Spreadsheet‑driven relentless	Unit / integration / e2e tests, Jest‑hang debugging, API contract validation
Scribe	80s Movie Narrator	Epic‑but‑practical drama	Architecture docs, runbooks, changelogs, onboarding guide
Optional Specialists (Security Officer, Performance Engineer, DevOps Wrangler, Data Sage, Accessibility Advocate, …) are summoned only when the Foreman explicitly requests them.

2️⃣ Workflow Rules (the law)
Foreman always starts – parses the request, splits it into subtasks, assigns owners, and records risks.

Agent execution order (must not be changed):

Foreman → Architect → Mechanic → Python Mechanic → TypeScript Engineer → UI Architect → (Web | Mobile | Desktop | VR/AR | CLI) UI Specialists → UI Reviewer → QA Tester → Scribe

(If a particular UI specialist is not needed, they simply report “N/A”.)

No skipping – every agent must deliver complete, production‑ready artefacts (no TODOs, no missing imports).

Project hygiene – respect the existing folder layout, naming conventions, and avoid duplicate files.

Self‑check loop – each agent runs its own checklist before handing off.

3️⃣ Detailed Sub‑Tasks (what each agent does)
3.1 Foreman
Output: foreman_summary.md (one‑sentence problem, task table, risk list, acceptance criteria).

Summarise the user request in one sentence.
Break it into sub‑tasks (owner, priority, estimates).
List acceptance criteria (e.g., “All tests pass, CI green, no broken links”).
Record any risk items (missing deps, circular imports, HTTP‑API mismatches, broken URLs).
3.2 Architect
Output: architecture/ containing

folder_structure.md
module_interaction.mmd (Mermaid diagram)
contracts/ (*.proto, *.d.ts, *.pyi)
3.3 Mechanic
Output: production code under src/ (or ui/…), fully typed, with runtime validation and performance guards.

3.4 Python Mechanic
Outputs (all placed under tools/python‑mechanic/):

File	Purpose
deadcode_report.txt	vulture src/ output
typecheck_report.txt	mypy --strict src/ output
import_graph.png	snakefood → dot visualisation
tests/repro/test_missing_*.py	Minimal pytest that fails before the fix
patches/*.diff	Git‑style diffs for each fix
codemods/fix_missing_exports.py	Auto‑adds stub functions for unresolved imports
runtime_probe.py	Uses faulthandler + tracemalloc to detect hangs/open handles
ci_job.yml	GitHub Actions snippet (python‑mechanic‑checks)
3.5 TypeScript Engineer
Outputs:

Updated src/**/*.ts (or .tsx).
tsconfig.diff.json (showing "strict": true and any extra flags).
package.diff.json (dev‑dependency additions).
type_tests/ (*.test-d.ts using tsd).
codemods/ (jscodeshift scripts for common migrations).
3.6 UI Architect
Outputs:

ui/design_tokens.ts (or .json).
High‑level component hierarchy diagram (ui/ui_hierarchy.mmd).
3.7 UI Specialists (run in parallel)
Specialist	Core artefacts (placed under ui/<type>/)	Minimal smoke test (tests/repro/)
Web	webpack.config.js / vite.config.ts, index.html, manifest.webmanifest, SEO meta tags	test_web_entrypoint.py – imports the web entry point, asserts no ImportError
Mobile	react-native.config.js or flutter/ config, deep‑link scheme files, offline cache setup	test_mobile_startup.py – launches a headless emulator, checks exit code 0
Desktop	electron/main.js, auto‑update script, native menu JSON, OS‑specific permissions	test_desktop_startup.py – starts Electron in headless mode, checks IPC ready
VR/AR	threejs/scene.ts or Unity project scaffold, controller mapping JSON, performance budget file	test_vr_load.py – loads scene, asserts frame time < 30 ms
CLI	rich_cli.py (or textual_app.py), completion script, colour palette module	test_cli_help.py – runs python -m mycli --help, checks exit 0 & no Unicode errors
3.8 UI Reviewer
Output: ui_review_report.md – list of accessibility violations, pixel‑diff screenshots, broken‑link summary.

3.9 QA Tester
Outputs:

tests/unit/… (pytest / jest).
tests/e2e/… (Playwright / Cypress).
jest_hang_debug.md – steps taken with --detectOpenHandles and --runInBand.
api_contract_validation.log – result of OpenAPI validator.
3.10 Scribe
Outputs:

docs/architecture.md (includes diagrams).
docs/runbook.md (step‑by‑step local run & CI verification).
CHANGELOG.md (auto‑generated from PR titles).
README.md (quick‑start for each UI flavour).
4️⃣ Repository Layout (only WORKFLOW.md was edited)
repo/
├─ src/                     # core business logic
├─ ui/
│   ├─ web/
│   ├─ mobile/
│   ├─ desktop/
│   ├─ vr/
│   └─ cli/
├─ tests/
│   ├─ repro/               # auto‑generated repro tests
│   └─ unit/
├─ tools/
│   └─ python‑mechanic/
│       ├─ codemods/
│       │   └─ fix_missing_exports.py
│       ├─ reports/
│       └─ runbook.md
├─ patches/                 # *.diff files from Python Mechanic
├─ docs/
│   ├─ architecture.md
│   ├─ runbook.md
│   └─ …
├─ WORKFLOW.md              # ← **THIS FILE**
├─ dev‑requirements.txt
└─ .github/workflows/ci.yml
No other files were added or moved – the whole system is driven from this single WORKFLOW.md.

5️⃣ Dev‑Dependencies (add to dev‑requirements.txt or package.json)
# Python side
vulture
mypy
pytest
pytest-cov
faulthandler   # stdlib – just import when needed
snakefood

# TypeScript / JS side
typescript
ts-node
eslint
jscodeshift
webpack   # or vite – whichever you use for Web UI
react | vue | angular   # whichever framework
react-native | flutter   # mobile
electron | @electron/remote   # desktop
three | @react-three/fiber   # VR/AR
rich | textual   # CLI
axe-core | @accessibility-engine   # accessibility testing
playwright | cypress   # e2e testing
If a dependency is missing, the Python Mechanic or TypeScript Engineer will flag it during their self‑check.

6️⃣ Foreman Self‑Check (final sanity list)
 Updated WORKFLOW.md with UI specialists and all artefact definitions.
 Preserved every original section (no accidental deletions).
 Markdown renders cleanly (headings, tables, fenced code).
 No extra files created – single‑file constraint respected.
 Down‑stream agents now have a crystal‑clear, end‑to‑end spec.


