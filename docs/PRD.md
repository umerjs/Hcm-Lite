# HCM Lite — PRD & 10-Hour Build Plan (MERN)

Saylani Hackathon · 24 Oct 2026 · Stack: MongoDB, Express, React, Node · Timebox: 12 h total, \~10 h remaining

## 0. How to use this doc

Section 1 is the grilling: what in the brief is risky, ambiguous or a trap. Section 2 locks the decisions so nobody debates them mid-build. Sections 3 onward are the actual PRD: scope, architecture, data model, rules, API, AI, UI, timeline, test plan. Anything in Section 2 marked **Decision** is final unless the team vetoes it in the first 15 minutes.

Assumption: team of 4 (2 backend, 2 frontend) as the brief says. If you are fewer people, use the cut line in Section 5.

## 1. The grill: where this project will hurt you

**1. Scope vs. time.** 25 functionalities in 9 modules, 10 hours left. With 4 people that is roughly 40 person-hours, minus setup, deployment, README and demo rehearsal, leaving \~28 hours of real feature work. It fits only if every feature is a thin vertical slice (model, service, route, one screen) and nobody gold-plates. The judges score the _end-to-end demo story_, not depth.

**2. The hackathon date is a Saturday, and the default weekend is Sat–Sun.** A judge who tries to check in during judging will hit a weekend. If you block weekend check-ins, the very first demo step fails. **Decision:** weekend or holiday check-in is allowed, stored with `status: present` and `isNonWorkingDay: true`, and excluded from attendance-rate denominators. Admin can also change the weekend setting live. Judges will also test at odd hours: check-in at 2 pm is _late_ by the rules, which is correct behaviour; the Admin can move office start time to demo an on-time check-in.

**3. "Starts empty, judges create everything" means your hosted DB must be empty.** If you test on the hosted database and leave data in it, you break the first-run flow. Use a separate dev DB and a separate hosted DB. Never run a seed script against production. Also: first-run setup must be race-safe (only works while zero Admins exist) and the hosted free tier must be warmed up before judging (Render free sleeps).

**4. Absent is not a stored fact.** The brief says absent = no record and no approved leave. Nobody checks in on an absent day, so there is no row. Do not build a nightly cron. **Decision:** compute absent, on\_leave, holiday, weekend and missing\_checkout _at read time_ for any date range, in one shared `attendanceStatusFor(employee, date)` function. Dashboards, payroll and the AI all call it. This is the single most important consistency decision: it is how "AI answers match dashboards" becomes true by construction.

**5. Timezone will silently break everything.** The server (Render, UTC) is not in Karachi. "Late after 09:15" and "one record per day" must use the office timezone. **Decision:** `settings.timezone = "Asia/Karachi"`, all business dates stored as `YYYY-MM-DD` strings in that zone, timestamps stored as UTC Date. Use `dayjs` with the tz plugin in one `time.ts` helper; no `new Date()` arithmetic in services.

**6. The brief contradicts itself on salary.** HR "sets basic, allowances" but payroll says gross = 1.5 × basic (HRA 40%, medical 10%). **Decision:** salary input is only `basic`; HRA, medical and gross are derived and displayed. No free-form allowances (cut).

**7. Tax and net pay are underspecified.** **Decision:** annual taxable = gross × 12 (full-month gross, not reduced by deductions). Annual tax by slab, monthly tax = annual ÷ 12, **not** prorated for joiners (illustrative tax, keep it simple and document it). Net = gross − attendance deductions − monthly tax. Slab table in Section 6 (checked: 5% of 600k = 30k, 30k + 15% of 1.2M = 210k, 210k + 25% of 1.2M = 510k, all consistent).

**8. "Late" vs "half\_day" vs the metric formulas.** An employee can be late _and_ work under 5 h. **Decision:** status enum is `present | half_day | missing_checkout | absent | on_leave`, plus boolean `isLate`. Late % = isLate count ÷ (present + half\_day + missing\_checkout records). Attendance rate uses the brief's formula with `present + late + missing_checkout + 0.5 × half_day` where late records are those with isLate and status present. Write this down once in `metrics.ts` with a test.

**9. missing\_checkout only exists after the day ends.** Today's open record is just `present`. For past dates with a check-in and no check-out, return `missing_checkout`.

**10. Leave edge cases the judges can hit.** Overlap = 422, over-balance = 422, weekends and holidays skipped, cross-year leave. **Decision:** reject leave spanning two calendar years with 422 and a clear message (cut). Balance check counts approved + pending days so users cannot over-apply. Only future-or-today start dates; half-day leave is not supported (cut). Cancel is allowed only for pending or future-approved requests.

**11. Payroll traps.** Working days of a month = weekdays minus holidays (company-wide, per settings). Per day = gross ÷ working days. Deduct absent + unpaid-leave days + 0.5 × half days. Joiners/leavers prorated by working days employed. One run per month (unique index); draft can be regenerated until finalized; finalized is immutable at the service layer _and_ rejected by the route. Payslip PDF only after finalize for the employee; HR/Admin can preview in draft.

**12. AI is 15 points but fails in embarrassing ways live.** Risks: free-tier rate limits, tool-calling flakiness, employees extracting salaries, wrong dates in smart leave. **Decision:** role-gated tool sets (Employee never receives a tool that can return another person's data), server injects today's date and weekday into the prompt, JSON validated with zod, one retry, then fall back to the plain form. Details in Section 8.

**13. Tests and code quality are 15 points and cheap to get.** Put every rule in pure functions under `rules/` and unit-test them. Do _not_ aim for coverage; aim for payroll, tax, attendance status, leave working-days and metrics tests. Roughly 25 tests, 45 minutes total.

**14. The mobile app and camera attendance are a trap for this timebox.** Bonus is +10 and needs a working face-detection pipeline, geofence and device testing. **Decision: cut mobile and camera entirely.** Take the cheap bonus items instead (Section 5).

**15. Things that will eat hours if you let them:** email sending (cut: HR sees the temporary password once on screen), CSV import with dry run (P2), fancy charts, role-specific theming, Employee 360 as a separate rich page (cut to a tabbed profile using existing endpoints), notification delivery beyond in-app, file uploads, pagination everywhere (only on employees and audit log).

## 2. Locked decisions

| Area     | Decision                                                                                                                                                                                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend | React 18 + Vite + TypeScript, Tailwind + shadcn/ui, React Router, TanStack Query, react-hook-form + zod, Recharts                                                                                                                                                               |
| Backend  | Node 20 + Express + TypeScript, Mongoose, zod validation, jsonwebtoken, bcryptjs, pdfkit, dayjs, express-rate-limit, helmet, cors                                                                                                                                               |
| DB       | MongoDB Atlas free (M0). Two clusters or two DBs: `hcm_dev`, `hcm_prod`                                                                                                                                                                                                         |
| AI       | `openai` npm SDK pointed at an OpenAI-compatible endpoint via env (`AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`). Use Groq (Llama 3.3 70B class model with tool calling) or Gemini's OpenAI-compatible endpoint. Check the current free model name on the provider's page at hour 2. |
| Auth     | JWT in `Authorization: Bearer`, 8 h expiry, bcrypt cost 10, `mustChangePassword` flag blocks all routes except change-password                                                                                                                                                  |
| Repo     | One monorepo: `/server`, `/client`, root README, `.env.example` in both                                                                                                                                                                                                         |
| Deploy   | Backend on Render or Railway, frontend on Vercel or Netlify, DB on Atlas. Deploy a hello-world in hour 3, not at the end                                                                                                                                                        |
| Layering | `routes → controller (validate, auth) → service (rules, audit) → model`. Rules live in `server/src/rules/*.ts` as pure functions                                                                                                                                                |
| Errors   | `{ error: { code, message, fields? } }`. 400 validation, 401, 403, 404, 409 duplicate check-in, 422 business rule                                                                                                                                                               |
| Audit    | `audit({actor, action, entity, entityId, before, after})` called from services on every create, update, approve, finalize. No update or delete route exists for audit logs                                                                                                      |

## 3. Product scope

**Goal:** A web HCM where Admin sets up a company, HR registers employees, employees check in and request leave, HR approves and runs payroll, Admin finalizes, and an AI assistant answers from the same services as the dashboards.

**Non-goals:** mobile app, camera/face attendance, email delivery, SSO, file uploads, multi-company tenancy, half-day leave, custom allowances, CSV import (unless time remains).

**Personas:** Admin (company owner, one account, created at first run), HR (people operations, created by Admin), Employee (created by HR registration).

### Priority map for the 25 functionalities

| #   | Functionality                                    | Priority | Notes                                                                       |
| --- | ------------------------------------------------ | -------- | --------------------------------------------------------------------------- |
| 01  | First-run setup                                  | P0       | company name + admin account; also reads ADMIN\_EMAIL/ADMIN\_PASSWORD       |
| 02  | Login, logout, change password, role menus       | P0       |                                                                             |
| 03  | Company settings                                 | P0       | office hours, grace, weekend, timezone; location + radius stored but unused |
| 04  | Departments, designations, leave types, holidays | P0       | leave types auto-created at setup with quotas 14/8/10/unlimited             |
| 05  | Create HR logins, deactivate, reset              | P0       |                                                                             |
| 06  | Register employee                                | P0       | creates login, shows temp password once                                     |
| 07  | Directory + search + filters + profile           | P0       | server paging; profile is tabbed, not separate 360 build                    |
| 08  | CSV import/export                                | P2       | export P1, import dry run only if time                                      |
| 09  | Web check-in/out                                 | P0       |                                                                             |
| 10  | Attendance calendar + daily board                | P0       |                                                                             |
| 11  | Corrections                                      | P1       | request with reason, HR approve/reject applies the change                   |
| 12  | Apply/cancel leave, balance                      | P0       |                                                                             |
| 13  | Approve/reject leave with comment                | P0       |                                                                             |
| 14  | Salary structure                                 | P0       | basic only                                                                  |
| 15  | Payroll draft                                    | P0       |                                                                             |
| 16  | Finalize payroll                                 | P0       |                                                                             |
| 17  | Payslip PDF                                      | P0       |                                                                             |
| 18  | Dashboards with filters                          | P0       | date range + department                                                     |
| 19  | AI chat                                          | P0       |                                                                             |
| 20  | AI dashboard summary                             | P0       |                                                                             |
| 21  | Smart leave                                      | P0       |                                                                             |
| 22  | Policy Q&A                                       | P0       | system prompt only, nearly free                                             |
| 23  | Announcements                                    | P1       |                                                                             |
| 24  | Notifications                                    | P1       | in-app, written on leave decisions, payslip, correction decisions           |
| 25  | Audit log                                        | P0       |                                                                             |

## 4. Architecture

```
React SPA (Vite) ──REST/JSON + JWT──▶ Express API ──▶ MongoDB Atlas
                                         │
   routes → controllers → services ──▶ rules/ (pure functions)
                                         │
                                         └──▶ ai/ service ──▶ LLM API (key on server only)
```

Key principles:

- **One source of truth for numbers:** `analytics.service`, `attendance.service`, `leave.service`, `payroll.service` are called by both REST controllers and AI tools.
- **Scope guard:** `requireRole(...roles)` middleware plus `scope(req)` helper that returns `{ employeeId }` for Employees and `{}` for HR/Admin. Employee controllers never read `employeeId` from params or body; they use `req.user.employeeId`.
- **Server stamps time:** clients never send timestamps for check-in.
- **No dummy data:** only first-run setup creates records (company, admin, default leave types).

## 5. Cut line and bonus strategy

If behind schedule at the checkpoints in Section 9, cut in this order: CSV (all), corrections, announcements UI polish, tenure/gender charts, notifications bell (keep the list page), Employee 360 extra tabs.

**Solo or two-person cut line:** keep only 01, 02, 04 (departments + holidays), 06, 09, 12, 13, 14, 15, 16, 17, 19 (3 tools), 21, 25. Drop dashboards to a KPI-card page with no charts.

**Cheap bonus (pick any; the brief caps bonus at +10):** AI understands Roman Urdu (one line in the system prompt plus a test question), dark mode (Tailwind `dark:` class toggle, 30 minutes), late penalty rule (3 lates = 0.5 day) as an Admin setting that defaults OFF so base payroll numbers match the brief. Skip camera, attrition risk and anomaly flags.

## 6. Business rules (authoritative)

### Settings (single document)

`companyName, timezone="Asia/Karachi", officeStart="09:00", graceMinutes=15, halfDayHours=5, weekend=["Sat","Sun"], officeLat, officeLng, radiusMeters=150, latePenaltyEnabled=false`. Changes apply to new records only; do not recompute history except through read-time rules that use stored per-record flags (`isLate`, `status` computed at check-out).

### Attendance

- Check-in: server time, one record per employee per date (unique index on `employeeId+date`), duplicate = 409.
- `isLate = checkInTime > officeStart + grace` on a working day.
- Check-out: sets `checkOut`, `workedHours`; `status = half_day` if workedHours < halfDayHours else `present`.
- Read-time status for a date with no record: holiday, weekend, on\_leave (approved leave covers it), absent (past working day, on/after joinDate, before exitDate), or none (future).
- Past date with check-in and no check-out: `missing_checkout`.
- Check-out without check-in = 422. Cannot check in if deactivated.

### Leave

- Types: annual 14, sick 8, casual 10, unpaid unlimited. Quotas editable by Admin; yearly.
- `countWorkingDays(start, end, weekend, holidays)` is the only day-count function.
- Apply: end ≥ start; days > 0 (all-weekend ranges = 422); no overlap with pending/approved requests; used + pending + requested ≤ quota else 422; single calendar year only.
- Approve/reject by HR with comment (required on reject). Approver cannot be the applicant. Creates notification and audit entry.
- Balance = quota − approved days in year (pending shown separately).

### Payroll (per employee per month)

```
basic; hra = 0.4*basic; medical = 0.1*basic; gross = 1.5*basic
workingDays = weekdays in month − holidays
employedDays = working days between max(joinDate, monthStart) and min(exitDate, monthEnd)
perDay = gross / workingDays
deductDays = absentDays + unpaidLeaveDays + 0.5*halfDays  (+0.5 per 3 lates if penalty on)
earned = perDay * (employedDays − deductDays)   // prorates joiners/leavers
annualTax = slab(gross*12); monthlyTax = annualTax/12
net = earned − monthlyTax
```

Slab on annual gross: 0–600k → 0; 600k–1.2M → 5% of excess over 600k; 1.2M–2.4M → 30k + 15% over 1.2M; 2.4M–3.6M → 210k + 25% over 2.4M; above 3.6M → 510k + 35% over 3.6M. Round money to 2 decimals at the end only.

Run lifecycle: `draft` (HR creates/regenerates/deletes) → `finalized` (Admin only; sets `finalizedAt/By`, writes payslips, notifies employees, locks). Unique `month`. Any mutation on a finalized run returns 403 and is covered by a test.

### Metrics (all in `metrics.ts`, aggregated server-side, filter by `from,to,departmentId`)

Headcount = active + probation on end date. Attrition = exits in period ÷ average headcount × 100. Attendance rate, late %, absenteeism, leave utilization, payroll cost and average salary exactly as the brief's Section 7.

## 7. Data model (Mongoose)

| Collection      | Key fields                                                                                                                                         | Indexes                   |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `settings`      | single doc, fields above                                                                                                                           | —                         |
| `users`         | email, passwordHash, role, employeeId?, isActive, mustChangePassword                                                                               | unique email              |
| `departments`   | name                                                                                                                                               | unique name               |
| `designations`  | name, departmentId?                                                                                                                                | unique name               |
| `employees`     | code, name, email, phone, address, gender, departmentId, designationId, joinDate, exitDate?, status (active/probation/exited), basicSalary, userId | unique code, unique email |
| `leavetypes`    | key (annual/sick/casual/unpaid), name, yearlyQuota (null=unlimited), isPaid                                                                        | unique key                |
| `holidays`      | date (YYYY-MM-DD), name                                                                                                                            | unique date               |
| `attendances`   | employeeId, date, checkIn, checkOut, workedHours, isLate, status, isNonWorkingDay                                                                  | unique {employeeId,date}  |
| `corrections`   | employeeId, date, requestedCheckIn?, requestedCheckOut?, reason, status, decidedBy, comment                                                        | {employeeId,status}       |
| `leaverequests` | employeeId, type, startDate, endDate, days, reason, status (pending/approved/rejected/cancelled), decidedBy, comment                               | {employeeId,startDate}    |
| `payrollruns`   | month (YYYY-MM), status, createdBy, finalizedBy, finalizedAt, totals                                                                               | unique month              |
| `payslips`      | runId, employeeId, month, basic, hra, medical, gross, absentDays, unpaidDays, halfDays, deductions, tax, net                                       | unique {runId,employeeId} |
| `announcements` | title, body, postedBy                                                                                                                              | createdAt desc            |
| `notifications` | userId, type, text, link, readAt                                                                                                                   | {userId,readAt}           |
| `auditlogs`     | actorId, actorRole, action, entity, entityId, before, after, createdAt                                                                             | createdAt desc            |
| `ailogs`        | userId, role, question, toolCalls, answerSummary, latencyMs, ok, createdAt                                                                         | {userId,createdAt}        |

## 8. AI assistant design

**Endpoints:** `POST /ai/chat`, `POST /ai/summary` (Admin, HR), `POST /ai/smart-leave` (Employee), all behind auth.

**Chat flow:** build system prompt (policy rules from Section 6 verbatim, today's date and weekday in the office timezone, user role, instruction to answer only from tool results or policy, refuse other people's personal data, reply in the user's language including Roman Urdu) → call LLM with role-gated tools → execute tool calls server-side with `req.user` scope → send results back → return answer with `aiGenerated: true` → write `ailogs`.

**Tools by role (all call existing services):**

| Tool                                            | Admin | HR  | Employee                                                            |
| ----------------------------------------------- | ----- | --- | ------------------------------------------------------------------- |
| `get_headcount(departmentId?, date?)`           | yes   | yes | no                                                                  |
| `get_attendance_summary(from,to,departmentId?)` | yes   | yes | own only (scope forced)                                             |
| `get_late_comers(from,to,limit)`                | yes   | yes | no                                                                  |
| `get_leave_summary(from,to,departmentId?)`      | yes   | yes | no                                                                  |
| `get_my_leave_balance(type?)`                   | yes   | yes | yes                                                                 |
| `get_payroll_summary(month)`                    | yes   | yes | no                                                                  |
| `search_employees(q,departmentId?)`             | yes   | yes | no (returns no salary field for anyone except Admin/HR via service) |

The salary-refusal test passes by construction: Employees get no tool that can return another person's data, plus a prompt refusal rule. Resolve department names to ids in a small server helper so the model can say "Engineering".

**Dashboard summary:** server computes the dashboard KPI JSON for the current filters, sends it with the instruction "3–5 bullets using only these numbers", returns bullets. Cache nothing.

**Smart leave:** prompt returns only `{type,start,end,reason}`; server validates with zod (type enum, ISO dates, start ≤ end, start ≥ today). On failure retry once, then return `{ fallback: true }` and the client shows the empty normal form. Client pre-fills the form; **nothing is saved** until the employee presses Submit.

**Guardrails:** `AI_API_KEY` env only; 15 s timeout via AbortController; friendly fallback message; 20 requests per user per hour counted from `ailogs`; "AI-generated" badge on every AI answer; max tool-call loop of 3 iterations.

**Live questions to rehearse:** active employees in a department; who came late most this month; this month's attendance rate (must equal the dashboard number); "how many sick leaves do I have left"; "what is {colleague}'s salary" (refusal); "next Monday and Tuesday off for my sister's wedding" (casual, correct dates; include a unit test for relative-date prompt context).

## 9. API surface

All routes under `/api`. Role column: A=Admin, H=HR, E=Employee.

| Module      | Endpoint                                                                                                                                                               | Roles                    |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| Setup       | `GET /setup/status`, `POST /setup` (only if no admin)                                                                                                                  | public                   |
| Auth        | `POST /auth/login`, `POST /auth/change-password`, `GET /auth/me`                                                                                                       | all                      |
| Users       | `POST /users/hr`, `PATCH /users/:id/deactivate`, `POST /users/:id/reset-password`                                                                                      | A                        |
| Settings    | `GET /settings` (A,H), `PUT /settings`                                                                                                                                 | A                        |
| Org         | CRUD `/departments`, `/designations`, `/leave-types` (PUT quota), `/holidays`                                                                                          | A write, A/H read        |
| Employees   | `POST /employees`, `GET /employees?q&dept&status&page`, `GET /employees/:id`, `PATCH /employees/:id`, `PATCH /me/profile`                                              | H write, A/H read, E own |
| Attendance  | `POST /attendance/check-in`, `POST /attendance/check-out`, `GET /attendance/me?month`, `GET /attendance/board?date&dept`, `GET /attendance/employee/:id?month`         | E, H/A                   |
| Corrections | `POST /corrections`, `GET /corrections` (scoped), `PATCH /corrections/:id` (approve/reject)                                                                            | E, H                     |
| Leave       | `POST /leave`, `GET /leave` (scoped), `GET /leave/balance`, `PATCH /leave/:id/cancel`, `PATCH /leave/:id/decision`                                                     | E, H/A read              |
| Payroll     | `PUT /employees/:id/salary`, `POST /payroll/runs`, `GET /payroll/runs/:month`, `POST /payroll/runs/:month/finalize`, `GET /payslips` (scoped), `GET /payslips/:id/pdf` | H, A, E own              |
| Analytics   | `GET /analytics/admin`, `/analytics/hr`, `/analytics/me` with `from,to,departmentId`                                                                                   | A, H, E                  |
| AI          | `/ai/chat`, `/ai/summary`, `/ai/smart-leave`                                                                                                                           | per role                 |
| Comms       | `GET/POST /announcements`, `GET /notifications`, `PATCH /notifications/:id/read`                                                                                       | all / A,H post           |
| Audit       | `GET /audit?page&entity&actor`                                                                                                                                         | A                        |

**Frontend must mock against this table from minute one.** Backend publishes the exact response shapes for login, employee, attendance record, leave request, payroll run and analytics KPI payloads in the first 30 minutes as TypeScript types in a shared `types/` file copied into both packages.

## 10. UI / UX requirements

- Role-based sidebar and route guards (client guard is UX only; server is the authority).
- Screens: Setup wizard, Login, Change password, Dashboard (per role), Employees (list, create, profile), Attendance (check-in widget, calendar, HR board), Leave (apply, my leaves, approval inbox), Payroll (runs list, draft review, finalize, payslips), AI panel (floating chat drawer), Announcements, Notifications, Audit log, Org setup (tabs: Company, Departments, Designations, Leave types, Holidays, Users).
- Shared components built in the first two frontend hours: `Loading`, `EmptyState`, `ErrorState`, `ConfirmDialog`, `DataTable` (server paging), `StatCard`, `AiBadge`. Every page uses them; this alone secures most of the 10 UI points.
- Responsive from 375 px: sidebar collapses to a drawer, tables scroll horizontally.
- Dashboards: HR (KPIs, attendance trend, absenteeism by dept, leave by type, top 5 late-comers, Summarize button), Admin (headcount, attrition YTD, payroll cost, avg salary, headcount by dept, payroll cost by dept, audit feed, Summarize), Employee (check-in widget, hours vs 40 h, late count, leave balance, last payslip, announcements, ask-my-assistant). Gender and tenure charts are P2.

## 11. Security checklist (10 points)

- bcrypt hashes, never returned in any response; `select: false` on `passwordHash`.
- Every route has `requireAuth` and `requireRole`; Employee controllers derive identity from the token.
- Rate-limit login (10 per 15 min per IP) and AI (20 per hour per user).
- helmet, cors restricted to the frontend origin, request body size limit, zod on every body and query.
- `.env.example` committed, real `.env` ignored; AI key only on the server; the browser never calls the provider.
- Audit log written inside services, immutable by construction (no mutation endpoints).
- Deactivated users are rejected at login and on every token check.
- Write 4 permission tests: employee requesting another employee's data (403/404), employee hitting HR route (403), finalized run edit (403), HR trying to finalize (403).

## 12. Parallel work split

| Person     | Owns                                                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend A  | server scaffold, config, error handler, auth, setup, RBAC/scope, settings, org CRUD, users, employees, audit helper, announcements, notifications |
| Backend B  | `rules/` + tests, attendance, leave, corrections, payroll + PDF, analytics/metrics, AI service and tools                                          |
| Frontend A | Vite scaffold, shared components, layout/sidebar/guards, setup, login, org setup, employees, announcements, notifications, audit log              |
| Frontend B | attendance, leave (incl. smart leave form), payroll and payslips, three dashboards, AI chat drawer and summarize                                  |

Integration rule: merge to `main` at least every 60 minutes; small PRs; frontend never waits on backend because it develops against the API table and mocked responses.

## 13. Hour-by-hour plan (hours 2 to 12)

| Window                           | Backend A                                                                                                         | Backend B                                                                                         | Frontend A                                                           | Frontend B                                                                |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **H2–3** Foundations             | Express/TS scaffold, Atlas connect, auth, setup, JWT, error format, RBAC middleware                               | `rules/` pure functions: time, workingDays, attendance status, tax slab, payroll calc, with tests | Vite/Tailwind/shadcn, router, auth context, shared components        | Types from contract, mock API layer, check-in widget UI, dashboard shells |
| **H3–4** Deploy + org            | Settings, departments, designations, leave types, holidays, users; **deploy hello world to Render + Atlas**       | Attendance models + check-in/out routes and calendar queries                                      | Login, setup wizard, role sidebar; **deploy frontend**               | Attendance calendar + HR board screens                                    |
| **H4–5.5** Employees + leave     | Employees CRUD with login creation, search/paging, salary endpoint, audit helper wired                            | Leave apply/balance/cancel/decision with 409/422 rules; notifications writer                      | Org setup screens, employee list/create/profile, temp-password modal | Leave apply form, my leaves, HR approval inbox                            |
| **H5.5–7.5** Payroll + analytics | Announcements, notifications API, audit endpoint, corrections (if P1)                                             | Payroll draft/finalize, payslips, PDF, metrics + analytics endpoints                              | Announcements, notifications, audit log, profile edit                | Payroll screens, payslip download, dashboards wired to real data          |
| **H7.5–9** AI                    | Hardening: permission tests, validation gaps, rate limits                                                         | AI chat + tools, summary, smart leave, ailogs, fallback                                           | Polish empty/loading/error states, responsive pass                   | AI chat drawer, Summarize, smart leave prefill UI                         |
| **H9–10.5** Integrate            | Bug fixes from full demo run                                                                                      | Bug fixes; verify AI numbers equal dashboard numbers                                              | Corrections UI, dark mode (bonus), small UX fixes                    | Charts polish, filters (date range + department)                          |
| **H10.5–11.5** Ship              | README, `.env.example`, production env vars                                                                       | Warm hosted DB check, seed-free reset steps                                                       | Final responsive check                                               | Demo rehearsal timing                                                     |
| **H11.5–12**                     | Submit links on lms.saylaniit.com, final smoke test on hosted URL, **feature freeze already in effect since H11** |                                                                                                   |                                                                      |                                                                           |

**Checkpoints (cut features if missed):** end of H4: login + roles work on hosted URL. End of H6: employee registered, checks in, applies leave, HR approves. End of H8: payroll run + finalize + payslip PDF. End of H9: AI answers match dashboard. After H11: no new features, only fixes.

## 14. Acceptance tests (run on a _fresh_ hosted DB at H10.5 and H11.5)

Follow the brief's 5-minute demo script literally and tick each step:

1. Fresh URL shows first-run setup; create company and Admin; Admin sets office hours, a department, a designation, one holiday, creates an HR login.
2. HR logs in, registers 3 employees (one with `joinDate` mid-month); temp password shown once.
3. One employee logs in, is forced to change password, checks in (second attempt shows 409 message), checks out.
4. Employee types the wedding sentence; form is pre-filled with correct type and dates; confirms; HR sees it in the inbox and approves with a comment; employee sees notification and updated balance.
5. HR dashboard KPIs match the records just created; Summarize returns 3–5 bullets using only those numbers; "who is on leave today" gives the correct answer.
6. HR creates the payroll draft; amounts match a hand calculation (spreadsheet with the Section 6 formulas); Admin finalizes; editing afterwards is refused; employee downloads PDF payslip.
7. Employee asks for a colleague's salary: polite refusal. Admin opens the audit log and sees before/after JSON.
8. Permission tests pass; unit tests pass (`npm test` in `/server`).

## 15. Risks and mitigations

| Risk                                              | Mitigation                                                                                                                  |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Free LLM tier rate-limited or slow during judging | Cache nothing but keep fallback messages; have a second provider key ready behind the same env interface; 15 s timeout      |
| Render cold start                                 | Ping the backend 5 minutes before demo; mention the delay in README                                                         |
| Timezone bugs                                     | One `time.ts`, tests with fixed instants around midnight PKT                                                                |
| Merge conflicts                                   | Folder ownership per person; contract types file changes go through one owner                                               |
| Scope creep                                       | Section 5 cut line enforced by a single decision maker (pick a team lead now)                                               |
| Judge data differs from yours                     | No seed data, all numbers via aggregation, rules unit-tested                                                                |
| Payroll mismatch with judge's math                | Show the formula breakdown on the payslip and draft screen (basic, HRA, medical, gross, per-day rate, deductions, tax, net) |

## 16. README requirements (judges run it in under 10 minutes)

Stack, architecture diagram, local run (`npm i && npm run dev` in both packages), env variables table, how to create the first Admin (UI first-run, or `ADMIN_EMAIL`/`ADMIN_PASSWORD`), how to set `AI_API_KEY`/`AI_BASE_URL`/`AI_MODEL`, the decisions in Section 1 that affect judging (weekend check-in, payroll and tax assumptions), what is done and not done (be honest: mobile/camera not built), test command, and the live URLs.

## 17. Definition of done

All P0 rows in Section 3 work on the hosted URL starting from an empty database; the 8 acceptance steps pass; permission and rule tests pass; README and `.env.example` committed with no secrets; links submitted on the Saylani LMS before the deadline.
