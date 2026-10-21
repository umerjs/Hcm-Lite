# Graph Report - Mern-Template  (2026-10-22)

## Corpus Check
- 49 files · ~9,059 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 341 nodes · 464 edges · 20 communities (16 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fff109db`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.tsx
- profile/index.mjs
- client/package.json
- server/package.json
- AGENTS.md — Secure, Fast App Development Playbook
- components.json
- compilerOptions
- compilerOptions
- dependencies
- scripts
- compilerOptions
- devDependencies
- dependencies
- Getting Started
- tsconfig.json
- server/vercel.json
- vite-env.d.ts
- client/vercel.json
- server/README.md

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 20 edges
2. `compilerOptions` - 18 edges
3. `compilerOptions` - 15 edges
4. `AGENTS.md — Secure, Fast App Development Playbook` - 15 edges
5. `react` - 13 edges
6. `store` - 13 edges
7. `react-router-dom` - 9 edges
8. `axios` - 7 edges
9. `BackendUrl` - 7 edges
10. `tailwind` - 6 edges

## Surprising Connections (you probably didn't know these)
- `App()` --calls--> `store`  [EXTRACTED]
  client/src/App.tsx → client/src/store/states.ts
- `Navbar()` --calls--> `store`  [EXTRACTED]
  client/src/components/Navbar.tsx → client/src/store/states.ts
- `Home()` --calls--> `store`  [EXTRACTED]
  client/src/pages/Home.tsx → client/src/store/states.ts
- `Login()` --calls--> `store`  [EXTRACTED]
  client/src/pages/Login.tsx → client/src/store/states.ts
- `Profile()` --calls--> `store`  [EXTRACTED]
  client/src/pages/Profile.tsx → client/src/store/states.ts

## Import Cycles
- None detected.

## Communities (20 total, 3 thin omitted)

### Community 0 - "App.tsx"
Cohesion: 0.13
Nodes (25): App(), Button(), ButtonProps, FormProps, ButtonProps, Input(), SpinnerLoader(), Navbar() (+17 more)

### Community 1 - "profile/index.mjs"
Cohesion: 0.14
Nodes (19): bcryptjs, cors, express, jsonwebtoken, mongoose, multer, connect_db(), handleMulterError() (+11 more)

### Community 2 - "client/package.json"
Cohesion: 0.05
Nodes (41): imports, #components/*, #hooks/*, #lib/*, @types/bun, typescript, name, private (+33 more)

### Community 3 - "server/package.json"
Cohesion: 0.07
Nodes (30): cloudinary, dotenv, express-rate-limit, morgan, nodemailer, nodemon, sharp, streamifier (+22 more)

### Community 4 - "AGENTS.md — Secure, Fast App Development Playbook"
Cohesion: 0.07
Nodes (26): 10. Testing and Verification, 11. Dependency, Offline, and Git Safety, 12. Definition of Done, 1. Operating Rules, 2. Fast, Low-Risk Workflow, 3. Security Baseline — Apply by Default, 4. Form and Input Validation — Empty Values Included, 5. API and Error-Handling Rules (+18 more)

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
Cohesion: 0.12
Nodes (17): dependencies, axios, class-variance-authority, cn, @fontsource-variable/geist, lucide-react, radix-ui, react (+9 more)

### Community 9 - "scripts"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, dev, dev:server, format, install:all (+1 more)

### Community 10 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 11 - "devDependencies"
Cohesion: 0.14
Nodes (14): devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, @types/bun, @types/node (+6 more)

### Community 12 - "dependencies"
Cohesion: 0.14
Nodes (14): dependencies, bcryptjs, cloudinary, cors, dotenv, express, express-rate-limit, jsonwebtoken (+6 more)

### Community 13 - "Getting Started"
Cohesion: 0.25
Nodes (7): Features, Getting Started, Installation, MERN Starter Template, Prerequisites, Running Development Servers, Tech Stack

### Community 14 - "tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, baseUrl, paths, files, references

### Community 15 - "server/vercel.json"
Cohesion: 0.50
Nodes (3): builds, routes, version

## Knowledge Gaps
- **216 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+211 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 225 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `client/package.json`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `react` connect `App.tsx` to `client/package.json`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `client/package.json`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _216 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12896405919661733 - nodes in this community are weakly interconnected._
- **Should `profile/index.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.14408602150537633 - nodes in this community are weakly interconnected._
- **Should `client/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05217391304347826 - nodes in this community are weakly interconnected._