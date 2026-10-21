# AGENTS.md — Secure, Fast App Development Playbook

## Mission

Deliver the smallest complete, polished, secure, and maintainable application that satisfies the task. Move quickly by understanding the existing code first, reusing established patterns, implementing the highest-value workflow end to end, and verifying changes instead of guessing.

**Order of priorities:**

1. Meet explicit task and acceptance requirements.

1. Preserve a runnable, coherent application and existing user work.

1. Implement correct end-to-end behavior and persistent data handling.

1. Protect users, APIs, and data; validate all untrusted input.

1. Match the supplied design and support required screen sizes/accessibility.

1. Verify the result and clearly report remaining limitations.

A feature is not complete merely because it renders. It is complete when its important success, empty, invalid, loading, and failure states behave correctly.

## 1. Operating Rules

- Read this file and inspect the repository before changing code.

- Treat the task, existing source, tests, and runtime behavior as authoritative. Do not invent capabilities or claim unverified success.

- Preserve the current architecture, dependencies, naming, conventions, and working behavior unless a change is necessary and justified.

- Prefer the smallest end-to-end implementation over broad rewrites, speculative abstractions, or unrequested features.

- Keep the app runnable; make focused changes and verify each meaningful slice.

- Reuse existing components, validation utilities, API clients, middleware, and data-access patterns where appropriate.

- Never weaken validation, tests, access controls, or error handling merely to make a check pass.

- Do not delete files, discard user changes, or change deployment/configuration behavior without a clear task-related reason.

- Do not expose secrets, credentials, private user data, or internal stack traces in client code, API responses, logs, screenshots, or commits.

- When a requirement is ambiguous, make a reasonable reversible choice and proceed. Ask only when different interpretations would materially alter the result or risk data/security.

## 2. Fast, Low-Risk Workflow

### Before editing

1. Read `package.json`, lockfile, scripts, and relevant project instructions.

1. Inspect the file tree and the exact pages, components, APIs, models, and tests involved.

1. Check `git status` and preserve existing edits.

1. Identify framework, package manager, runtime, data store, authentication, styling system, and current conventions; do not assume them.

1. Translate the request into a short checklist of user flows, UI states, API operations, data changes, security concerns, and acceptance criteria.

1. Run or inspect the app if practical; note existing failures before attributing them to new changes.

### During implementation

- Trace a feature through its full path: UI → request → route/middleware → validation/authorization → service/data layer → response → UI state.

- Work in small, coherent changes. Prefer editing the existing implementation over building a parallel one.

- Keep business rules in the appropriate server/domain layer, not only in React components.

- Avoid unnecessary dependencies. If a dependency is needed, use the project's package manager and preserve the lockfile.

- Avoid repeated expensive work, broad data fetching, and duplicate API calls. Use pagination and targeted queries for growing datasets.

- Do not use mock data as if it were live or saved. If a service is unavailable, show the limitation honestly.

### Before delivery

- Review the diff for unrelated changes, accidental secrets, unsafe defaults, and missing error states.

- Run the most relevant available lint, type-check, build, and tests; start the app and exercise critical paths when possible.

- Report what changed, what checks ran, and what remains unverified. Never state that a command or flow passed unless it actually did.

## 3. Security Baseline — Apply by Default

Treat every value from a browser, URL, file, webhook, third-party API, database record, or environment boundary as untrusted until checked. Frontend checks improve usability; **the server is the security boundary**.

### API route inventory and access control

For every route, establish and enforce:

- Intended caller: public, authenticated user, or specific privileged role.

- Allowed HTTP method, accepted content type, expected schema, and response shape.

- Authentication before protected work; authorization for the requested action and specific resource.

- Ownership/tenant checks on every read, update, and delete. A valid ID is not proof that the caller may access the record (prevent IDOR/BOLA).

- Least privilege: users can access only the records and fields needed for their task. Never trust a client-supplied `userId`, role, owner, price, status, permission, or tenant identifier as authoritative.

- Consistent, appropriate HTTP status codes and safe error messages.

Do not rely on hidden buttons or client-side route guards for access control. Enforce permissions in server middleware/service logic on every request.

### Request validation and data integrity

- Validate at the API boundary using the project's established schema-validation approach, if available.

- Allowlist accepted fields; reject or safely ignore unexpected fields. Do not pass `req.body` directly into database create/update calls or spread it into privileged objects.

- Check type, presence, format, range, length, allowed enum values, and cross-field rules. Normalize only where the field's meaning permits it.

- Convert expected validation failures into clear field-level errors and a 4xx response. Do not turn malformed input into a 500.

- Validate route parameters, query parameters, headers used for decisions, and uploaded files as well as JSON bodies.

- Protect against mass assignment and NoSQL/operator injection. Construct database filters from validated values; never accept raw client query operators or unrestricted filter/sort objects.

- Use atomic/conditional updates or transactions where necessary to maintain invariants and avoid race conditions.

- Enforce uniqueness and referential/business rules at the data layer as well as in the UI when applicable.

### Authentication, sessions, and browser protections

- Reuse the existing, maintained authentication architecture; do not invent a home-grown password or token system.

- Never store passwords, access tokens, refresh tokens, or secrets in `localStorage` or `sessionStorage`.

- For cookie-based sessions, use `HttpOnly`, `Secure` in production, and an appropriate `SameSite` policy; rotate/invalidate sessions at the right lifecycle points. Assess CSRF protection for cookie-authenticated state-changing requests.

- Restrict CORS to known origins when credentials or private APIs are involved; do not combine credentialed requests with wildcard origins.

- Use established security headers and safe content-type behavior through the existing server/platform configuration. Avoid leaking framework/version details where practical.

- Render user content as text by default. Do not use unsafe HTML injection. If rich HTML is a real requirement, sanitize it with a maintained allowlist-based sanitizer on the server and use context-appropriate output encoding.

- Do not build SQL/NoSQL commands, shell commands, or filesystem paths by concatenating untrusted input.

### Abuse resistance and operational safety

- Apply sensible rate limits to authentication, password reset, expensive, public-write, and other abuse-prone endpoints where supported.

- Bound request body sizes, pagination sizes, search lengths, and upload size/type. Avoid unbounded queries and resource-intensive input.

- Make retries safe where possible. Use idempotency keys or duplicate protection for operations where accidental repeats have material consequences.

- Avoid revealing whether sensitive accounts or records exist when that would enable enumeration.

- Log enough server-side context to diagnose failures, but redact passwords, tokens, cookies, personal data, and full request bodies containing sensitive data.

- Keep secrets in environment/secret management, never in source, client bundles, screenshots, or committed `.env` files. Maintain appropriate `.gitignore` entries. Do not print secret values during debugging.

- Use TLS for deployed sensitive traffic. Do not disable certificate or security checks to work around connectivity issues.

## 4. Form and Input Validation — Empty Values Included

Every form must be understandable, accessible, and validated on both client and server. The server validation remains authoritative.

### Define the data contract first

For each field, specify whether it is required or optional, its type, normalization rules, minimum/maximum length or numeric range, allowed values, and any relationship to other fields. Keep client and server rules aligned where practical, without duplicating complex business logic in a way that can drift.

### Empty and malformed input

- Distinguish a missing field, `null`, an empty string, whitespace-only text, and a legitimate value such as `0` or `false`.

- For required text fields, trim surrounding whitespace for validation and reject values that become empty. Do not treat whitespace as meaningful content unless the domain explicitly requires it.

- For optional fields, normalize blank/whitespace-only input consistently (for example, to `undefined` or `null`) according to the data model; do not accidentally save meaningless empty strings.

- Handle empty textareas exactly like other text fields. Enforce minimum/maximum character limits and show a remaining/maximum count if it helps the user.

- Validate numeric inputs as numbers with finite values and explicit bounds; do not let empty strings silently become `0` or accept `NaN`/infinity.

- Validate dates, email addresses, URLs, identifiers, files, and enums with appropriate parsers/rules instead of loose truthiness checks.

- Do not reject legitimate Unicode, names, or punctuation with overly restrictive regexes. Do not attempt to “sanitize” arbitrary text by stripping characters; validate for the intended field and safely encode when displaying it.

- Prevent overlong input, unexpected nested objects, invalid arrays, malformed JSON, and unsupported file types/sizes.

### Form UX and accessibility

- Use semantic forms, associated labels, appropriate input types, and clear required/optional indicators. Placeholders are examples, not labels.

- Validate on submit and use a sensible, non-disruptive strategy for inline feedback (for example, after touch/blur); do not show errors before users can reasonably act.

- Put a clear message beside each invalid field and provide an error summary or focus the first invalid field for longer forms. Use accessible descriptions and `aria-invalid`/`aria-describedby` where appropriate.

- Preserve safe user-entered values after validation or network failure; never clear a form just because submission failed.

- Show submitting/loading state, prevent accidental duplicate submission, and restore the control after completion/failure. Do not mistake a disabled button for server-side duplicate protection.

- Show success only after the server confirms the operation. On failure, display a useful, non-sensitive message and allow a safe retry.

- Handle offline/network errors, server validation errors, expired sessions, and conflict responses distinctly when practical.

- Ensure controls work with keyboard and screen readers; do not communicate validity using color alone.

### Data rendering

- Render untrusted values as text, not executable markup.

- Handle missing/null fields without crashes; use explicit empty states rather than misleading placeholder data.

- Format data at the presentation layer without changing the stored source of truth.

- Avoid exposing private fields in API responses or HTML, including password hashes, tokens, internal flags, and fields the current caller is not permitted to view.

## 5. API and Error-Handling Rules

- Keep route definitions, schema validation, authorization, business logic, and persistence organized according to the existing project structure.

- Use appropriate HTTP methods and status codes (`400`/`422` for invalid input according to project convention, `401` unauthenticated, `403` unauthorized, `404` missing/hidden resources, `409` conflicts, and `5xx` unexpected server failures).

- Return a consistent response shape. Expose actionable validation details without exposing stack traces, raw database errors, secrets, or sensitive existence checks.

- Catch/propagate asynchronous errors through the established error middleware. Do not swallow errors or return success before required work completes.

- Do not leak database documents wholesale. Select fields and serialize a deliberate public response DTO.

- Avoid over-fetching; paginate list endpoints, set safe maximum page sizes, and validate sort/filter options against allowlists.

- For mutations, update the UI from a confirmed response. If using optimistic UI, roll back on failure and explain the state accurately.

- Keep destructive operations protected, narrowly scoped, and confirmed in the interface when user data could be lost.

## 6. MongoDB Persistence — Project Requirement

**MongoDB is the source of truth for persistent application/business data in this project.** Use the existing MongoDB connection and data-access architecture.

- Persist required records through the backend; use appropriate schemas/types, constraints, indexes, and timestamps where useful.

- Validate and authorize before database changes. Never trust client-supplied ownership or privileged fields.

- Build queries from validated values; avoid raw client filters and unrestricted object spreading.

- Handle missing, duplicate, invalid, conflicting, and unavailable records explicitly. Use pagination for collections that can grow.

- Select only fields needed by the caller and omit secrets/private fields from responses.

- Confirm the write actually succeeded before reporting success. Verify important reads and writes through the real application path when possible.

- Do not replace required MongoDB persistence with browser storage, hardcoded arrays, mock objects, or static JSON. Browser memory may hold temporary UI state; caching may improve reads but cannot become the source of truth.

- Cookies may hold appropriately protected session identifiers, not business records. Never put passwords or sensitive credentials in browser storage.

- If MongoDB is unavailable, report a clear failure, preserve safe retry behavior, and do not silently queue business writes in browser storage or pretend the data was saved.

## 7. Frontend, UI, and Accessibility

- Preserve the established framework, component patterns, aliases, styling, and design system.

- Keep components focused; avoid duplicate state and unnecessary renders. Use stable list keys and clean up subscriptions, timers, and event listeners.

- Every visible interactive control must do what it indicates. No fake buttons, dead links, or success states without real work.

- Model loading, empty, populated, validation-error, request-error, and success states explicitly.

- Use semantic HTML, visible focus, keyboard access, meaningful image alt text, accessible names for icon-only controls, and readable contrast.

- Check the target viewport and at least one narrow/mobile viewport. Prevent unintended horizontal overflow and keep essential actions usable.

- Follow the supplied design references for hierarchy, spacing, typography, color, image crop, and interaction states. Use supplied assets when relevant; do not replace them with unrelated imagery or emoji.

- Compare screenshots/rendered output to references when tools permit; fix the largest discrepancies first. Do not claim pixel-perfect fidelity without visual verification.

- Avoid unsafe HTML rendering, secret-bearing environment variables in client bundles, and client-side authorization assumptions.

## 8. Project-Specific Tooling and Stack

The existing frontend is expected to use **React, Vite, TypeScript, Tailwind CSS v4, and shadcn/ui with the Radix-based Nova preset**. Confirm the repository before relying on this assumption.

- Preserve the installed framework, package manager, dependencies, aliases, components, and styling configuration unless a change is necessary and justified.

- Prefer existing shadcn/ui components and project utilities over a competing component library.

- Verify Tailwind version and existing syntax before editing configuration or styles.

- Adapt generated UI code to this repository; do not blindly copy a generated project, overwrite configuration, or assume an external design tool can see local files.

- Use Graphify for codebase context when installed and useful. Its graph is auxiliary; verify conclusions against actual source, tests, and runtime behavior. If unavailable or stale, inspect files directly.

- Use v0 for visual exploration/UI code only when available and useful. Generated code does not replace integration, API security, persistence, or testing.

- Use tools when they materially improve speed, context, design accuracy, or reliability. Do not duplicate work across tools.

## 9. Design and Task Execution

Convert the task into a small checklist: required pages/routes, user journeys, data entities, API operations, permissions, validation/error states, design references, and responsive behavior.

Implement the highest-priority complete flow first. For reference-driven UI, use this sequence:

1. Inspect reference and existing assets.

1. Establish page structure and proportions.

1. Match typography, spacing, hierarchy, and key visual elements.

1. Implement real interactions and data flow.

1. Verify loading, empty, success, invalid, and failure states.

1. Compare the rendered page with the reference and correct the biggest gaps.

Do not spend time perfecting minor details while core requirements or security controls are missing. Do not add optional features late in the task unless explicitly requested or necessary for correctness.

## 10. Testing and Verification

Run available checks that provide the most value for the changed code: lint, type-check, focused tests, build, and runtime/browser checks. Report unavailable checks rather than implying they passed.

For each affected feature, verify as practical:

- Main happy path and expected API response.

- Missing, empty, whitespace-only, wrong-type, malformed, too-short, and too-long inputs as relevant.

- Unauthorized and unauthenticated access; attempts to access another user's record.

- Duplicate/conflicting submissions and safe retry behavior.

- Database unavailable/error behavior without false success.

- Loading, no-results/empty, error, and populated UI states.

- Keyboard/accessibility basics and responsive layout.

- Console/server errors and unexpected data exposure.

For MongoDB-backed changes, submit valid data, confirm success only after the write, read it through the intended app flow, reload and confirm persistence, and exercise relevant invalid/failure cases. Use test data and avoid destructive actions against real user data.

## 11. Dependency, Offline, and Git Safety

- Inspect installed dependencies and scripts before adding packages; avoid dependencies for trivial functionality.

- Preserve the existing package manager and lockfile. Do not delete lockfiles to work around installation issues.

- Avoid unnecessary remote CDN dependencies; keep essential assets available as the project expects.

- Offline tooling does not change the MongoDB persistence requirement. If the configured database is unreachable, show failure rather than switching stores or inventing saved records.

- Inspect `git status` before substantial work; preserve user modifications.

- Do not reset, clean, force-push, discard changes, commit, or push unless requested or required by the task.

- Keep `.env` and secrets out of version control; review `.gitignore` and the final diff.

## 12. Definition of Done

- [ ] Explicit task requirements and primary user flow are implemented.

- [ ] Existing application architecture and user changes are preserved.

- [ ] API routes validate untrusted input and enforce authentication, authorization, ownership, and least privilege where applicable.

- [ ] Forms handle missing, blank, whitespace-only, malformed, boundary, loading, and failure cases appropriately.

- [ ] User-provided content is safely rendered; sensitive data and internal errors are not exposed.

- [ ] Required business data persists in MongoDB and is not represented as saved when a write failed.

- [ ] UI has meaningful loading, empty, success, and error states, and is usable on required screen sizes.

- [ ] Relevant checks have actually run; unresolved failures and unverified areas are disclosed.

- [ ] The final diff contains no unrelated changes or accidental secrets.

## Final Principle

**Understand the existing code. Implement the smallest complete solution. Validate every boundary. Enforce security on the server. Make the UI honest and accessible. Verify before claiming done.**