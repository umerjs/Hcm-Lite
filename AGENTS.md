# AGENTS.md — 12-Hour Hackathon Execution Rules

## 1. Mission

Build the assigned application as quickly as possible while maintaining visual accuracy, functional completeness, data integrity, and reliable execution.

**Primary objective:** Deliver a complete, polished, responsive application that closely matches the supplied reference designs and satisfies all task requirements.

Priorities:
1. Correct interpretation of the assignment.
2. Pixel-accurate UI.
3. Working end-to-end functionality.
4. Persistent MongoDB data storage.
5. Responsive design and accessibility.
6. Fast testing and reliable delivery.

A feature is not complete until its behavior has been verified.

## 2. Mandatory Rules

- Read this file before implementing changes.
- Inspect the existing repository, dependencies, scripts, and architecture first.
- Preserve the existing stack, working code, naming conventions, and project structure.
- Follow the task requirements and reference designs as the source of truth.
- Prefer focused changes over unnecessary rewrites.
- Do not add unrequested features unless essential.
- Reuse existing dependencies and components wherever practical.
- Never claim that code, tests, database operations, or features work without verification.
- Do not delete files or discard existing work without a clear reason.
- Keep the application runnable throughout implementation.
- **MongoDB is the persistent database for application data.**
- Do not substitute browser storage, caches, or cookies for MongoDB persistence.
- Do not sacrifice data integrity or security to save implementation time.

## 3. Initial Project Inspection

Before coding:

1. Read `package.json` and identify the package manager and scripts.
2. Inspect the application entry points and folder structure.
3. Confirm whether the project uses React with Vite, Next.js, or another framework.
4. Identify the existing API architecture and MongoDB integration.
5. Inspect existing models, schemas, routes, controllers, middleware, and database configuration.
6. Identify authentication, authorization, validation, and error-handling patterns.
7. Locate available assets, fonts, components, and reference designs.
8. Run the existing application if possible.

Do not assume a particular framework or library without inspecting the repository.

Do not recreate the project or replace its configuration unnecessarily.

## 4. Task Analysis

Convert the assignment into a concise checklist containing:

- Required pages and routes.
- Required UI sections and layouts.
- Required interactions and user flows.
- Data entities and relationships.
- Required MongoDB persistence operations.
- Authentication and authorization requirements.
- Validation and error states.
- Responsive requirements.
- Available screenshots, assets, and design references.

Prioritize the evaluator's explicit requirements.

If an essential requirement is ambiguous and different interpretations would significantly change the implementation, ask one concise clarification. Otherwise, make a reasonable decision based on the available evidence and proceed.

## 5. Pixel-Perfect UI Rules

Visual fidelity is a core requirement.

Match the supplied reference as closely as practical:

- Page structure, container widths, and alignment.
- Section heights, spacing, margins, padding, and gaps.
- Typography, font weights, line heights, and text wrapping.
- Colors, gradients, borders, shadows, and corner radii.
- Image selection, aspect ratios, crops, and positioning.
- Navigation, headers, sidebars, cards, tables, and footers.
- Button dimensions, icon placement, and interactive states.
- Responsive layouts at the required viewport sizes.

### Visual workflow

1. Inspect the reference before implementation.
2. Establish the main layout and page proportions.
3. Match typography, spacing, and visual hierarchy.
4. Use appropriate assets and icons.
5. Implement the required functionality.
6. Run the application and capture screenshots when possible.
7. Compare the rendered output against the reference.
8. Fix the largest visual differences first.
9. Repeat until the main discrepancies are resolved.

Do not claim pixel-perfect accuracy without visual verification.

Do not replace supplied assets with unrelated images or emoji when appropriate assets are available.

Avoid contradictory CSS overrides and unnecessary styling rewrites.

## 6. Design System and Styling

- Follow the existing styling framework and conventions.
- Reuse design tokens, CSS variables, utility classes, and components.
- Keep typography, spacing, colors, and component dimensions consistent.
- Build reusable components when multiple pages need the same UI.
- Keep components focused and maintainable.
- Avoid excessive abstractions for one-off elements.
- Do not redesign away from the supplied reference.
- Verify the installed Tailwind version before changing configuration or syntax.

## 7. MongoDB — Mandatory Data Persistence

**MongoDB must be the source of truth for persistent application data.**

All applicable application data must be persisted in MongoDB through the application's backend.

Examples include, when required by the assignment:

- User accounts and profiles.
- Products, posts, and categories.
- Orders, payments metadata, and transactions metadata.
- Form submissions and business records.
- Comments, messages, and other user-generated content.
- Application settings and other persistent entities.

Do not assume every example is required. Implement the data models and operations that the assignment actually needs.

### Required database behavior

- Inspect and reuse the existing MongoDB connection and data-access patterns.
- Use the existing Mongoose models or established MongoDB driver integration where available.
- Create appropriate schemas, field types, validation rules, and indexes when needed.
- Use server-side database operations for creating, reading, updating, and deleting records.
- Ensure successful writes persist after a page reload, browser restart, or new authenticated session.
- Return appropriate responses when database operations succeed or fail.
- Handle missing records, duplicate records, invalid input, and connection failures.
- Use environment variables for database connection strings and credentials.
- Keep database credentials and privileged operations on the server.
- Validate incoming data on the server; never trust client-side validation alone.
- Apply authentication and authorization checks to protected operations.
- Avoid unnecessary queries and excessively broad database reads.
- Use appropriate pagination for large collections when required.
- Do not expose passwords, private tokens, or sensitive internal fields in API responses.
- Never return a successful response before the relevant database operation has actually succeeded.

### Prohibited substitutes for persistent storage

Do not use any of the following as the primary or alternative persistent store for application business data:

- `localStorage`
- `sessionStorage`
- IndexedDB
- Cookies
- Browser memory as a substitute for database persistence
- Hardcoded arrays or mock objects presented as saved records
- Static JSON files used as a replacement for required database writes

In-memory variables may be used for temporary UI state, calculations, or non-persistent processing. They must not replace MongoDB for persistent records.

Browser caching is acceptable for static assets and appropriate read-performance optimizations, but cached content must not replace the database as the source of truth.

### Authentication distinction

Cookies may be used for secure session identifiers or authentication tokens when appropriate. They are not a database for application records.

If authentication is required, use the existing authentication architecture or implement a suitable server-side session/token flow. Use secure cookie attributes where applicable, and enforce authorization on the server.

Do not store passwords or sensitive credentials in browser storage.

### When internet or MongoDB is unavailable

- Never pretend a database write succeeded when it failed.
- Do not silently queue business-data writes in browser storage.
- Do not switch automatically to mock data or a different database.
- Display a clear, user-friendly error when the database is unavailable.
- Preserve the user's ability to retry the operation without creating unintended duplicate records.
- Keep the application interface usable where possible, while clearly distinguishing unavailable data from saved data.
- Do not repeatedly retry failing database operations without a sensible limit.
- Use local MongoDB only if it is explicitly configured and available in the project environment.

If the database is hosted remotely, a working internet connection is required for remote database operations.

## 8. React and MERN Guidelines

Follow the existing project architecture.

### React

- Use functional components and hooks consistently with the existing codebase.
- Keep state as local as practical.
- Avoid duplicated state and unnecessary re-renders.
- Use stable keys for rendered lists.
- Handle loading, empty, success, and error states.
- Clean up event listeners and asynchronous effects where necessary.
- Do not use browser storage to bypass missing backend functionality.

### Express and API

- Keep API routes, controllers, validation, and business logic organized according to the existing structure.
- Validate incoming data on the server.
- Handle asynchronous errors correctly.
- Use suitable HTTP methods and status codes.
- Avoid exposing internal exceptions or database details to end users.
- Protect sensitive routes and enforce permissions server-side.
- Avoid introducing a new backend architecture unless the task requires it.

### Database integration

For a typical MERN application, the data flow should be:

React UI → HTTP request → Express API → validation and authorization → MongoDB → API response → React UI.

Follow this pattern unless the existing project has a justified alternative architecture.

For data mutations, update the UI based on the confirmed API result. If optimistic updates are necessary, implement appropriate rollback behavior when the operation fails.

## 9. Forms and Interactions

Every visible interactive element must have a meaningful behavior.

Verify:

- Navigation links lead to the correct routes.
- Buttons trigger their intended actions.
- Forms validate inputs and show useful feedback.
- Create, edit, and delete operations use the backend when required.
- Newly created or edited records remain available after reloading the page.
- Search and filtering operate on the intended data.
- Dialogs, menus, tabs, and dropdowns behave correctly.
- Loading, empty, success, and error states are handled appropriately.
- Failed requests do not display false success messages.
- Repeated submissions do not accidentally create duplicate records.
- Important controls support keyboard interaction where appropriate.

Do not create fake interactions just to make a screenshot look complete.

If a required backend or external service is unavailable, explain the limitation rather than pretending it works.

## 10. Responsive Design and Accessibility

- Check the required viewport and at least one narrower mobile viewport.
- Prevent unintended horizontal overflow.
- Keep navigation and primary actions usable.
- Ensure text remains readable.
- Use semantic HTML and accessible form labels.
- Provide meaningful alternative text for informative images.
- Maintain visible keyboard focus.
- Give icon-only buttons accessible names.
- Do not communicate errors through color alone.

Prioritize the evaluator's target viewport without unnecessarily breaking other screen sizes.

## 11. Dependency and Offline Rules

Internet connectivity may be slow or unavailable during the hackathon.

- Inspect installed dependencies before adding packages.
- Prefer existing libraries and components.
- Avoid downloads for trivial functionality.
- Keep required fonts, icons, and assets locally available when possible.
- Preserve the existing package manager and lockfile.
- Do not delete lockfiles to work around installation problems.
- Do not depend unnecessarily on remote CDNs.
- Do not repeatedly retry downloads when the connection is unavailable.
- Use offline installation only when the required package versions are cached locally.

**Offline tooling does not change the database requirement.** If the configured MongoDB server is unreachable, database-dependent operations must report failure rather than writing to browser storage.

## 12. Time Management

The assignment must fit within 12 hours.

Use this adaptable time budget:

- 0–10%: Inspect requirements, references, and repository.
- 10–20%: Establish the main layout and architecture.
- 20–60%: Implement required pages, APIs, and MongoDB operations.
- 60–80%: Refine visual accuracy and responsive behavior.
- 80–95%: Test critical workflows and fix defects.
- 95–100%: Final verification and delivery.

Adjust according to the actual assignment.

- Complete the highest-priority workflow first.
- Keep the application runnable.
- Compare the UI against the reference throughout development.
- Fix blockers and major visual discrepancies before optional enhancements.
- Do not spend excessive time perfecting minor details while core requirements are missing.
- Do not add unrequested features near the deadline.

## 13. AI Agent Workflow

For each implementation task:

1. Read the relevant files.
2. Identify the smallest sensible change.
3. Implement it.
4. Run the most relevant available check.
5. Verify the result when possible.
6. Report what changed and what remains unverified.

Before substantial changes, briefly state the intended approach.

Avoid unnecessary rewrites, unrelated refactoring, excessive planning, and repeated explanations.

If a test fails, investigate the actual error. Do not remove tests, hide failures, or weaken validation merely to get a passing result.

## 14. Testing and Verification

After meaningful changes:

- Run relevant lint, type-check, or test commands when available.
- Start the application and inspect affected pages.
- Check browser console errors when possible.
- Test important user interactions.
- Verify responsive behavior.
- Check API responses and database persistence.
- Confirm failed database operations display appropriate errors.
- Confirm successful database writes remain available after reloading the application.

For database-dependent features, verify the complete workflow:

1. Submit valid data.
2. Confirm the API reports success only after the database operation succeeds.
3. Read the record back through the intended application flow.
4. Reload the page and confirm the record is still present.
5. Test invalid input and relevant failure scenarios.

Before delivery, confirm the app starts correctly, the required routes work, critical features are implemented, and relevant checks have been performed.

Disclose checks that could not be run.

## 15. Git and Change Safety

- Inspect `git status` before substantial changes.
- Preserve existing user changes.
- Do not reset, clean, force-push, or discard work without explicit authorization.
- Keep changes focused on the assignment.
- Do not commit or push unless requested or required.
- Never include credentials in source code or commits.
- Keep `.env` files and secrets out of version control.
- Maintain appropriate `.gitignore` rules.

## 16. Definition of Done

- [ ] All required pages and features are implemented.
- [ ] The application runs locally.
- [ ] The UI closely matches the supplied reference.
- [ ] Primary interactions work.
- [ ] Required application records persist in MongoDB.
- [ ] Successful writes and failed writes are handled correctly.
- [ ] No browser storage or mock data substitutes for required MongoDB persistence.
- [ ] Authentication and authorization requirements are enforced where applicable.
- [ ] The layout works at the required viewport sizes.
- [ ] No known critical runtime errors remain.
- [ ] Relevant available checks have been run.
- [ ] Remaining limitations are reported honestly.

## Final Principle

**Understand the task. Match the reference. Implement the real functionality. Persist application data in MongoDB. Verify the result. Deliver on time.**

Prefer a small, complete, visually accurate, database-backed application over a large, unfinished, over-engineered one.
