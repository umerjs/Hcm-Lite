# Graph Report - Mern-Template  (2026-10-25)

## Corpus Check
- 153 files · ~69,194 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 976 nodes · 2020 edges · 62 communities (56 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `952d72cc`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Profile.tsx
- routes/index.mjs
- client/package.json
- server/package.json
- api.ts
- components.json
- compilerOptions
- compilerOptions
- dependencies
- scripts
- compilerOptions
- devDependencies
- dependencies
- 🚀 Key Features & Modules
- compilerOptions
- server/vercel.json
- vite-env.d.ts
- client/vercel.json
- server/README.md
- AppError
- AGENTS.md — Secure, Fast App Development Playbook
- HCM Lite — PRD & 10-Hour Build Plan (MERN)
- HCM Lite — Gemini CLI Kickoff Kit
- 1. Business Rules
- HCM Lite — Frontend Kit for OpenCode
- Stubs Registry — Owned by Backend A
- HCM Lite — Authoritative Backend API Specification (`API_ACTUAL.md`)
- index.ts
- Dashboard.tsx
- eslint.config.js
- scripts
- imports
- vite.config.ts
- HCM Lite Design System
- formatDate
- http.ts
- App.tsx
- models/index.mjs
- 6. Organization Structure (Departments & Designations)
- 10. Employee Directory & Profiles
- 12. Leave Requests & Balances
- 11. Attendance Management
- 17. Communications & Announcements
- 4. User Profile Management
- 7. Holidays & Calendar
- 9. Users Administration (HR Accounts & Credentials)
- 15. Dashboard Analytics & Metrics
- setup.service.mjs
- HCM Lite Frontend Spec
- react
- 14. Payroll & PDF Payslips
- 3. Authentication & Password Management
- leave.service.mjs
- 2. Setup & First-Run Initialization
- 5. Company Settings
- notification.service.mjs
- vercel.json
- ai.service.mjs
- Payroll

## God Nodes (most connected - your core abstractions)
1. `AppError` - 89 edges
2. `react` - 41 edges
3. `mongoose` - 30 edges
4. `audit()` - 29 edges
5. `formatDate()` - 27 edges
6. `asyncHandler()` - 21 edges
7. `lucide-react` - 20 edges
8. `compilerOptions` - 20 edges
9. `requireAuth` - 20 edges
10. `express` - 20 edges

## Surprising Connections (you probably didn't know these)
- `AppRoutes()` --calls--> `useAuth()`  [EXTRACTED]
  client/src/App.tsx → client/src/context/AuthContext.tsx
- `validateQuery()` --calls--> `AppError`  [EXTRACTED]
  server/routes/attendance/index.mjs → server/utils/errors.mjs
- `loginLimiter` --calls--> `AppError`  [EXTRACTED]
  server/routes/auth/index.mjs → server/utils/errors.mjs
- `validateBody()` --calls--> `AppError`  [EXTRACTED]
  server/routes/comms/index.mjs → server/utils/errors.mjs
- `validateBody()` --calls--> `AppError`  [EXTRACTED]
  server/routes/correction/index.mjs → server/utils/errors.mjs

## Import Cycles
- None detected.

## Communities (62 total, 3 thin omitted)

### Community 0 - "Profile.tsx"
Cohesion: 0.13
Nodes (19): Button(), ButtonProps, FormProps, ButtonProps, Input(), Navbar(), PasswordInput(), PasswordInputProps (+11 more)

### Community 1 - "routes/index.mjs"
Cohesion: 0.06
Nodes (65): express, express-rate-limit, multer, handleMulterError(), multerMiddleware, authGuard, requireAuth, requireRole() (+57 more)

### Community 2 - "client/package.json"
Cohesion: 0.08
Nodes (25): @types/bun, typescript, zod, name, private, type, version, class-variance-authority (+17 more)

### Community 3 - "server/package.json"
Cohesion: 0.05
Nodes (40): cloudinary, cors, dayjs, dotenv, helmet, morgan, nodemailer, nodemon (+32 more)

### Community 4 - "api.ts"
Cohesion: 0.04
Nodes (56): AdminAnalytics, AiChatMessage, AiChatRequest, AiChatResponse, AiSmartLeaveRequest, AiSmartLeaveResponse, AiSummaryRequest, AiSummaryResponse (+48 more)

### Community 5 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 6 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, allowJs, jsx, lib, module, moduleDetection, moduleResolution (+12 more)

### Community 7 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 8 - "dependencies"
Cohesion: 0.09
Nodes (23): dependencies, axios, class-variance-authority, cn, @fontsource-variable/geist, @hookform/resolvers, lucide-react, radix-ui (+15 more)

### Community 9 - "scripts"
Cohesion: 0.17
Nodes (11): name, private, scripts, build, dev, dev:client, dev:server, format (+3 more)

### Community 10 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 11 - "devDependencies"
Cohesion: 0.14
Nodes (14): devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, @types/bun, @types/node (+6 more)

### Community 12 - "dependencies"
Cohesion: 0.11
Nodes (19): dependencies, bcryptjs, cloudinary, cors, dayjs, dotenv, express, express-rate-limit (+11 more)

### Community 13 - "🚀 Key Features & Modules"
Cohesion: 0.09
Nodes (21): 1. First-Run Setup & Zero-Config Bootstrap, 1. Installation, 2. Environment Configuration, 2. Multi-Tier RBAC & Enterprise Security, 3. First-Run Setup & Admin Account Provisioning, 3. Organization Management, 4. Employee Directory & Profiles, 5. Geofenced Attendance & Timesheets (+13 more)

### Community 14 - "compilerOptions"
Cohesion: 0.29
Nodes (6): compilerOptions, baseUrl, ignoreDeprecations, paths, files, references

### Community 15 - "server/vercel.json"
Cohesion: 0.50
Nodes (3): builds, routes, version

### Community 20 - "AppError"
Cohesion: 0.12
Nodes (26): getNextEmployeeCode(), audit(), createEmployee(), getEmployeeById(), updateEmployee(), updateMyProfile(), updateSalary(), createHoliday() (+18 more)

### Community 21 - "AGENTS.md — Secure, Fast App Development Playbook"
Cohesion: 0.07
Nodes (26): 10. Testing and Verification, 11. Dependency, Offline, and Git Safety, 12. Definition of Done, 1. Operating Rules, 2. Fast, Low-Risk Workflow, 3. Security Baseline — Apply by Default, 4. Form and Input Validation — Empty Values Included, 5. API and Error-Handling Rules (+18 more)

### Community 22 - "HCM Lite — PRD & 10-Hour Build Plan (MERN)"
Cohesion: 0.08
Nodes (25): 0. How to use this doc, 10. UI / UX requirements, 11. Security checklist (10 points), 12. Parallel work split, 13. Hour-by-hour plan (hours 2 to 12), 14. Acceptance tests (run on a _fresh_ hosted DB at H10.5 and H11.5), 15. Risks and mitigations, 16. README requirements (judges run it in under 10 minutes) (+17 more)

### Community 23 - "HCM Lite — Gemini CLI Kickoff Kit"
Cohesion: 0.15
Nodes (12): 0. Existing repo mode: investigate first, 10. Final reminders before you start, 1. Before you type anything (10 minutes), 2. Folder layout (target layout; migrate toward it, do not move everything at once), 3. `GEMINI.md` (repo root, paste exactly), 4. `docs/RULES.md` — worked examples to paste in, 5. Custom slash commands (`.gemini/commands/*.toml`), 6. Phase 0 prompts (first 45 minutes, in parallel) (+4 more)

### Community 24 - "1. Business Rules"
Cohesion: 0.17
Nodes (11): 1. Business Rules, 2. Worked Examples & Test Cases, Attendance, Attendance Status, HCM Lite — Authoritative Business Rules & Worked Examples, Leave, Leave Working Days, Payroll (+3 more)

### Community 25 - "HCM Lite — Frontend Kit for OpenCode"
Cohesion: 0.25
Nodes (7): 1. Setup (10 minutes), 2. `docs/FRONTEND.md` (paste into the repo), 3. What is available on the backend today, 4. Order of work and timing, 5. Prompts (use `/fe-slice` or paste directly), 6. Working rules that save time, HCM Lite — Frontend Kit for OpenCode

### Community 26 - "Stubs Registry — Owned by Backend A"
Cohesion: 0.50
Nodes (3): Active Stubs, Graduated to Real Implementations (Slice A1, A2, A3 & A4), Stubs Registry — Owned by Backend A

### Community 27 - "HCM Lite — Authoritative Backend API Specification (`API_ACTUAL.md`)"
Cohesion: 0.15
Nodes (13): 13. Attendance Corrections, 16. Audit Logs, 18. AI Assistant & Smart Leave, 1. Global Conventions & Protocols, 8. Leave Types & Quotas, `GET /api/v1/audit`, `GET /api/v1/corrections`, `GET /api/v1/leave-types` (+5 more)

### Community 28 - "index.ts"
Cohesion: 0.08
Nodes (24): ConfirmDialog(), ConfirmDialogProps, Column, DataTable(), DataTableProps, DateText(), DateTextProps, EmptyState() (+16 more)

### Community 29 - "Dashboard.tsx"
Cohesion: 0.20
Nodes (25): STATUS_STYLES, StatusBadge(), StatusBadgeProps, Button(), buttonVariants, Card, CardContent(), CardDescription() (+17 more)

### Community 30 - "eslint.config.js"
Cohesion: 0.33
Nodes (5): @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, typescript-eslint

### Community 31 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, preview, typecheck

### Community 32 - "imports"
Cohesion: 0.50
Nodes (4): imports, #components/*, #hooks/*, #lib/*

### Community 33 - "vite.config.ts"
Cohesion: 0.50
Nodes (3): @tailwindcss/vite, vite, @vitejs/plugin-react

### Community 34 - "HCM Lite Design System"
Cohesion: 0.33
Nodes (5): Component Specifications (shadcn/ui based), HCM Lite Design System, Layout & Responsiveness, Theme & Vibe, Typography & Hierarchy

### Community 35 - "formatDate"
Cohesion: 0.15
Nodes (27): getEmployeeMetrics(), getHrMetrics(), checkIn(), checkOut(), getBoard(), getEmployeeMonth(), getMyMonth(), applyCorrection() (+19 more)

### Community 36 - "http.ts"
Cohesion: 0.14
Nodes (21): extractErrorMessage(), http, NormalizedError, TOKEN_STORAGE_KEY, RoleRoute(), RoleRouteProps, AuthContext, AuthContextType (+13 more)

### Community 37 - "App.tsx"
Cohesion: 0.09
Nodes (26): App(), AppRoutes(), queryClient, AppLayout(), Attendance(), formatTime(), unwrap(), AnnouncementsPage() (+18 more)

### Community 38 - "models/index.mjs"
Cohesion: 0.11
Nodes (21): mongoose, AttendanceModel, AttendanceSchema, CorrectionModel, CorrectionSchema, DepartmentSchema, DesignationModel, DesignationSchema (+13 more)

### Community 41 - "6. Organization Structure (Departments & Designations)"
Cohesion: 0.22
Nodes (9): 6. Organization Structure (Departments & Designations), `DELETE /api/v1/departments/:id`, `DELETE /api/v1/designations/:id`, `GET /api/v1/departments`, `GET /api/v1/designations`, `PATCH /api/v1/departments/:id`, `PATCH /api/v1/designations/:id`, `POST /api/v1/departments` (+1 more)

### Community 42 - "10. Employee Directory & Profiles"
Cohesion: 0.29
Nodes (7): 10. Employee Directory & Profiles, `GET /api/v1/employees`, `GET /api/v1/employees/:id`, `PATCH /api/v1/employees/:id`, `PATCH /api/v1/me/profile`, `POST /api/v1/employees`, `PUT /api/v1/employees/:id/salary`

### Community 43 - "12. Leave Requests & Balances"
Cohesion: 0.29
Nodes (7): 12. Leave Requests & Balances, `GET /api/v1/leave`, `GET /api/v1/leave/balance`, `GET /api/v1/leave/:id`, `PATCH /api/v1/leave/:id/cancel`, `PATCH /api/v1/leave/:id/decision`, `POST /api/v1/leave`

### Community 44 - "11. Attendance Management"
Cohesion: 0.33
Nodes (6): 11. Attendance Management, `GET /api/v1/attendance/board`, `GET /api/v1/attendance/employee/:id`, `GET /api/v1/attendance/me`, `POST /api/v1/attendance/check-in`, `POST /api/v1/attendance/check-out`

### Community 45 - "17. Communications & Announcements"
Cohesion: 0.33
Nodes (6): 17. Communications & Announcements, `GET /api/v1/announcements`, `GET /api/v1/notifications`, `PATCH /api/v1/notifications/:id/read`, `PATCH /api/v1/notifications/read-all`, `POST /api/v1/announcements`

### Community 46 - "4. User Profile Management"
Cohesion: 0.33
Nodes (6): 4. User Profile Management, `DELETE /api/v1/profile`, `GET /api/v1/profile`, `GET /api/v1/profile/:userId`, `PUT /api/v1/profile`, `PUT /api/v1/profile/avatar`

### Community 47 - "7. Holidays & Calendar"
Cohesion: 0.40
Nodes (5): 7. Holidays & Calendar, `DELETE /api/v1/holidays/:id`, `GET /api/v1/holidays`, `PATCH /api/v1/holidays/:id`, `POST /api/v1/holidays`

### Community 48 - "9. Users Administration (HR Accounts & Credentials)"
Cohesion: 0.40
Nodes (5): 9. Users Administration (HR Accounts & Credentials), `GET /api/v1/users`, `PATCH /api/v1/users/:id/deactivate`, `POST /api/v1/users/hr`, `POST /api/v1/users/:id/reset-password`

### Community 49 - "15. Dashboard Analytics & Metrics"
Cohesion: 0.67
Nodes (3): 15. Dashboard Analytics & Metrics, `GET /api/v1/analytics/hr`, `GET /api/v1/analytics/me`

### Community 50 - "setup.service.mjs"
Cohesion: 0.22
Nodes (13): bcryptjs, jsonwebtoken, supertest, vitest, AuditLogModel, AuditLogSchema, queryMutationMethods, UserModel (+5 more)

### Community 51 - "HCM Lite Frontend Spec"
Cohesion: 0.50
Nodes (3): Conventions, HCM Lite Frontend Spec, Slices (Build Order)

### Community 52 - "react"
Cohesion: 0.25
Nodes (10): NavItem, Sidebar(), SidebarProps, ThemeToggle(), TopBar(), TopBarProps, AiBadge(), AiBadgeProps (+2 more)

### Community 53 - "14. Payroll & PDF Payslips"
Cohesion: 0.50
Nodes (4): 14. Payroll & PDF Payslips, `GET /api/v1/payroll`, `GET /api/v1/payroll/:employeeId/month/:month/pdf`, `GET /api/v1/payroll/me`

### Community 54 - "3. Authentication & Password Management"
Cohesion: 0.50
Nodes (4): 3. Authentication & Password Management, `POST /api/v1/auth/change-password`, `POST /api/v1/auth/login`, `PUT /api/v1/password`

### Community 55 - "leave.service.mjs"
Cohesion: 0.23
Nodes (11): getHolidaysForRange(), applyLeave(), cancelLeave(), decideLeave(), getBalance(), getLeaveById(), getLeaves(), DEFAULT_LEAVE_TYPES (+3 more)

### Community 56 - "2. Setup & First-Run Initialization"
Cohesion: 0.67
Nodes (3): 2. Setup & First-Run Initialization, `GET /api/v1/setup/status`, `POST /api/v1/setup`

### Community 57 - "5. Company Settings"
Cohesion: 0.67
Nodes (3): 5. Company Settings, `GET /api/v1/settings`, `PUT /api/v1/settings`

### Community 58 - "notification.service.mjs"
Cohesion: 0.22
Nodes (5): AnnouncementModel, AnnouncementSchema, NotificationModel, NotificationSchema, markNotificationAsRead()

### Community 59 - "vercel.json"
Cohesion: 0.20
Nodes (9): framework, root, rewrites, $schema, framework, root, services, client (+1 more)

### Community 60 - "ai.service.mjs"
Cohesion: 0.28
Nodes (6): openai, AILogModel, AILogSchema, aiTools, getOpenAIClient(), processChat()

### Community 61 - "Payroll"
Cohesion: 0.67
Nodes (3): currency(), Payroll(), unwrap()

## Knowledge Gaps
- **478 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+473 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 515 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `Profile.tsx`, `client/package.json`, `http.ts`, `App.tsx`, `index.ts`, `Dashboard.tsx`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `AppError` connect `AppError` to `routes/index.mjs`, `formatDate`, `models/index.mjs`, `setup.service.mjs`, `leave.service.mjs`, `notification.service.mjs`, `ai.service.mjs`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `mongoose` connect `models/index.mjs` to `routes/index.mjs`, `server/package.json`, `formatDate`, `setup.service.mjs`, `AppError`, `leave.service.mjs`, `notification.service.mjs`, `ai.service.mjs`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _478 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Profile.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1268939393939394 - nodes in this community are weakly interconnected._
- **Should `routes/index.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.05828953655040611 - nodes in this community are weakly interconnected._
- **Should `client/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._