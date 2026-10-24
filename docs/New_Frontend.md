# HCM Lite Frontend Spec

## Conventions
- **API Base:** `VITE_API_URL` (default `http://localhost:2002/api/v1`). 
- **Auth:** `Authorization: Bearer <token>`. Store token in `localStorage` under `hcm_token`.
- **Error Shape:** `{ error: { code, message, fields? } }`. Show message in a toast; map fields to form errors. 401 clears token and redirects to `/login`.
- **Shared Components:** `Loading`, `EmptyState`, `ErrorState`, `ConfirmDialog`, `StatCard`, `DataTable` (server paging), `StatusBadge` (attendance, leave, payroll statuses), `AiBadge`, `PageHeader`, `FormField`.
- **Layout:** Sidebar by role; drawer under 768px; top bar with notification bell, theme toggle, user menu. Dark mode via Tailwind `dark` class.

## Slices (Build Order)
* **F0:** Foundation (Axios instance, AuthContext, role guards, layout shell, shared components).
* **F1:** Setup wizard (`/setup`), login (`/login`), change password (`/change-password`).
* **F2:** Organization tabs (Admin) & Employees list/create/profile (HR).
* **F3:** Attendance check-in widget, month calendar, HR board.
* **F4:** Leave apply, balances, and HR approval inbox.
* **F5:** Payroll runs, draft review, payslip PDF download.
* **F6:** Dashboards (Admin, HR, Employee) with Recharts.
* **F7:** AI drawer (`/ai/chat`) and smart leave text box (`/ai/smart-leave`).
* **F8:** Announcements, notifications, audit log, profile edit.