# Stubs Registry — Owned by Backend A

The following service stubs and models are tracked to allow foreign-key referencing, population, and default fallbacks without blocking parallel development.

---

## Graduated to Real Implementations (Slice A1, A2, A3 & A4)

- **`SettingsModel`** (Slice A1): Fully implemented single-document model ([`server/models/settings/index.mjs`](file:///c:/Users/User/Documents/Github/Mern-Template/server/models/settings/index.mjs)) with `GET /api/v1/settings` (Admin, HR) and `PUT /api/v1/settings` (Admin write only) with audit logging.
- **`AuditLogModel` & `audit` service** (Slice A1): Real append-only immutable audit log ([`server/models/audit/index.mjs`](file:///c:/Users/User/Documents/Github/Mern-Template/server/models/audit/index.mjs) and [`server/services/audit.service.mjs`](file:///c:/Users/User/Documents/Github/Mern-Template/server/services/audit.service.mjs)).
- **`HolidayModel` & `holiday.service.mjs`** (Slice A2): Graduated from `holiday.stub.mjs`. Fully implemented model ([`server/models/holiday/index.mjs`](file:///c:/Users/User/Documents/Github/Mern-Template/server/models/holiday/index.mjs)) and service ([`server/services/holiday.service.mjs`](file:///c:/Users/User/Documents/Github/Mern-Template/server/services/holiday.service.mjs)) with CRUD routes, date range filtering, and audit logging.
- **`LeaveTypeModel` & `leavetype.service.mjs`** (Slice A2): Graduated from `leavetype.stub.mjs`. Fully implemented model and service ([`server/services/leavetype.service.mjs`](file:///c:/Users/User/Documents/Github/Mern-Template/server/services/leavetype.service.mjs)) with `GET /api/v1/leave-types` and `PUT /api/v1/leave-types/:key` with audit logging.
- **`EmployeeModel` & `employee.service.mjs`** (Slice A3): Graduated from stub. Fully implemented model ([`server/models/employee/index.mjs`](file:///c:/Users/User/Documents/Github/Mern-Template/server/models/employee/index.mjs)) and service ([`server/services/employee.service.mjs`](file:///c:/Users/User/Documents/Github/Mern-Template/server/services/employee.service.mjs)) with atomic EMP-xxxx code generation, HR registration with rollback, directory search & pagination, scoped profile reads, HR salary updates, and strict employee profile patching.
- **`NotificationModel`, `AnnouncementModel` & `notification.service.mjs`** (Slice A4): Graduated from `notification.stub.mjs`. Fully implemented models ([`server/models/notification/index.mjs`](file:///c:/Users/User/Documents/Github/Mern-Template/server/models/notification/index.mjs)) and service ([`server/services/notification.service.mjs`](file:///c:/Users/User/Documents/Github/Mern-Template/server/services/notification.service.mjs)) with targeted in-app notifications, global and role-based announcements with notification fanout, and read status management.

---

## Active Stubs

_None — all stubs have been completely graduated to production implementations._
