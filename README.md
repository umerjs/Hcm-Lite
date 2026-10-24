# Saylani HCM Lite

A modern, production-grade Human Capital Management (HCM) system designed and engineered for the Saylani Hackathon. Built from the ground up for performance, auditability, and ease of use, featuring geofenced attendance, automated payroll, real-time analytics dashboards, and an LLM-powered smart leave assistant.

> 🌐 **Live Deployment:** [https://hcm-lite-dev.vercel.app/](https://hcm-lite-dev.vercel.app/)  
> 📡 **Production API:** `https://hcm-lite-dev.vercel.app/api/v1`

---

## 🛠 Tech Stack

- **Runtime & Package Manager:** [Bun](https://bun.sh/)
- **Backend:** Node.js 24 / Express 5 (Native ESM `.mjs`), MongoDB & Mongoose 9, JWT, Bcrypt, PDFKit, OpenAI SDK, Express Rate Limit
- **Frontend:** React 19, TypeScript 6, Vite 8, Tailwind CSS v4, Lucide Icons, React Router DOM, Zustand
- **Testing & Quality:** Vitest (172 tests across 10 test suites), strict TypeScript typechecks

---

## 🚀 Key Features & Modules

Saylani HCM Lite is organized into 9 robust, interconnected modules:

### 1. First-Run Setup & Zero-Config Bootstrap

- Race-safe, single-execution `/setup` endpoint that initializes the singleton company settings, default leave quotas (Annual 14, Sick 8, Casual 10, Unpaid unlimited), and the root Admin user.
- Atomic rollback ensures zero partial state if any onboarding step fails.
- Optional environmental cold-boot bootstrap via `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

### 2. Multi-Tier RBAC & Enterprise Security

- Strict Role-Based Access Control (`admin`, `hr`, `employee`).
- Append-only, immutable **Audit Log** (`AuditLogModel`) intercepting every administrative mutation with before/after state diffs.
- First-login temporary password enforcement (`mustChangePassword: true`) requiring password rotation before accessing protected systems.
- Rate-limiting protection on login endpoints and AI assistant routes.

### 3. Organization Management

- Full lifecycle management for **Departments** and **Designations**.
- Referential integrity enforcement (prevents deleting active departments/designations assigned to employees).
- Organization-wide **Holiday Calendar** with range-based date querying for working-day calculations.

### 4. Employee Directory & Profiles

- Atomic HR onboarding: automatically generates sequential employee codes (`EMP-0001`), creates the employee record, and provisions a linked user login with temporary credentials.
- Scoped access: employees can only view their own profile; HR and Admin can search and filter the entire directory.
- Strict employee self-service endpoint (`PATCH /api/v1/me/profile`) allowing updates to phone and address while preventing unauthorized privilege escalation.

### 5. Geofenced Attendance & Timesheets

- Coordinate-based office check-in and check-out with customizable radius enforcement (default 500m) and grace-period late tracking (15 min default).
- Working hours calculation and automatic status evaluation (`present`, `half_day`, `late`, `missing_checkout`, `absent`).
- Personal monthly calendar view and administrative real-time daily board (`/attendance/board`).

### 6. Leave Management & Policy Engine

- Rule-based leave request validator (`validateLeaveRequest`): verifies start date constraints (`startDate >= today`), holiday and weekend exclusions, overlap prevention, and remaining quota balances.
- Self-service cancellation for pending or future-approved leave with automatic balance restoration.
- Two-tier approval workflow (HR approval with mandatory comments on rejections; approvers cannot approve their own requests).

### 7. Attendance Corrections Workflow

- Employee-submitted dispute requests for past missing check-ins/check-outs.
- One pending correction per employee per date limit to prevent spam.
- HR approval automatically upserts the underlying attendance record and recalculates late status and worked hours.

### 8. Payroll Engine & PDF Payslips

- Automated monthly salary calculation:
  - **Earnings:** Basic (100%), HRA (40%), Medical Allowance (10%) = Gross Salary (150% of Basic).
  - **Deductions:** Annualized bracketed income tax proration and configurable attendance late penalties.
  - **Net Pay:** Computed net salary after statutory deductions.
- Server-side streaming **PDF Payslips** generated via `pdfkit` (`GET /api/v1/payroll/:employeeId/month/:month/pdf`).

### 9. Real-Time Dashboards & AI Smart Assistant

- **HR Dashboard (`GET /api/v1/analytics/hr`):** Live employee headcount, today's attendance status breakdown (`present`, `absent`, `late`, `onLeave`), and pending requests.
- **Employee Dashboard (`GET /api/v1/analytics/me`):** Monthly attendance tallies, real-time leave balances (`annual`, `sick`, `casual`), and pending dispute counts.
- **AI Chat & Smart Leave Assistant (`POST /api/v1/ai/chat`):**
  - Natural language interface powered by OpenAI-compatible endpoints (Groq, OpenAI, or Gemini).
  - Native tool calling: executes `check_my_leave_balance` and `apply_for_leave` on behalf of the user.
  - Enforces a 15-second network deadline (`AbortSignal.timeout(15000)`), strict rate limiting (20 requests/hour), and persists conversations in `AILogModel`.

---

## 📖 API Documentation & Contract Verification

For a complete specification of every endpoint, HTTP method, required RBAC permissions, and Zod/TypeScript schemas, refer to:
👉 **[`docs/API_ACTUAL.md`](docs/API_ACTUAL.md)**

---

## 💻 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (v1.2+) installed on your system.
- MongoDB instance (MongoDB Atlas connection string or local MongoDB).
- Node.js (v24.x recommended).

### 1. Installation

Clone the repository and install all dependencies for both root, server, and client:

```bash
# Clone repository
git clone https://github.com/YourOrg/Saylani-HCM-Lite.git
cd Saylani-HCM-Lite

# Install server dependencies
cd server
bun install

# Install client dependencies
cd ../client
bun install
```

### 2. Environment Configuration

Copy the example environment files and configure your credentials:

```bash
# In the server directory:
cp .env.example .env.local
```

Configure the following variables in `server/.env.local`:

```env
PORT=2002
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/hcm_lite?retryWrites=true&w=majority
JWT_SECRET=super_secret_jwt_key_at_least_32_characters_long

# AI Assistant (Groq, OpenAI, or Gemini OpenAI-compatible API key)
AI_API_KEY=your_api_key_here
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-3.5-turbo

# Client CORS
CLIENT_ORIGIN=https://hcm-lite-dev.vercel.app,http://localhost:3003
```

### 3. First-Run Setup & Admin Account Provisioning

When connecting to a fresh MongoDB database, the application automatically recognizes that no administrator exists:

1. Start the server:
   ```bash
   bun dev:server # or "cd server && bun dev"
   ```
2. Run the first-time setup via API or frontend:
   - **Endpoint:** `POST https://hcm-lite-dev.vercel.app/api/v1/setup` (or `POST http://localhost:2002/api/v1/setup` locally)
   - **Payload:**
     ```json
     {
       "companyName": "Saylani Welfare International",
       "adminName": "System Administrator",
       "adminEmail": "admin@saylani.org",
       "adminPassword": "YourStrongPassword123"
     }
     ```
3. Once completed, the Admin account is initialized, standard leave types are seeded, and company settings are created. You can immediately log in via `POST /api/v1/auth/login`.

_(Alternatively, define `ADMIN_EMAIL` and `ADMIN_PASSWORD` in your `.env.local` to trigger automatic cold-boot provisioning on first start)._

---

## 🧪 Running Tests & Quality Verification

Saylani HCM Lite maintains 100% test pass rates across all business logic and API routes:

```bash
# Run server test suite (172 tests across 10 suites)
cd server
bun test

# Run frontend TypeScript type checking
cd ../client
bun run typecheck

# Build frontend production bundle
bun run build
```

---

## 🚢 Deployment Ready

- **Backend Start Script:** `npm start` / `bun start` (`node server.mjs`) pre-configured for Render, Railway, or Fly.io with `trust proxy` enabled.
- **Frontend Build Script:** `npm run build` (`tsc --noEmit && vite build`) producing static output in `client/dist`.

---

## 📄 License

ISC © 2026 Saylani Welfare International. Built with pride for the Saylani Hackathon.
