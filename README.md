# Snip

Tiny URL shortener with one backend and two clients — all three live in separate
orphan branches of this repo, wired together here as Git submodules.

```
main  ← you are here (superproject)
├── backend/   → branch: backend   (Bun HTTP server)
├── frontend/  → branch: frontend  (Angular 19 SPA)
├── cli/       → branch: cli       (Node.js CommonJS CLI)
├── bundle/    → branch: bundle    (generated deployment artefact — do not edit)
└── scripts/
    └── build-bundle.mjs           (assembles bundle/ from the three source branches)
```

---

## Idea

A single stateless Bun server stores shortened links in memory and exposes a
tiny REST API.  Two completely independent clients — a browser app and a
terminal CLI — talk to that same API.  Each layer is developed in isolation on
its own Git branch; the `main` branch is only a thin aggregation layer that
pins each branch to a specific commit via a submodule pointer.

---

## API Contract

| Method | Path | Request body | Success | Errors |
|--------|------|--------------|---------|--------|
| `POST` | `/api/links` | `{ "url": "https://…" }` | `201` `{ code, url, shortUrl, hits, createdAt }` | `400` invalid JSON or non-http(s) URL |
| `GET`  | `/api/links` | — | `200` array of link objects (same shape) | — |
| `GET`  | `/:code` | — | `302 → original URL` (increments `hits`) | `404` unknown code |

Link object shape:

```json
{
  "code":      "aB3xYz",
  "url":       "https://example.com/very/long/path",
  "shortUrl":  "http://localhost:3000/aB3xYz",
  "hits":      3,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

CORS is open (`*`) and `OPTIONS` preflight is handled.  Environment variables
for the backend:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | TCP port |
| `BASE_URL` | `http://localhost:PORT` | Origin used in `shortUrl` values |
| `RAILWAY_PUBLIC_DOMAIN` | — | Used as `BASE_URL` fallback when deployed on Railway |
| `PUBLIC_DIR` | — | When set, also serves static files (Angular build output) |

---

## Repository Layout

```
Branch      Submodule path   Contents
──────────  ───────────────  ──────────────────────────────────────────────
backend     backend/         server.js  package.json  README.md
frontend    frontend/        src/  angular.json  package.json  design.md  …
cli         cli/             cli.js  snip  snip.cmd  snip.ps1  package.json
```

The `main` branch itself contains only `.gitmodules` and this `README.md`.
Each submodule is pinned to a specific commit and tracks its branch so
`--remote` updates stay automatic.

---

## Cloning

A plain `git clone` leaves all three submodule directories **empty**.  Always
use `--recurse-submodules`:

```bash
git clone --recurse-submodules https://github.com/seanoreo96-work/ai-sdlc-snip-demo.git
cd ai-sdlc-snip-demo
```

If you already cloned without the flag:

```bash
git submodule update --init --recursive
```

---

## Running All Three Pieces

### 1 — Backend (requires [Bun](https://bun.sh) ≥ 1.0)

```bash
cd backend
bun start
# Listening on http://localhost:3000
```

### 2 — Frontend (requires Node.js + Angular CLI)

```bash
cd frontend
npm install
npx ng serve
# Open http://localhost:4200  (proxies nothing — calls backend at :3000 directly)
```

Or build and let the backend serve the static files:

```bash
npx ng build                          # output: dist/snip-frontend/browser/
PUBLIC_DIR=dist/snip-frontend/browser bun start   # in the backend folder
```

### 3 — CLI (requires Node.js ≥ 18)

```bash
cd cli
node cli.js add https://example.com   # snip add
node cli.js ls                        # snip ls
node cli.js open aB3xYz              # snip open

# Or install globally:
npm install -g .
snip ls
```

By default the CLI talks to `http://localhost:3000`.  Override with `SNIP_API`:

```bash
SNIP_API=https://your-deployed-backend.example.com snip ls
```

---

## Update Workflow

### Making a change on a submodule branch

```bash
# 1. Work inside the submodule
cd backend
# … edit server.js …
git add server.js
git commit -m "fix: handle duplicate codes"
git push origin backend

# 2. Bump the superproject pointer
cd ..
git submodule update --remote backend   # fast-forwards the pinned commit
git add backend
git commit -m "chore: bump backend to $(git -C backend rev-parse --short HEAD)"
git push origin main
```

### Pulling latest pointer updates made by others

```bash
git pull origin main
git submodule update --recursive        # checkout the newly-pinned commits
```

### Checking submodule status at a glance

```bash
git submodule status
#  f07ff70 backend  (heads/backend)
#  06798c8 frontend (heads/frontend)
#  34e7059 cli      (heads/cli)
#  99b9ebe bundle   (heads/bundle)
```

---

## Bundle / Deployment (`scripts/build-bundle.mjs`)

The `bundle/` submodule (branch `bundle`) is a **generated** deployment
artefact — it is never edited by hand.  It contains:

| File | Origin |
|------|--------|
| `server.js` | copied from `backend/` |
| `cli.js` | copied from `cli/` |
| `public/` | Angular build output from `frontend/` |
| `.env` | `PUBLIC_DIR=./public` (tells the server to also serve the SPA) |
| `package.json` | `"start": "bun server.js"` — no `"type"` field so `cli.js` stays CommonJS |
| `Dockerfile` | `FROM oven/bun:1-alpine` + `CMD bun server.js` |
| `.dockerignore` | excludes `node_modules`, `.git`, `*.md` |
| `railway.json` | selects the Dockerfile builder for one-click Railway deploys |

### Running the build script

```bash
# Assemble locally (commits inside bundle/ and bumps pointers in superproject,
# but does NOT push anything):
node scripts/build-bundle.mjs

# Assemble AND push bundle branch + main:
node scripts/build-bundle.mjs --push
```

The script is a **safe no-op** when nothing changed — it checks the staged diff
before every `git commit` and skips if the tree is clean.

### Running the bundle directly

```bash
cd bundle
bun start           # serves API on :3000 AND static SPA from ./public
```

Or with Docker:

```bash
cd bundle
docker build -t snip .
docker run -p 3000:3000 snip
```
