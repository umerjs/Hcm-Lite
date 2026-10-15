# Graph Report - Mern-Template  (2026-10-15)

## Corpus Check
- 44 files · ~5,487 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 252 nodes · 369 edges · 17 communities (12 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `852fb1a1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.tsx
- profile/index.mjs
- Frontend/package.json
- Backend/package.json
- compilerOptions
- compilerOptions
- compilerOptions
- devDependencies
- dependencies
- scripts
- dependencies
- Backend/vercel.json
- vite-env.d.ts
- tsconfig.json
- Backend/README.md
- Frontend/vercel.json

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 20 edges
2. `compilerOptions` - 18 edges
3. `compilerOptions` - 15 edges
4. `react` - 12 edges
5. `store` - 11 edges
6. `react-router-dom` - 9 edges
7. `axios` - 7 edges
8. `BackendUrl` - 7 edges
9. `UserModel` - 6 edges
10. `Button()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `App()` --calls--> `store`  [EXTRACTED]
  Frontend/src/App.tsx → Frontend/src/store/states.ts
- `Navbar()` --calls--> `store`  [EXTRACTED]
  Frontend/src/components/Navbar.tsx → Frontend/src/store/states.ts
- `Login()` --calls--> `store`  [EXTRACTED]
  Frontend/src/pages/Login.tsx → Frontend/src/store/states.ts
- `Profile()` --calls--> `store`  [EXTRACTED]
  Frontend/src/pages/Profile.tsx → Frontend/src/store/states.ts
- `Signup()` --calls--> `store`  [EXTRACTED]
  Frontend/src/pages/SignUp.tsx → Frontend/src/store/states.ts

## Import Cycles
- None detected.

## Communities (17 total, 4 thin omitted)

### Community 0 - "App.tsx"
Cohesion: 0.12
Nodes (26): App(), Button(), ButtonProps, FormProps, ButtonProps, Input(), SpinnerLoader(), Navbar() (+18 more)

### Community 1 - "profile/index.mjs"
Cohesion: 0.14
Nodes (19): connect_db(), handleMulterError(), multerMiddleware, authGuard(), UserModel, UserSchema, router, router (+11 more)

### Community 2 - "Frontend/package.json"
Cohesion: 0.08
Nodes (27): @types/bun, typescript, name, private, scripts, build, dev, lint (+19 more)

### Community 3 - "Backend/package.json"
Cohesion: 0.07
Nodes (27): uploadOnCloudinary(), author, description, devDependencies, nodemon, @types/bun, engines, node (+19 more)

### Community 4 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, allowJs, jsx, lib, module, moduleDetection, moduleResolution (+12 more)

### Community 5 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 6 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 7 - "devDependencies"
Cohesion: 0.14
Nodes (14): devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, @types/bun, @types/node (+6 more)

### Community 8 - "dependencies"
Cohesion: 0.18
Nodes (11): dependencies, bcryptjs, cloudinary, cors, dotenv, express, jsonwebtoken, mongoose (+3 more)

### Community 9 - "scripts"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, dev, dev:server, format, install:all (+1 more)

### Community 10 - "dependencies"
Cohesion: 0.22
Nodes (9): dependencies, axios, react, react-dom, react-icons, react-router-dom, tailwindcss, @tailwindcss/vite (+1 more)

### Community 11 - "Backend/vercel.json"
Cohesion: 0.50
Nodes (3): builds, routes, version

## Knowledge Gaps
- **147 isolated node(s):** `lib`, `target`, `module`, `moduleDetection`, `jsx` (+142 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 153 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `Frontend/package.json`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `react` connect `App.tsx` to `Frontend/package.json`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `Frontend/package.json`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `lib`, `target`, `module` to the rest of the system?**
  _147 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1191919191919192 - nodes in this community are weakly interconnected._
- **Should `profile/index.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.14408602150537633 - nodes in this community are weakly interconnected._
- **Should `Frontend/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08045977011494253 - nodes in this community are weakly interconnected._