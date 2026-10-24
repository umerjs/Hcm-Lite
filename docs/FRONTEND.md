# HCM Lite — Frontend Kit for OpenCode

A frontend spec to commit as `docs/FRONTEND.md`, plus the OpenCode setup, rules and prompts to build every screen. Backend runs in parallel in Gemini; the frontend never waits for it.

## 1. Setup (10 minutes)

**Install and run**

- Install: `npm i -g opencode-ai` (or the install script from opencode.ai), then run `opencode` inside the repo. Use `/connect` to add a provider key and `/models` to pick a model. Commands and flags change between versions, so check `opencode --help` or the docs if one below does not work.
- Two modes, switched with Tab: **Plan** (reads and proposes, edits nothing) and **Build** (edits files and runs commands). Use Plan for slice F0 only; use Build for the rest.
- Useful: `@path/to/file` attaches a file to a prompt, `/undo` reverts the last agent change, `/new` starts a fresh session between slices (keeps context small and cheap).
- Do not run `/init` if `AGENTS.md` already exists; OpenCode reads `AGENTS.md` as its rules file.

**Do not collide with the backend agent**

1. Create a separate working copy: `git worktree add ../hcm-fe -b fe-main main`, then run OpenCode in `../hcm-fe`. The backend agent keeps the original folder.
2. Folder ownership: OpenCode edits **only `client/`** and `docs/FRONTEND.md`. Never `server/`.
3. Merge to `main` at least hourly: commit, `git pull --rebase origin main`, `git push origin fe-main`, then merge. Pull before every slice to get new `client/src/types/api.ts` changes and new endpoints.
4. Commit after every slice. If a slice goes wrong, `git reset --hard` to the last commit in the worktree is safe because only you work there.

**Add to `AGENTS.md`** (append this block, do not replace the file)

```markdown
## Frontend rules (OpenCode)

Own only client/ and docs/FRONTEND.md. Never edit server/. The source of truth for API shapes is client/src/types/api.ts; the source of truth for screens is docs/FRONTEND.md. If a real endpoint differs from the types, adapt in the api layer, list it in docs/API_MISMATCHES.md, and do not change server code.

- Stack: React 19, Vite, TypeScript, Tailwind v4, shadcn/ui, React Router, TanStack Query, react-hook-form + zod, Recharts, axios. Do not add other libraries without asking. Package manager: bun.
- All HTTP lives in client/src/api/*. Components never call axios. Every api function is typed from client/src/types/api.ts.
- Every page and data widget handles loading, empty and error states with the shared Loading, EmptyState and ErrorState components.
- Role access is checked on the server; route guards only improve UX.
- Mobile first: must work at 375px width. Tables scroll horizontally on small screens.
- Dates are YYYY-MM-DD strings in Asia/Karachi; money is shown as PKR with thousands separators and 2 decimals. Never compute business numbers on the client (payroll, tax, attendance rate, balances): display what the server returns.
- One slice per request. Finish with: typecheck (bunx tsc --noEmit), build (bun run build), a short summary and how to test manually. Then stop.
- Do not restyle or refactor files outside the slice.
```

**Custom command** `.opencode/command/fe-slice.md`

```markdown
---
description: Build exactly one frontend slice
---

Build this slice only: $ARGUMENTS

Read AGENTS.md and docs/FRONTEND.md first, and use client/src/types/api.ts for every request and response shape. List the files you will create or change, implement them, run `bunx tsc --noEmit` and `bun run build`, fix errors, then print a short summary and manual test steps. Stop. Do not start another slice.
```

Then use it as `/fe-slice F3 attendance screens` after reading the prompts in Section 5.

## 2. `docs/FRONTEND.md` (paste into the repo)

```markdown
# HCM Lite frontend spec

## Conventions

- API base: VITE_API_URL (default https://hcm-lite-dev.vercel.app/api/v1). Auth: Authorization: Bearer <token>. Store the token in localStorage under hcm_token.
- Error shape: { error: { code, message, fields? } }. Show message in a toast; map fields to form errors. 401 clears the token and redirects to /login. 403 shows a Forbidden state. 409 and 422 show the server message inline. 429 on AI shows "Too many AI requests, try again later".
- Mock mode: VITE_USE_MOCK=true makes each api function return typed fixtures from client/src/api/mocks/. Build against mocks first, then turn the real endpoint on per module, one at a time. Fixtures must match client/src/types/api.ts exactly.
- Shared components (build once, reuse everywhere): Loading, EmptyState, ErrorState, ConfirmDialog, StatCard, DataTable (server paging), StatusBadge (attendance, leave, payroll statuses), AiBadge ("AI-generated"), PageHeader, FormField, MoneyText, DateText.
- Layout: sidebar by role; drawer under 768px; top bar with notification bell (unread count), theme toggle, user menu (profile, logout). Dark mode via Tailwind dark class, saved in localStorage.

## Auth flow

1. On app load call GET /setup/status. If needsSetup, show /setup (company name, admin name, email, password with confirmation). On success go to /login.
2. /login: email and password. The response gives token and user { role, mustChangePassword }.
3. If mustChangePassword, redirect everywhere to /change-password until done (the response returns a fresh token).
4. Redirect to /dashboard by role. Unknown role or missing token goes to /login.

## Menus and routes by role

Admin: Dashboard, Organization, Employees, Attendance board, Leave (read-only), Payroll (review and finalize), Payslips (all), Announcements, Audit log, Notifications, Profile.
HR: Dashboard, Employees, Attendance board, Corrections inbox, Leave inbox, Payroll (salary, draft, review), Announcements, Notifications, Profile.
Employee: Dashboard, My attendance, My leave, My payslips, Announcements, Notifications, My profile.
The AI assistant drawer is available on every page for every role.

## Screens

### Setup and auth

Setup wizard, login, change password. Password rule: at least 8 characters, shown inline.

### Dashboards (GET /analytics/admin, /analytics/hr, /analytics/me)

Filters for Admin and HR: date range and department (query params from, to, departmentId). A Summarize button posts the current filters to /ai/summary and shows 3 to 5 bullets under an AiBadge.

- Admin: StatCards headcount, attrition YTD, payroll cost, average salary; bar chart headcount by department; bar chart payroll cost by department; last 8 audit entries.
- HR: StatCards headcount, present, on leave, late today, pending approvals; line chart attendance trend; bar chart absenteeism by department; bar or pie chart leave by type; top 5 late-comers table.
- Employee: check-in widget, hours this week versus 40 h (progress bar), late count, leave balance cards, last payslip card, announcements, an "Ask my assistant" button that opens the AI drawer.
  Render exactly what the server returns; empty data shows EmptyState with a hint (for example "No attendance yet this month").

### Organization (Admin)

Tabs: Company settings (office start, grace minutes, half-day hours, weekend days, timezone, office lat/lng/radius, late penalty toggle), Departments, Designations, Leave types (edit quota), Holidays (date and name), Users (create HR login, deactivate, reset password; temp password shown once).

### Employees (HR write, Admin read)

List with search box, department and status filters, server paging. Create form: code, name, email, phone, address, gender, department, designation, join date, status, basic salary. On success show a modal with the temporary password, a copy button, and "This is shown only once". Employee profile tabs: Details, Attendance (month calendar), Leave (history), Payroll (payslips; HR can edit basic salary and sees derived HRA 40%, medical 10%, gross 1.5 x basic, display only).

### Attendance

Employee: a large Check in / Check out button driven by today's record (not checked in, checked in at HH:mm with Late badge if late, checked out with hours). Weekend or holiday shows a notice that attendance is still recorded. A 409 shows "You have already checked in today". Month calendar with colored StatusBadges (present, half_day, missing_checkout, absent, on_leave, holiday, weekend). Clicking a past date opens a Request correction dialog (date, requested check-in and check-out times, reason).
HR and Admin: Attendance board with date picker and department filter, counts per status, table of employees with status and times.
HR: Corrections inbox with Approve or Reject and a comment dialog.

### Leave

Employee: balance cards per type (quota, used, pending, remaining), apply form (type, start, end, reason) with a SmartLeave textbox above it, my requests table with Cancel on pending or future approved rows. Server errors (overlap, over balance) show inline.
HR: Leave inbox of pending requests, Approve or Reject dialog with comment (required on reject). Admin: read-only list.

### Payroll

HR: set basic salary on the employee profile; Payroll page lists runs by month, Create draft (month picker), review table with columns employee, basic, gross, absent days, unpaid days, half days, deductions, tax, net, plus totals; Regenerate while draft.
Admin: same review table plus a Finalize button behind ConfirmDialog; finalized runs show a Locked badge and no edit controls.
Employee: payslips list with month, net pay and a PDF download. Download with axios responseType blob and the auth header, then open the object URL.

### AI assistant

Floating button opens a drawer with chat history for the session, a text box, example question chips by role, a loading indicator, and an AiBadge on every assistant reply. Posts to /ai/chat. On timeout or error show "The assistant is unavailable right now" and keep the chat usable.
Smart leave: the textbox posts to /ai/smart-leave and pre-fills the leave form with { type, start, end, reason }. If the response has fallback true, tell the user and leave the form empty. Never submit automatically.

### Announcements, notifications, audit, profile

Announcements list for all roles; Admin and HR can post (title and body). Notification bell with unread count, a list page, mark as read on click. Audit log (Admin): table with filters for entity and actor, paging, and an expandable row showing before and after JSON. My profile: view details, edit phone and address only.

## Done means

No console errors, typecheck and build pass, every list has loading, empty and error states, 375px width has no horizontal page scroll, dark mode readable, every role sees only its own menu.
```

## 3. What is available on the backend today

Attendance, leave and corrections endpoints exist under `/api/v1`. Setup, auth changes, organization, employees, payroll, analytics, AI, announcements, notifications and audit are being built by the backend agent. Until each one lands, keep `VITE_USE_MOCK=true` for that module and flip it when the backend slice is merged. Tell the backend agent when the frontend needs a response shape changed, never edit `server/` yourself.

## 4. Order of work and timing

| Slice | What                                                        | Needs real backend | About     |
| ----- | ----------------------------------------------------------- | ------------------ | --------- |
| F0    | Audit current client, shell, shared components, mock layer  | no                 | 30–40 min |
| F1    | Setup, login, change password, role routing                 | setup and auth     | 30 min    |
| F2    | Employees (list, create, profile), organization tabs        | employees, org     | 60 min    |
| F3    | Attendance (employee, board)                                | attendance (ready) | 40 min    |
| F4    | Leave (apply, balance, inbox), corrections                  | leave (ready)      | 45 min    |
| F5    | Payroll and payslips                                        | payroll            | 45 min    |
| F6    | Three dashboards with charts and filters                    | analytics          | 60 min    |
| F7    | AI drawer, summarize, smart leave                           | AI                 | 40 min    |
| F8    | Announcements, notifications, audit, profile                | comms, audit       | 40 min    |
| F9    | Polish pass: states, 375px, dark mode, accessibility basics | all                | 45 min    |

Total roughly 7 hours of agent work. If time is short, cut in this order: F8 (keep notifications list only), F9 polish, charts on the Admin dashboard, Organization tabs other than Company, Holidays and Leave types.

## 5. Prompts (use `/fe-slice` or paste directly)

**F0 — audit and foundation (Plan mode first, then Build)**

Plan mode:

```
Read AGENTS.md, docs/FRONTEND.md and client/src/types/api.ts. Inspect client/ (package.json, vite config, App.tsx, routes, existing auth code and shadcn components). Do not edit anything. Report: what already exists, what conflicts with docs/FRONTEND.md, and a file-by-file plan for slice F0. Keep it under 40 lines.
```

Then Build mode:

```
Build slice F0: foundation. Install what is missing with bun: @tanstack/react-query react-hook-form @hookform/resolvers zod recharts react-router (only the missing ones). Create or adapt: src/api/http.ts (axios instance, Bearer token from localStorage hcm_token, 401 handler, error normalizer for { error: { code, message, fields } }), src/api/mockMode.ts (reads VITE_USE_MOCK), AuthContext with login/logout/me and mustChangePassword handling, role route guard component, app layout with role-based sidebar (menus from docs/FRONTEND.md), top bar with theme toggle and a notification bell placeholder, and shared components Loading, EmptyState, ErrorState, ConfirmDialog, StatCard, DataTable (server paging props), StatusBadge, AiBadge, PageHeader, FormField, MoneyText, DateText. Routes can render placeholder pages that show the page title. Do not build feature screens. Run the typecheck and the build.
```

**F1 — setup and auth**

```
Build slice F1: setup wizard (/setup), login (/login), change password (/change-password), role-based redirect to /dashboard, and the startup check with GET /setup/status. Use react-hook-form with zod, show server field errors, and make mustChangePassword block navigation until the password is changed. api functions in src/api/auth.ts and src/api/setup.ts with typed mocks. Test manually: fresh state shows setup, login redirects by role, forced change password works.
```

**F2 — employees and organization**

```
Build slice F2: Employees list (search, department filter, status filter, server paging via DataTable), create employee form with a temp-password modal (copy button, shown once warning), employee profile page with tabs Details, Attendance, Leave, Payroll (the last three can show EmptyState until later slices), HR-only edit of basic salary with derived HRA, medical and gross displayed as read-only. Then the Organization page for Admin with tabs Company settings, Departments, Designations, Leave types, Holidays, Users (create HR login, deactivate, reset password with one-time temp password). Mocks first; typed api modules src/api/employees.ts and src/api/org.ts.
```

**F3 — attendance (backend is ready: turn mocks off for this module)**

```
Build slice F3: Employee attendance page: Check in / Check out button driven by today's record, Late badge, weekend/holiday notice, 409 message handling, month calendar with StatusBadges from GET /attendance/me?month=YYYY-MM, a Request correction dialog. HR and Admin: attendance board with date picker, department filter, status counts and table from GET /attendance/board. Use the real endpoints; if a response differs from client/src/types/api.ts, adapt in src/api/attendance.ts and log it in docs/API_MISMATCHES.md.
```

**F4 — leave and corrections (backend is ready)**

```
Build slice F4: Employee leave page with balance cards (GET /leave/balance), apply form (POST /leave) with inline server errors for overlap and over-balance (422), my requests table with Cancel (PATCH /leave/:id/cancel). HR leave inbox of pending requests with an Approve/Reject dialog (comment required on reject) via PATCH /leave/:id/decision; Admin sees the list read-only. HR corrections inbox via GET /corrections and PATCH /corrections/:id with a comment dialog. Reserve a SmartLeave textbox slot above the apply form (wired in F7). Use real endpoints.
```

**F5 — payroll and payslips**

```
Build slice F5: HR payroll page: runs list by month, Create draft with a month picker, review table (employee, basic, gross, absent days, unpaid days, half days, deductions, tax, net, totals), Regenerate while draft. Admin: same view plus a Finalize button inside ConfirmDialog; finalized runs show a Locked badge and no edit controls. Employee: payslips list with PDF download using axios responseType blob with the auth header. Never compute money on the client. Mocks until the backend payroll slice is merged.
```

**F6 — dashboards**

```
Build slice F6: three dashboards as specified in docs/FRONTEND.md using Recharts and StatCard. Admin and HR get date range and department filters that refetch with from, to, departmentId. Add a Summarize button that posts the current filters to /ai/summary and shows 3 to 5 bullets under an AiBadge, with a graceful failure state. Employee dashboard includes the check-in widget from F3, hours vs 40 h progress, late count, leave balance cards, last payslip card, announcements and an Ask my assistant button. If a chart renders blank on React 19, add a react-is override matching the installed React version.
```

**F7 — AI drawer and smart leave**

```
Build slice F7: global AI assistant drawer (floating button on every page) posting to /ai/chat, with role-based example question chips, loading indicator, AiBadge on replies, friendly failure and 429 messages. Then wire the SmartLeave textbox on the leave page to /ai/smart-leave: pre-fill the apply form with { type, start, end, reason } and never auto-submit; if the response has fallback true, tell the user and leave the form empty.
```

**F8 — comms, audit, profile**

```
Build slice F8: announcements page (all read, Admin and HR post), notification bell with unread count and a notifications page with mark as read, Admin audit log table with entity and actor filters, paging and expandable before/after JSON rows, and My profile (view details, edit phone and address only).
```

**F9 — polish**

```
Build slice F9: audit every page for loading, empty and error states; fix any horizontal page scroll at 375px width; check dark mode contrast on every page; add focus states and aria labels on icon buttons; remove console errors and unused code; make sure every role only sees its own menu items and routes. Run typecheck and build. List anything not fixed.
```

## 6. Working rules that save time

- **Mocks first, then real:** a slice is finished when it works against mocks and the real endpoint where the backend exists. Do not wait for the backend.
- **Commit after every slice** and pull `main` before the next one. Run `/new` between slices.
- **Two-strike rule:** if the agent fails the same error twice, read the diff yourself, `/undo`, and restate the request more narrowly.
- **Review the risky 10% by hand:** the auth guard, the 401 handler, the token storage, and the PDF download.
- **Keep screens boring and consistent:** use shadcn components as they are; polish in F9 only.
- **Final check at the end of each block:** fresh login as each role on a clean database and run the demo script: Admin sets up, HR registers an employee, the employee checks in and applies for leave, HR approves, payroll, Admin finalizes, payslip download, AI questions, audit log.
