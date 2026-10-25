# Multi-Tenant SaaS Migration Plan

## Phase 1: Foundation (Models & Types)

1. **New Model:** Create `server/models/company/index.mjs` (`name`, `createdAt`, `isActive`).
2. **Schema Updates:** Add `companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true }` to _every_ existing domain model (`User`, `Employee`, `Department`, `Designation`, `LeaveType`, `Holiday`, `Attendance`, `LeaveRequest`, `Correction`, `PayrollRun`, `Payslip`, `Announcement`, `Notification`, `AuditLog`, `AILog`).
3. **Indexes:** Update all unique indexes to be compound with `companyId`. Example: Employee code index changes from `{ code: 1 }` to `{ companyId: 1, code: 1 }`.
4. **Types:** Update `client/src/types/api.ts` to reflect the new registration payload and `Company` entity.

## Phase 2: Auth & Registration (The Gateway)

1. **Public Registration:** Convert `POST /api/v1/setup` to a public `POST /api/v1/auth/register`. It must create a `Company` document, the default `LeaveTypes` linked to that `companyId`, the `Settings` linked to that `companyId`, and the first `Admin` user linked to that `companyId`.
2. **JWT Payload:** Update `server/services/auth.service.mjs`. When generating the JWT, inject the `companyId` into the token payload alongside `id` and `role`.
3. **Middleware:** Update the `requireAuth` middleware to attach `req.user.companyId`. If `companyId` is missing, throw 401.

## Phase 3: Service Layer Scoping (The Big Sweep)

1. **Reads:** Sweep every `GET` route and `find()`/`findOne()`/`countDocuments()`/`aggregate()` call in `server/services/`. Inject `{ companyId: actor.companyId }` into every single query filter.
2. **Writes:** Update every `create()` and `insertMany()` call to automatically append `companyId: actor.companyId` to the payload before saving.
3. **Lookups:** Ensure `getEmployeeById` and similar lookup functions verify the target document's `companyId` matches the actor's `companyId` (throw 404 Not Found if it doesn't match, not 403, to prevent enumeration).

## Phase 4: AI & UI Integration

1. **AI Tool Gating:** Update all tool functions in `ai.service.mjs` (e.g., `get_headcount`, `search_employees`) to strictly enforce `companyId` in their DB queries. The AI must never cross tenant boundaries.
2. **Frontend Wiring:** Update the frontend `/setup` route to `/register`. The frontend does not need to send `companyId` in API requests; the backend infers it exclusively from the JWT Bearer token.
