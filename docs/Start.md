# HCM Lite — Gemini CLI Kickoff Kit

Copy-paste starter for vibe-coding the MERN build: setup, project rules file, rules spec with worked examples, custom commands and the first prompts per teammate.

## 0. Existing repo mode: investigate first

Your repo already has JWT and bcrypt login and signup, so you adapt it instead of starting over. I cannot see your repository from here, so Gemini does the investigation: about 20 minutes, three steps. Anything in this section overrides the "create a new repo", "empty folders" and "scaffold" steps later in this kit.

**Step 1: safety net (2 minutes).** Copy `GEMINI.md`, `docs/PRD.md` and `docs/RULES.md` into the repo (Section 1, steps 2 to 4). Then run `git status` (it must be clean), `git tag before-hcm`, and `git switch -c hcm-start`. If a `.env` with real secrets was ever committed, rotate the JWT secret and the database password now.

**Step 2: read-only audit.** Start `gemini` in the repo root and paste:

```
Investigate this repository. READ ONLY: do not create, edit or delete any file except docs/REPO_AUDIT.md.
Write docs/REPO_AUDIT.md covering:
1. Directory tree (skip node_modules, dist, .git), language (JS or TS), module system (CommonJS or ESM), package.json scripts and dependencies with versions.
2. How the server starts, how it connects to MongoDB, env variable names it reads (names only, never values).
3. Every route: method, path, middleware, controller. Which folders hold routes, controllers, models, services.
4. The User model: fields, indexes, hooks. Signup and login logic: validation, bcrypt cost, JWT payload, expiry, secret source, how the auth middleware reads the token, behaviour for wrong password and unknown user.
5. Error handling and response format, input validation approach, CORS, helmet, rate limiting.
6. Whether a frontend exists, its stack, and which endpoints it already calls.
7. Tests, README, .env.example, whether .gitignore excludes .env, and the last 10 git commits.
8. Problems or risks relative to @docs/PRD.md and @docs/RULES.md: public signup, missing roles, secrets in code, no validation, inconsistent error format, anything that blocks the HCM Lite plan.
Keep every section short and factual.
```

**Step 3: migration plan.** In the same session:

```
Using docs/REPO_AUDIT.md and docs/PRD.md, write docs/MIGRATION.md with: (a) KEEP: files and behaviour that already satisfy the PRD, (b) CHANGE: what to modify and why, (c) DELETE: what to remove, (d) an ordered list of at most 6 small steps to reach the architecture in GEMINI.md without a rewrite, each step runnable and leaving login working. Prefer adapting existing code over moving files. Then update the Stack and Structure sections of GEMINI.md so they describe this repo's real language, module system and folder names. Do not change any code yet.
```

Read `docs/MIGRATION.md` yourself for five minutes before running any slice. It decides how much of your existing code survives.

**Default decisions for what the audit will find**

| Found in your repo                             | Action                                                                                                                   |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Signup open to anyone                          | Remove it. HCM Lite has no public signup: first-run `/setup` creates the Admin, Admin creates HR, HR registers employees |
| Login with bcrypt and JWT that works           | Keep it. Add role, employeeId, isActive and mustChangePassword checks                                                    |
| JWT secret or database password in code or git | Move to env, rotate, make `.env` ignored                                                                                 |
| Plain JavaScript                               | Stay in JavaScript; do not spend time converting. Keep `rules/` as pure functions with vitest tests                      |
| Different folder names                         | Keep them and describe the mapping in GEMINI.md instead of moving files                                                  |
| User model with only name, email, password     | Extend it (role, employeeId, isActive, mustChangePassword); clear test users from the dev database                       |
| Frontend exists and is React                   | Keep it; add the missing libraries; no rewrite or restyling                                                              |
| No validation or inconsistent errors           | Add zod and the `{ error: { code, message } }` format in the adapt step                                                  |
| Database is not MongoDB                        | Decide in five minutes; the PRD assumes Mongoose, so switching back is the cheaper path                                  |

**What changes in the rest of this kit**

- The Backend A and Frontend A prompts in Section 6 are replaced by adapt versions that read the audit and migration files.
- Slice A1 in Section 7 now means: extend your existing User model and auth with roles and flags, replace public signup with `/setup` and employee registration, and keep login working at every step.
- Section 2 is the target layout: migrate toward it one slice at a time, never in one big move.

## 1. Before you type anything (10 minutes)

**Install and sign in (every teammate, own machine, own Google account so quotas are not shared):**

- `node -v` must be 20 or newer. Install: `npm install -g @google/gemini-cli`, then run `gemini` once in any folder and sign in with Google (free tier), or set `GEMINI_API_KEY` from Google AI Studio.
- Free-tier limits and the default model change over time. Run `/stats` and `/model` inside the CLI to see what you actually have, and run `gemini --help` if a flag below is not recognised.
- Tools you will use constantly: `@path` to attach a file to a prompt, `!command` for a shell command, `/compress` to shrink a long chat, `/clear` between slices, `/memory show` to see the rules file Gemini loaded, `/chat save <tag>` and `/chat resume <tag>` to park a session.

**Repo setup (use your existing repo and skip step 1):**

1. Create the GitHub repo `hcm-lite`, clone it, create the folder layout from Section 2.
2. Export the PRD doc as Markdown into `docs/PRD.md`. Paste Section 4 (rules) of this kit into `docs/RULES.md`. Paste `GEMINI.md` from Section 3 at the repo root.
3. Add a `.geminiignore` containing: `node_modules`, `dist`, `.env`, `*.log`, `coverage`.
4. Commit and push to `main`. Each teammate works on their own branch (`be-a`, `be-b`, `fe-a`, `fe-b`) and merges to `main` at least hourly.
5. Create two MongoDB Atlas databases (`hcm_dev`, `hcm_prod`) and a Render/Vercel account now so deployment is not a surprise later.

**Safety habit:** commit before every slice. Run Gemini with normal approvals while learning; use `--yolo` (auto-approve tools) only on a clean branch after you have committed, because it will happily run shell commands and edit many files without asking.

## 2. Folder layout (target layout; migrate toward it, do not move everything at once)

```
hcm-lite/
  GEMINI.md
  .geminiignore
  .gemini/commands/        # custom slash commands (Section 5)
  docs/PRD.md  docs/RULES.md  docs/TASKS.md
  shared/api-types.ts      # the API contract, single source of truth
  server/
    src/{config,middleware,models,rules,services,controllers,routes,ai,utils}
    src/app.ts  src/server.ts
    tests/
    .env.example
  client/
    src/{api,components,features,hooks,pages,lib,types}
    .env.example
```

**Tooling hack that saves an hour:** run the server with `tsx` in dev and production (`tsx src/server.ts`), so there is no build pipeline to debug on Render. Import the shared contract with a relative path (`../../shared/api-types`).

## 3. `GEMINI.md` (repo root, paste exactly)

```markdown
# HCM Lite — rules for Gemini CLI

HCM Lite is an AI-assisted HR system (Admin, HR, Employee) built in a 12-hour hackathon. Sources of truth, in order: docs/RULES.md (business rules), shared/api-types.ts (API shapes), docs/PRD.md (scope). If code and docs disagree, stop and ask.

## Stack (do not add or swap libraries without asking)

Server: Node 20, Express, TypeScript run with tsx, Mongoose, zod, jsonwebtoken, bcryptjs, pdfkit, dayjs (utc + timezone plugins), helmet, cors, express-rate-limit, vitest + supertest, openai SDK (pointed at AI_BASE_URL).
Client: React 18, Vite, TypeScript, Tailwind, shadcn/ui, React Router, TanStack Query, react-hook-form + zod, Recharts, axios.

## Server architecture

- Flow: route -> controller (validate input with zod, read req.user) -> service (all business logic, audit calls) -> model.
- Business rules are PURE functions in server/src/rules/ with unit tests. Services call them. Controllers never contain rules.
- Errors: throw AppError(status, code, message, fields?). The error middleware returns { error: { code, message, fields? } }. Status codes: 400 validation, 401 unauthenticated, 403 forbidden, 404 not found, 409 duplicate check-in, 422 business rule violation (leave overlap, over-balance, finalized run edits use 403).
- Every route uses requireAuth and requireRole(...). Employees: identity ALWAYS comes from req.user.employeeId, never from params, query or body.
- Business dates are strings YYYY-MM-DD in settings.timezone (default Asia/Karachi). Timestamps are UTC Date. All date math goes through server/src/utils/time.ts. Never do date arithmetic with raw new Date().
- Server stamps all times. Clients never send check-in time.
- Passwords: bcrypt, passwordHash has select:false and is never returned.
- Call audit({actor, action, entity, entityId, before, after}) in services for every create, update, approve, reject and finalize. There are no update or delete routes for audit logs.
- All dashboard and AI numbers come from the same service functions (attendance, leave, payroll, analytics). The AI layer never queries the database directly.
- No dummy data, no seed scripts, no fake records. Only first-run setup creates data (company, admin, default leave types).

## Client architecture

- All HTTP goes through client/src/api/* functions typed from shared/api-types.ts. Components never call axios directly. Use TanStack Query for fetching and mutations.
- Every page handles loading, empty and error states using shared components Loading, EmptyState, ErrorState.
- Route guards by role are UX only; the server is the authority.
- Responsive from 375px wide. Tables scroll horizontally on mobile. Dark mode via Tailwind dark: classes.
- Show an AI-generated badge on every AI answer.

## Working rules (important)

1. Do ONE slice per request. When done: run the typecheck and tests, fix errors, print a short summary (files changed, routes added, how I test it), then STOP. Do not start the next slice.
2. Only edit files inside the folders named in the request. Do not refactor unrelated code.
3. Never read, print or edit .env. Only .env.example is committed.
4. Never run destructive commands (rm -rf, git reset --hard, git clean, dropping databases).
5. Keep explanations short. Prefer working code and a 5-line summary over long text.
6. If a requirement is ambiguous, pick the option written in docs/RULES.md; if it is not there, ask one short question.
7. Write tests for every function in server/src/rules/.
```

**`.env.example` files**

```
# server/.env.example
PORT=4000
MONGODB_URI=
JWT_SECRET=
CLIENT_ORIGIN=http://localhost:5173
ADMIN_EMAIL=
ADMIN_PASSWORD=
AI_BASE_URL=
AI_API_KEY=
AI_MODEL=

# client/.env.example
VITE_API_URL=http://localhost:4000/api
```

For the in-app AI feature, use an OpenAI-compatible endpoint with tool calling (Groq, or Gemini's OpenAI-compatible endpoint) through the `openai` SDK; this is separate from the Gemini CLI you code with.

## 4. `docs/RULES.md` — worked examples to paste in

Put the PRD's Section 6 rules at the top of this file, then these test cases. Gemini writes the pure functions, you make these examples the tests. All dates assume Saturday 24 Oct 2026 as today, weekend Sat–Sun, no holidays unless stated. October 2026 has 22 working days.

**Attendance status**

| Case               | Input                                       | Expected                                                             |
| ------------------ | ------------------------------------------- | -------------------------------------------------------------------- |
| On time            | office 09:00, grace 15, check-in 09:15      | isLate = false                                                       |
| Late               | check-in 09:16                              | isLate = true (compare at minute precision, so 09:15:xx is not late) |
| Half day           | in 09:00, out 13:59 (4.98 h)                | status half\_day                                                     |
| Full day           | in 09:00, out 14:00 (5.00 h)                | status present                                                       |
| Missing checkout   | past date, check-in, no check-out           | missing\_checkout                                                    |
| Today open         | today, check-in, no check-out               | present                                                              |
| Absent             | past working day, no record, no leave       | absent                                                               |
| On leave           | past working day, no record, approved leave | on\_leave                                                            |
| Weekend or holiday | no record                                   | weekend or holiday, never absent                                     |
| Double check-in    | second check-in same date                   | 409                                                                  |

**Leave working days**

| Case         | Input                                                | Expected                                                                               |
| ------------ | ---------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Plain        | Mon 2026-10-26 to Tue 2026-10-27                     | 2 days                                                                                 |
| Over weekend | Fri 2026-10-30 to Mon 2026-11-02                     | 2 days                                                                                 |
| With holiday | same range, holiday on 2026-11-02                    | 1 day                                                                                  |
| All weekend  | Sat 2026-10-24 to Sun 2026-10-25                     | 0 days, 422                                                                            |
| Overlap      | existing approved 10-26 to 10-27, new 10-27 to 10-28 | 422                                                                                    |
| Over balance | casual quota 10, used 9 approved, request 2          | 422                                                                                    |
| Cross year   | 2026-12-30 to 2027-01-04                             | 422                                                                                    |
| Smart leave  | today Sat 2026-10-24, "next Monday and Tuesday"      | start 2026-10-26, end 2026-10-27 (next Monday means first Monday strictly after today) |

**Tax slab on annual gross (gross × 12)**

| Basic (monthly) | Gross   | Annual gross | Annual tax | Monthly tax |
| --------------- | ------- | ------------ | ---------- | ----------- |
| 30,000          | 45,000  | 540,000      | 0          | 0           |
| 40,000          | 60,000  | 720,000      | 6,000      | 500         |
| 100,000         | 150,000 | 1,800,000    | 120,000    | 10,000      |
| 200,000         | 300,000 | 3,600,000    | 510,000    | 42,500      |
| 400,000         | 600,000 | 7,200,000    | 1,770,000  | 147,500     |

Boundary checks: annual 600,000 → 0; 1,200,000 → 30,000; 2,400,000 → 210,000; 3,600,000 → 510,000.

**Payroll cases (October 2026, 22 working days)**

| Case            | Inputs                                               | Result                                                                             |
| --------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Full attendance | basic 40,000                                         | gross 60,000, deductions 0, tax 500, net 59,500                                    |
| Mixed           | basic 100,000, 2 absent, 1 half day, 0 unpaid        | per day 6,818.18, deduct days 2.5, deduction 17,045.45, tax 10,000, net 122,954.55 |
| Joiner          | basic 100,000, 11 working days employed, no absences | earned 75,000.00, tax 10,000 (not prorated), net 65,000.00                         |
| Unpaid leave    | basic 100,000, 3 unpaid leave days                   | deduction 20,454.55, net 119,545.45                                                |
| Finalized       | any edit to a finalized run                          | 403                                                                                |
| Duplicate month | create second run for the same month                 | 409                                                                                |

Rounding: keep full precision through the calculation, round to 2 decimals only in the final stored numbers.

## 5. Custom slash commands (`.gemini/commands/*.toml`)

These become `/slice`, `/rules-first`, `/rbac-review` and `/demo-check`. If a command does not load, check the file location and run `/help`.

`.gemini/commands/slice.toml`

```
description = "Implement exactly one vertical slice"
prompt = """
Implement this slice only: {{args}}

Read GEMINI.md rules first. Use @{docs/RULES.md} for business rules and @{shared/api-types.ts} for API shapes.
Steps: 1) list the files you will create or change, 2) implement, 3) run typecheck and tests, 4) fix errors, 5) print a short summary and how I can test it manually, then STOP.
"""
```

`.gemini/commands/rules-first.toml`

```
description = "Write failing tests from RULES.md, then implement the rule functions"
prompt = """
Target rule area: {{args}}
Using @{docs/RULES.md}, first write vitest tests in server/tests/ that encode every example in the matching tables. Run them and show they fail. Then implement the pure functions in server/src/rules/ until all pass. Do not touch services or routes in this step.
"""
```

`.gemini/commands/rbac-review.toml`

```
description = "Audit the current diff for access-control mistakes"
prompt = """
Review this diff strictly for security and RBAC problems: missing requireAuth or requireRole, Employee routes reading employeeId from params/body, data returned across employees, password hashes in responses, missing audit calls, rules inside controllers, unvalidated input, finalized payroll mutations.
List concrete problems with file and line, then fix them.

Diff:
!{git diff main}
"""
```

`.gemini/commands/demo-check.toml`

```
description = "Check the project against the demo script"
prompt = """
Read @{docs/PRD.md} section 14 (acceptance tests). For each step, inspect the code and say: works, partly works, or missing, with the file that implements it. End with the three most important gaps.
"""
```

## 6. Phase 0 prompts (first 45 minutes, in parallel)

Run each in its own terminal from the repo root, on its own branch. Start with `/clear` between prompts.

**Backend A — adapt the existing server**

```
/slice Adapt the existing server to the HCM Lite architecture using docs/REPO_AUDIT.md and docs/MIGRATION.md. Keep the current language, module system and working auth code. Add what is missing: separate app and server entry files, zod-validated env config, AppError, asyncHandler and an error middleware returning { error: { code, message, fields? } }, requireAuth (JWT; rejects inactive users and users with mustChangePassword except on change-password) and requireRole, utils/time.ts (dayjs utc and timezone helpers, default Asia/Karachi), GET /api/health, vitest and supertest setup, and .env.example. Move or rename files only as listed in MIGRATION.md. Do not remove signup yet; slice A1 replaces it. Login must keep working.
```

**Frontend A — adapt or create the client**

```
/slice First inspect the frontend folder named in docs/REPO_AUDIT.md. If a React app exists, keep it and add what GEMINI.md requires and the app lacks: Tailwind and shadcn/ui, React Router, TanStack Query, an axios instance in src/api/http.ts with a JWT interceptor and 401 handling, AuthContext wired to the existing login endpoint, a role-based route guard, a role-aware layout whose sidebar collapses to a drawer under 768px, a dark mode toggle, and shared components Loading, EmptyState, ErrorState, ConfirmDialog, StatCard, DataTable and AiBadge. If no frontend exists, scaffold /client with Vite React TypeScript and the same list. Pages can be placeholders. Do not restyle pages that already work.
```

**Backend B — contract types, then rules**

```
/slice Create shared/api-types.ts from the API table and data model in @{docs/PRD.md}: TypeScript interfaces for every request and response (login, setup, settings, department, designation, leaveType, holiday, employee, attendance record, correction, leave request, balance, payroll run, payslip, analytics payloads for admin/hr/employee, ai chat/summary/smart-leave, announcement, notification, audit log, paginated list wrapper, error shape). Add a short example JSON as a comment above each main response type.
```

Then:

```
/rules-first attendance status, leave working days, tax slab and payroll calculation
```

**Frontend B — wait for the contract, then screens with fixtures**

Once Backend B pushes `shared/api-types.ts`, pull it and run:

```
/slice Build the Employee check-in widget and attendance calendar UI in client/src/features/attendance using typed fixtures from shared/api-types.ts (no backend calls yet, but put the data access behind functions in client/src/api/attendance.ts so we can switch to real endpoints). Show loading, empty and error states.
```

**Checkpoint at the end of Phase 0:** server boots and `/api/health` works, client builds, contract file exists, rule tests pass, everything merged to `main`, hello-world deployed (server on Render with Atlas, client on Vercel).

## 7. Slice prompts per person (paste as `/slice <text>` one at a time)

**Backend A**

- **A1 Auth and first run:** User model; `GET /setup/status`; `POST /setup` that only works if no Admin exists (race-safe), creates the settings document, the Admin user and default leave types (annual 14, sick 8, casual 10, unpaid unlimited); also read ADMIN\_EMAIL and ADMIN\_PASSWORD on boot if no Admin exists; `POST /auth/login`, `POST /auth/change-password`, `GET /auth/me`; login rate limit; audit helper in services.
- **A2 Organization:** Settings get/put (Admin write, HR read), departments, designations, leave types (quota update), holidays, `POST /users/hr`, deactivate, reset password (returns a temp password once). Audit every write.
- **A3 Employees:** Employee model; `POST /employees` creates employee and linked user with a random temp password returned once and `mustChangePassword = true`; edit; list with server-side search, department and status filters and paging; profile endpoint; `PATCH /me/profile` for phone and address only; deactivate sets exitDate and status. Unique code and email.
- **A4 Comms and audit:** Announcements (Admin and HR post, all read), notifications (create helper, list, mark read), `GET /audit` with paging and filters (Admin only).
- **A5 Hardening (hour 8+):** supertest permission tests (employee reading another employee's data, employee on HR route, HR finalizing payroll, finalized run edit); rate limits; helmet and cors checks; run `/rbac-review`.

**Backend B**

- **B1 Attendance:** Attendance model with unique `employeeId + date`; check-in (409 on duplicate, server time, `isLate`, non-working-day flag); check-out (422 if no check-in, computes `workedHours`, `half_day`); read-time status function `attendanceStatusFor` covering absent, on\_leave, holiday, weekend, missing\_checkout; `GET /attendance/me?month`, daily board for HR/Admin with department filter; Employee identity only from the token.
- **B2 Leave and corrections:** Leave request apply with all rules (working days, overlap 422, over-balance counting approved + pending, single year), cancel, balance, HR/Admin decision with comment and notification; correction request and approve/reject that updates the attendance record with an audit entry.
- **B3 Payroll:** Salary endpoint (HR sets basic), payroll run draft create/regenerate per month using the rules functions, finalize (Admin only, locks, writes payslips, notifies employees), 403 on any later mutation, unique month, payslips list scoped by role, payslip PDF with pdfkit showing the full formula breakdown.
- **B4 Analytics:** `metrics.ts` and the three analytics endpoints (admin, hr, me) with `from`, `to`, `departmentId` filters, using MongoDB aggregation and the shared attendance status function; match the formulas in PRD section 6.
- **B5 AI:** `/ai/chat` with the role-gated tool set from PRD section 8, system prompt containing the rules from RULES.md, today's date and weekday, refusal rule, Roman Urdu support; `/ai/summary` from the KPI JSON; `/ai/smart-leave` with zod-validated JSON, one retry, then `{ fallback: true }`; 15 s timeout, 20 requests per user per hour, `ailogs`; tools call existing services only.

**Frontend A**

- **F1:** Setup wizard (shown when `/setup/status` says no admin), login, forced change-password screen, role-based redirects.
- **F2:** Org setup tabs (company settings, departments, designations, leave types, holidays, HR users), employee list with search and filters and paging, create employee form with a temp-password modal, employee profile tabs (details, attendance, leave, payroll).
- **F3:** Announcements, notifications list and bell, audit log table with filters, my profile edit (phone and address).
- **F4 Polish (hour 9+):** empty/loading/error audit on every page, 375px pass, dark mode check.

**Frontend B**

- **G1:** Wire attendance widget and calendar to the real endpoints; HR daily board; correction request and approval screens.
- **G2:** Leave apply form, my leaves with cancel, balance cards, HR/Admin approval inbox with comment dialog.
- **G3:** Payroll screens: salary structure form, monthly run (create, review with formula breakdown, finalize), payslips list with PDF download.
- **G4:** Three dashboards with Recharts and date-range plus department filters, Summarize button.
- **G5:** AI chat drawer (all roles) with AI-generated badge, smart-leave textbox that pre-fills the leave form and never auto-submits, graceful failure state.

## 8. How to keep Gemini productive

- **One slice per prompt, then commit.** Run the app after each slice. If it works, `git commit`; if not, paste the exact error and ask for the root cause before any fix.
- **Two-strike rule.** If Gemini fails to fix the same error twice, stop. Run `git diff`, read it yourself, or revert and restate the request more narrowly.
- **Context hygiene.** `/clear` between slices; `/compress` if the chat grows; attach only the files that matter with `@path` instead of letting it scan the whole repo.
- **Rules before screens.** The most expensive bugs are payroll, leave and attendance math. Do not skip `/rules-first`.
- **Review the risky 10%.** Personally read: auth middleware, `scope` logic, payroll service, AI tool gating, and the finalize route. Run `/rbac-review` before every merge to `main` after hour 6.
- **Rate limit panic plan.** If a Gemini quota runs out, switch to another teammate's login, an AI Studio API key, or another model with `/model`; keep prompts small to save quota.
- **No gold-plating.** If Gemini adds features you did not ask for (extra pages, libraries, config), tell it to remove them.

## 9. The next 60 minutes, minute by minute

| Minutes | Everyone                                                                                                                   |
| ------- | -------------------------------------------------------------------------------------------------------------------------- |
| 0–10    | Install Gemini CLI, sign in, create repo and folders, commit GEMINI.md, RULES.md, PRD.md, `.geminiignore`, custom commands |
| 10–30   | Phase 0 prompts in parallel (scaffolds, contract types, rules tests)                                                       |
| 30–45   | Fix scaffold issues, merge to `main`, everyone pulls, hello-world deploy to Render, Atlas and Vercel                       |
| 45–60   | Backend A on A1, Frontend A on F1, Backend B finishes rules tests then B1, Frontend B on fixture-based attendance UI       |

By minute 60 you should be logging in on the hosted URL, with roles working. That matches the Section 13 timeline of the PRD, so you are not behind.

## 10. Final reminders before you start

- Keep the hosted database empty; use `hcm_dev` for all testing.
- Do not build mobile, camera, CSV import or email. They are cut.
- Feature freeze at hour 11, final smoke test on the hosted URL, then submit both links on the Saylani LMS.
- Use `/demo-check` at hour 9 and hour 11 to find the biggest remaining gaps.
