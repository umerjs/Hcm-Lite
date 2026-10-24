# HCM Lite — Authoritative Backend API Specification (`API_ACTUAL.md`)

This document is the authoritative, verified reference for all backend endpoints implemented across Slices A0 through B5. It documents every endpoint, required RBAC role, query parameters, request schemas (Zod/TypeScript), success responses, and known error codes.

---

## 1. Global Conventions & Protocols

- **Canonical API Base URL:** `/api/v1` _(all routes are mounted with this prefix)_
- **Authentication:** `Authorization: Bearer <jwt_token>` (tokens issued via `/api/v1/auth/login` or refreshed via `/api/v1/auth/change-password`).
- **RBAC Roles:** `admin`, `hr`, `employee`, `system`.
- **Standard Error Response:**
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR | UNAUTHENTICATED | FORBIDDEN | NOT_FOUND | CONFLICT | UNPROCESSABLE_ENTITY | RATE_LIMIT_EXCEEDED",
      "message": "Human-readable description of error",
      "fields": { "field_name": "Specific error message" }
    }
  }
  ```

---

## 2. Setup & First-Run Initialization

### `GET /api/v1/setup/status`

- **Role:** Public (No authentication required)
- **Description:** Checks whether initial administrator setup is required.
- **Response `200 OK`:**
  ```json
  {
    "needsSetup": false,
    "isSetup": true
  }
  ```

### `POST /api/v1/setup`

- **Role:** Public (Active only when 0 admin accounts exist)
- **Description:** First-run company and administrator onboarding. Creates Admin User, Singleton Settings doc, and standard leave types (`annual: 14`, `sick: 8`, `casual: 10`, `unpaid: null`). Fully rolls back if any step fails.
- **Request Body (Zod validated):**
  ```json
  {
    "companyName": "Acme Corp",
    "adminName": "Super Admin",
    "adminEmail": "admin@acme.com",
    "adminPassword": "password123"
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "message": "Setup completed successfully",
    "admin": {
      "id": "671a11112222333344440001",
      "email": "admin@acme.com",
      "role": "admin"
    },
    "settings": { ... }
  }
  ```
- **Errors:** `400 VALIDATION_ERROR`, `409 ALREADY_SETUP`.

---

## 3. Authentication & Password Management

### `POST /api/v1/auth/login`

- **Role:** Public (Rate limit: 10 attempts / 15 minutes per IP)
- **Request Body:**
  ```json
  {
    "email": "user@company.com",
    "password": "secretpassword"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "671a11112222333344440001",
      "email": "user@company.com",
      "role": "employee",
      "employeeId": "671a11112222333344440002",
      "mustChangePassword": true,
      "firstname": "John",
      "lastname": "Doe"
    }
  }
  ```
- **Errors:** `400 VALIDATION_ERROR`, `401 INVALID_CREDENTIALS`, `403 ACCOUNT_INACTIVE`, `429 TOO_MANY_REQUESTS`.

### `POST /api/v1/auth/change-password`

- **Role:** Authenticated (any user, including those with `mustChangePassword: true`)
- **Description:** Changes current password, unsets `mustChangePassword`, and issues a new JWT token.
- **Request Body:**
  ```json
  {
    "currentPassword": "oldTempPassword123",
    "newPassword": "newSecurePassword456"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "message": "Password changed successfully",
    "token": "eyJhbGciOi...",
    "user": { ... }
  }
  ```
- **Errors:** `400 VALIDATION_ERROR`, `401 INVALID_CREDENTIALS`.

### `PUT /api/v1/password`

- **Role:** Authenticated (any user)
- **Request Body:**
  ```json
  {
    "currentPassword": "currentPassword123",
    "newPassword": "newPassword123"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "message": "Password updated successfully"
  }
  ```

---

## 4. User Profile Management

### `GET /api/v1/profile`

- **Role:** Authenticated (returns own user record)
- **Response `200 OK`:**
  ```json
  {
    "data": {
      "_id": "671a...",
      "email": "user@company.com",
      "role": "employee",
      "firstname": "John",
      "lastname": "Doe",
      "profileimg": "https://..."
    }
  }
  ```

### `GET /api/v1/profile/:userId`

- **Role:** Authenticated (retrieves profile by ID)
- **Response `200 OK`:** `{ "data": { ... } }`

### `PUT /api/v1/profile`

- **Role:** Authenticated (updates own firstname, lastname, or username)
- **Request Body:**
  ```json
  {
    "firstname": "Jane",
    "lastname": "Smith",
    "username": "janesmith"
  }
  ```
- **Response `200 OK`:** `{ "message": "Profile updated", "data": { ... } }`
- **Errors:** `400 VALIDATION_ERROR`, `409 CONFLICT`.

### `PUT /api/v1/profile/avatar`

- **Role:** Authenticated
- **Content-Type:** `multipart/form-data` with key `avatar`
- **Response `200 OK`:** `{ "message": "Avatar updated", "data": { ... } }`

### `DELETE /api/v1/profile`

- **Role:** Authenticated (deletes own account)
- **Response `200 OK`:** `{ "message": "Profile deleted" }`

---

## 5. Company Settings

### `GET /api/v1/settings`

- **Role:** `admin`, `hr`
- **Response `200 OK`:**
  ```json
  {
    "settings": {
      "_id": "company_settings",
      "companyName": "Acme Corp",
      "timezone": "Asia/Karachi",
      "officeStart": "09:00",
      "graceMinutes": 15,
      "halfDayHours": 4,
      "weekend": ["Sat", "Sun"],
      "officeLat": 24.8607,
      "officeLng": 67.0011,
      "radiusMeters": 500,
      "latePenaltyEnabled": false
    }
  }
  ```

### `PUT /api/v1/settings`

- **Role:** `admin` only (Audited write)
- **Request Body (Zod validated):**
  ```json
  {
    "companyName": "Acme Corp Global",
    "timezone": "Asia/Karachi",
    "officeStart": "09:30",
    "graceMinutes": 15,
    "halfDayHours": 4,
    "weekend": ["Sat", "Sun"],
    "officeLat": 24.8607,
    "officeLng": 67.0011,
    "radiusMeters": 300,
    "latePenaltyEnabled": true
  }
  ```
- **Response `200 OK`:** `{ "message": "Company settings updated successfully", "settings": { ... } }`
- **Errors:** `400 VALIDATION_ERROR`, `403 FORBIDDEN`.

---

## 6. Organization Structure (Departments & Designations)

### `GET /api/v1/departments`

- **Role:** `admin`, `hr`
- **Response `200 OK`:** `{ "data": [ { "_id": "...", "name": "Engineering" } ] }`

### `POST /api/v1/departments`

- **Role:** `admin` (Audited)
- **Request Body:** `{ "name": "Human Resources" }`
- **Response `201 Created`:** `{ "message": "Department created", "data": { ... } }`

### `PATCH /api/v1/departments/:id`

- **Role:** `admin` (Audited)
- **Request Body:** `{ "name": "People Operations" }`
- **Response `200 OK`:** `{ "message": "Department updated", "data": { ... } }`

### `DELETE /api/v1/departments/:id`

- **Role:** `admin` (Audited)
- **Response `200 OK`:** `{ "message": "Department deleted" }`
- **Errors:** `409 CONFLICT` (if employees or designations are assigned to this department).

### `GET /api/v1/designations`

- **Role:** `admin`, `hr` (Optional query `?departmentId=...`)
- **Response `200 OK`:** `{ "data": [ { "_id": "...", "name": "Senior Software Engineer", "departmentId": "..." } ] }`

### `POST /api/v1/designations`

- **Role:** `admin` (Audited)
- **Request Body:** `{ "name": "Tech Lead", "departmentId": "..." }`
- **Response `201 Created`:** `{ "message": "Designation created", "data": { ... } }`

### `PATCH /api/v1/designations/:id`

- **Role:** `admin` (Audited)
- **Request Body:** `{ "name": "Principal Engineer", "departmentId": "..." }`
- **Response `200 OK`:** `{ "message": "Designation updated", "data": { ... } }`

### `DELETE /api/v1/designations/:id`

- **Role:** `admin` (Audited)
- **Response `200 OK`:** `{ "message": "Designation deleted" }`
- **Errors:** `409 CONFLICT` (if assigned to employees).

---

## 7. Holidays & Calendar

### `GET /api/v1/holidays`

- **Role:** `admin`, `hr` (Optional `?year=YYYY`)
- **Response `200 OK`:** `{ "data": [ { "_id": "...", "date": "2026-03-23", "name": "Pakistan Day" } ] }`

### `POST /api/v1/holidays`

- **Role:** `admin` (Audited)
- **Request Body:** `{ "date": "2026-05-01", "name": "Labour Day" }`
- **Response `201 Created`:** `{ "message": "Holiday created", "data": { ... } }`
- **Errors:** `409 CONFLICT` (duplicate date).

### `PATCH /api/v1/holidays/:id`

- **Role:** `admin` (Audited)
- **Request Body:** `{ "name": "International Workers' Day" }`
- **Response `200 OK`:** `{ "message": "Holiday updated", "data": { ... } }`

### `DELETE /api/v1/holidays/:id`

- **Role:** `admin` (Audited)
- **Response `200 OK`:** `{ "message": "Holiday deleted" }`

---

## 8. Leave Types & Quotas

### `GET /api/v1/leave-types`

- **Role:** `admin`, `hr`, `employee`
- **Response `200 OK`:**
  ```json
  {
    "data": [
      { "key": "annual", "label": "Annual Leave", "yearlyQuota": 14 },
      { "key": "sick", "label": "Sick Leave", "yearlyQuota": 8 },
      { "key": "casual", "label": "Casual Leave", "yearlyQuota": 10 },
      { "key": "unpaid", "label": "Unpaid Leave", "yearlyQuota": null }
    ]
  }
  ```

### `PUT /api/v1/leave-types/:key`

- **Role:** `admin` only (Audited)
- **Request Body:** `{ "yearlyQuota": 18 }`
- **Response `200 OK`:** `{ "message": "Leave type quota updated", "data": { ... } }`

---

## 9. Users Administration (HR Accounts & Credentials)

### `POST /api/v1/users/hr`

- **Role:** `admin` only (Audited)
- **Description:** Generates a random 12-character temporary password returned once in the response.
- **Request Body:**
  ```json
  {
    "firstname": "Sarah",
    "lastname": "Connor",
    "email": "sarah.hr@company.com"
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "message": "HR account created successfully",
    "user": {
      "id": "671e...",
      "email": "sarah.hr@company.com",
      "role": "hr",
      "mustChangePassword": true
    },
    "tempPassword": "aB3$9kL!mP2x"
  }
  ```

### `GET /api/v1/users`

- **Role:** `admin` (Optional query `?role=hr | employee | admin`)
- **Response `200 OK`:** `{ "data": [ ... ] }`

### `PATCH /api/v1/users/:id/deactivate`

- **Role:** `admin` (Audited, cannot deactivate self)
- **Response `200 OK`:** `{ "message": "User account deactivated", "user": { ... } }`
- **Errors:** `400 CANNOT_DEACTIVATE_SELF`.

### `POST /api/v1/users/:id/reset-password`

- **Role:** `admin` (Audited)
- **Response `200 OK`:** `{ "message": "Password reset successfully", "tempPassword": "..." }`

---

## 10. Employee Directory & Profiles

### `PATCH /api/v1/me/profile`

- **Role:** Authenticated Employee
- **Description:** Strictly allows updating personal contact details only (`phone` and `address`). Any extraneous fields return `400 VALIDATION_ERROR`.
- **Request Body:**
  ```json
  {
    "phone": "+923001234567",
    "address": "Apartment 4B, Clifton, Karachi"
  }
  ```
- **Response `200 OK`:** `{ "message": "Profile updated successfully", "employee": { ... } }`

### `POST /api/v1/employees`

- **Role:** `hr` only (Audited)
- **Description:** Atomic employee creation. Creates `Employee` with auto-incremented code `EMP-xxxx` and matching `User` account with temporary password.
- **Request Body:**
  ```json
  {
    "name": "Ali Khan",
    "email": "ali.khan@company.com",
    "phone": "+923001112233",
    "address": "Gulshan, Karachi",
    "gender": "male",
    "departmentId": "671b...",
    "designationId": "671c...",
    "joinDate": "2026-10-01",
    "basicSalary": 100000,
    "status": "probation"
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "message": "Employee registered successfully",
    "employee": {
      "_id": "...",
      "code": "EMP-0001",
      "name": "Ali Khan",
      "email": "ali.khan@company.com",
      "basicSalary": 100000,
      "status": "probation"
    },
    "tempPassword": "xK8#1mQ!zP9v"
  }
  ```

### `GET /api/v1/employees`

- **Role:** `admin`, `hr`
- **Query Parameters:** `?q=search&departmentId=...&status=active|probation|exited&page=1&pageSize=20`
- **Response `200 OK`:**
  ```json
  {
    "data": [ ... ],
    "pagination": { "total": 45, "page": 1, "pageSize": 20, "totalPages": 3 }
  }
  ```

### `GET /api/v1/employees/:id`

- **Role:** `admin`, `hr` (any employee); `employee` (strictly only their own employee ID, otherwise `403 FORBIDDEN`).
- **Response `200 OK`:** `{ "data": { ... } }`

### `PATCH /api/v1/employees/:id`

- **Role:** `hr` (Audited). Setting status to `exited` automatically sets `exitDate` and deactivates the user login.
- **Request Body:** `{ "status": "exited", "exitDate": "2026-10-31" }`
- **Response `200 OK`:** `{ "message": "Employee updated successfully", "data": { ... } }`

### `PUT /api/v1/employees/:id/salary`

- **Role:** `hr` (Audited with previous and new salary values)
- **Request Body:** `{ "basicSalary": 125000 }`
- **Response `200 OK`:** `{ "message": "Salary updated successfully", "employee": { ... } }`

---

## 11. Attendance Management

### `POST /api/v1/attendance/check-in`

- **Role:** Authenticated Employee (`req.user.employeeId` required)
- **Response `201 Created`:**
  ```json
  {
    "message": "Checked in successfully",
    "data": {
      "employeeId": "...",
      "date": "2026-10-25",
      "checkIn": "2026-10-25T04:15:00.000Z",
      "checkOut": null,
      "isLate": false,
      "status": "present"
    }
  }
  ```
- **Errors:** `403 NO_EMPLOYEE_PROFILE`, `409 ALREADY_CHECKED_IN`.

### `POST /api/v1/attendance/check-out`

- **Role:** Authenticated Employee
- **Response `200 OK`:**
  ```json
  {
    "message": "Checked out successfully",
    "data": {
      "employeeId": "...",
      "date": "2026-10-25",
      "checkIn": "2026-10-25T04:15:00.000Z",
      "checkOut": "2026-10-25T13:30:00.000Z",
      "workedHours": 8.5,
      "status": "present"
    }
  }
  ```
- **Errors:** `400 NOT_CHECKED_IN`, `409 ALREADY_CHECKED_OUT`.

### `GET /api/v1/attendance/me`

- **Role:** Authenticated Employee
- **Query Parameter:** `?month=YYYY-MM` (defaults to current month)
- **Response `200 OK`:** `{ "data": [ ...attendanceRecords ] }`

### `GET /api/v1/attendance/board`

- **Role:** `admin`, `hr`
- **Query Parameters:** `?date=YYYY-MM-DD&departmentId=...`
- **Response `200 OK`:** `{ "data": [ ...dailyRecordsAcrossEmployees ] }`

### `GET /api/v1/attendance/employee/:id`

- **Role:** `admin`, `hr`
- **Query Parameter:** `?month=YYYY-MM`
- **Response `200 OK`:** `{ "data": [ ...records ] }`

---

## 12. Leave Requests & Balances

### `POST /api/v1/leave`

- **Role:** Authenticated Employee
- **Validation:** Validated against pure rule `validateLeaveRequest` (`startDate >= today`, no overlaps, working days > 0, quota balance sufficiency).
- **Request Body:**
  ```json
  {
    "type": "casual",
    "startDate": "2026-11-05",
    "endDate": "2026-11-06",
    "reason": "Personal family matters"
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "message": "Leave application submitted",
    "data": {
      "_id": "...",
      "type": "casual",
      "startDate": "2026-11-05",
      "endDate": "2026-11-06",
      "days": 2,
      "status": "pending",
      "reason": "Personal family matters"
    }
  }
  ```
- **Errors:** `422 LEAVE_START_DATE_PAST`, `422 LEAVE_OVERLAP`, `422 ZERO_WORKING_DAYS`, `422 INSUFFICIENT_LEAVE_BALANCE`.

### `GET /api/v1/leave/balance`

- **Role:** Authenticated Employee
- **Query Parameter:** `?year=YYYY` (defaults to current year)
- **Response `200 OK`:**
  ```json
  {
    "data": {
      "annual": { "quota": 14, "approved": 2, "pending": 0, "balance": 12 },
      "sick": { "quota": 8, "approved": 1, "pending": 0, "balance": 7 },
      "casual": { "quota": 10, "approved": 3, "pending": 2, "balance": 7 },
      "unpaid": { "quota": null, "approved": 0, "pending": 0, "balance": null }
    }
  }
  ```

### `GET /api/v1/leave`

- **Role:** Authenticated (Employees view only own requests; Admin and HR view all requests with query filters `?status=pending|approved|rejected|cancelled&type=...&employeeId=...`)
- **Response `200 OK`:** `{ "data": [ ...leaveRequests ] }`

### `GET /api/v1/leave/:id`

- **Role:** Authenticated (Employees can only view their own; HR and Admin can view any)
- **Response `200 OK`:** `{ "data": { ... } }`

### `PATCH /api/v1/leave/:id/cancel`

- **Role:** Authenticated Employee
- **Description:** Cancels own pending request or approved future request. Restores quota balance.
- **Response `200 OK`:** `{ "message": "Leave request cancelled", "data": { ... } }`
- **Errors:** `403 FORBIDDEN`, `422 CANNOT_CANCEL`.

### `PATCH /api/v1/leave/:id/decision`

- **Role:** `hr` only (Admin is read-only). Approver cannot approve their own leave request. Comment required on rejection.
- **Request Body:**
  ```json
  {
    "status": "approved",
    "comment": "Approved as scheduled"
  }
  ```
- **Response `200 OK`:** `{ "message": "Leave request approved", "data": { ... } }`
- **Errors:** `403 CANNOT_APPROVE_OWN_LEAVE`, `422 COMMENT_REQUIRED_ON_REJECT`.

---

## 13. Attendance Corrections

### `POST /api/v1/corrections`

- **Role:** Authenticated Employee
- **Description:** Submit attendance correction for past dates. Only 1 pending correction per employee per date allowed.
- **Request Body:**
  ```json
  {
    "date": "2026-10-22",
    "requestedCheckIn": "2026-10-22T04:00:00.000Z",
    "requestedCheckOut": "2026-10-22T13:00:00.000Z",
    "reason": "Biometric terminal was offline"
  }
  ```
- **Response `201 Created`:** `{ "message": "Correction request submitted", "data": { ... } }`
- **Errors:** `409 PENDING_CORRECTION_EXISTS`, `422 FUTURE_DATE_NOT_ALLOWED`.

### `GET /api/v1/corrections`

- **Role:** Authenticated (Employee views own; HR/Admin views all)
- **Response `200 OK`:** `{ "data": [ ... ] }`

### `PATCH /api/v1/corrections/:id`

- **Role:** `hr` only (Audited)
- **Description:** Approves or rejects correction. If approved, automatically upserts attendance record, computing worked hours, late status, and attendance status.
- **Request Body:** `{ "status": "approved", "comment": "Verified with team lead" }`
- **Response `200 OK`:** `{ "message": "Correction request approved", "data": { ... } }`

---

## 14. Payroll & PDF Payslips

### `GET /api/v1/payroll/me`

- **Role:** Authenticated Employee
- **Query Parameter:** `?month=YYYY-MM` (defaults to current month)
- **Response `200 OK`:**
  ```json
  {
    "month": "2026-10",
    "data": {
      "employee": { "id": "...", "name": "Ali Khan", "code": "EMP-0001", "basicSalary": 100000 },
      "earnings": {
        "basic": 100000,
        "hra": 40000,
        "medical": 10000,
        "gross": 150000
      },
      "deductions": {
        "tax": 12500,
        "penalty": 0,
        "totalDeductions": 12500
      },
      "netPay": 137500,
      "breakdown": { "workingDays": 22, "presentDays": 22, "lateCount": 0, "unpaidLeaveDays": 0 }
    }
  }
  ```

### `GET /api/v1/payroll`

- **Role:** `admin`, `hr`
- **Query Parameter:** `?month=YYYY-MM`
- **Response `200 OK`:** `{ "month": "2026-10", "data": [ ...employeePayrollSummaries ] }`

### `GET /api/v1/payroll/:employeeId/month/:month/pdf`

- **Role:** `admin`, `hr` (any employee); `employee` (strictly only their own employee ID, otherwise `403 FORBIDDEN`).
- **Response:** Binary PDF stream (`Content-Type: application/pdf; filename="payslip-EMP-0001-2026-10.pdf"`).

---

## 15. Dashboard Analytics & Metrics

### `GET /api/v1/analytics/hr`

- **Role:** `admin`, `hr`
- **Query Parameter:** `?date=YYYY-MM-DD` (defaults to current date)
- **Response `200 OK` (`HrDashboardResponse`):**
  ```json
  {
    "totalEmployees": 50,
    "activeEmployees": 48,
    "todayAttendance": {
      "present": 42,
      "absent": 3,
      "late": 4,
      "onLeave": 3
    },
    "pendingLeaves": 5,
    "pendingCorrections": 2
  }
  ```

### `GET /api/v1/analytics/me`

- **Role:** Authenticated Employee
- **Query Parameter:** `?month=YYYY-MM` (defaults to current month)
- **Response `200 OK` (`EmployeeDashboardResponse`):**
  ```json
  {
    "currentMonthAttendance": {
      "present": 18,
      "absent": 0,
      "late": 1
    },
    "leaveBalances": {
      "annual": 12,
      "sick": 8,
      "casual": 7
    },
    "pendingRequests": 2
  }
  ```

---

## 16. Audit Logs

### `GET /api/v1/audit`

- **Role:** `admin` only
- **Query Parameters:** `?action=...&actorId=...&entity=...&page=1&pageSize=20`
- **Response `200 OK`:**
  ```json
  {
    "data": [
      {
        "_id": "...",
        "actor": { "_id": "...", "email": "admin@company.com", "role": "admin" },
        "actorRole": "admin",
        "action": "SETTINGS_UPDATE",
        "entity": "settings",
        "entityId": "company_settings",
        "before": { "officeStart": "09:00" },
        "after": { "officeStart": "09:30" },
        "createdAt": "2026-10-25T01:30:00.000Z"
      }
    ],
    "pagination": { "total": 120, "page": 1, "pageSize": 20, "totalPages": 6 }
  }
  ```

---

## 17. Communications & Announcements

### `GET /api/v1/announcements`

- **Role:** Authenticated (all roles)
- **Response `200 OK`:** `{ "data": [ { "_id": "...", "title": "Town Hall", "body": "...", "createdAt": "..." } ] }`

### `POST /api/v1/announcements`

- **Role:** `admin`, `hr` (Audited; fans out in-app notifications to matching targets)
- **Request Body:**
  ```json
  {
    "title": "Annual Company Dinner",
    "body": "The annual dinner will take place on Friday, Dec 15th.",
    "targetRole": "all"
  }
  ```
- **Response `201 Created`:** `{ "message": "Announcement posted successfully", "data": { ... } }`

### `GET /api/v1/notifications`

- **Role:** Authenticated user
- **Query Parameter:** `?unread=true`
- **Response `200 OK`:** `{ "data": [ { "_id": "...", "text": "...", "readAt": null, "createdAt": "..." } ] }`

### `PATCH /api/v1/notifications/:id/read`

- **Role:** Authenticated user (marks specific notification as read)
- **Response `200 OK`:** `{ "message": "Notification marked as read", "data": { ... } }`

### `PATCH /api/v1/notifications/read-all`

- **Role:** Authenticated user (marks all unread notifications as read)
- **Response `200 OK`:** `{ "message": "All notifications marked as read" }`

---

## 18. AI Assistant & Smart Leave

### `POST /api/v1/ai/chat`

- **Role:** Authenticated (all roles)
- **Rate Limit:** Strict limit of 20 requests per hour per user/IP. Exceeding throws `429 Too Many Requests`.
- **Network Timeout:** 15-second network abort (`AbortSignal.timeout(15000)`). Returns `504 AI_GATEWAY_TIMEOUT` if backend LLM exceeds timeout.
- **Smart Tools Executed:**
  - `check_my_leave_balance`: Automatically checks current quota and remaining days for the authenticated employee.
  - `apply_for_leave`: Automatically submits a leave request for `type`, `startDate`, `endDate`, and `reason`.
- **Request Body (`AiChatRequest`):**
  ```json
  {
    "message": "Can you check how many annual leaves I have left, and apply for casual leave on 2026-11-10 for personal work?"
  }
  ```
- **Response `200 OK` (`AiChatResponse`):**
  ```json
  {
    "response": "You currently have 12 annual leaves remaining. I have submitted your casual leave request for 2026-11-10.",
    "toolsUsed": ["check_my_leave_balance", "apply_for_leave"],
    "tokens": 128,
    "logId": "671f..."
  }
  ```
- **Errors:** `400 VALIDATION_ERROR`, `401 UNAUTHENTICATED`, `429 TOO_MANY_REQUESTS`, `504 AI_GATEWAY_TIMEOUT`.
