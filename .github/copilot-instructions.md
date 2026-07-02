# Snip — AI Assistant Rules (.github/copilot-instructions.md)

> **Sync rule:** `.github/copilot-instructions.md` and `CLAUDE.md` (repo root) are
> mirrors of each other. Edit **both** files whenever either changes.

---

## What this repo is

One Git repo, **five orphan branches**, each owning exactly one layer.
`main` is a superproject: it holds the build script, CI workflows, and the top-level
README; it wires the other four branches as Git submodules with no shared history.

## Layout & tech stack

| Submodule | Branch | Runtime | Role |
|-----------|--------|---------|------|
| `backend/` | `backend` | Bun ≥ 1, **zero npm deps** | HTTP server; in-memory `Map` link store |
| `frontend/` | `frontend` | Angular 19, Signals, HttpClient | Browser SPA — calls backend at `:3000` |
| `cli/` | `cli` | Node ≥ 18, **CommonJS**, global `fetch` | `add` / `ls` / `open` terminal commands |
| `bundle/` | `bundle` | **generated — never hand-edit** | server.js + cli.js + public/ + Dockerfile |
| _(superproject)_ | `main` | Node ≥ 18 | `scripts/build-bundle.mjs`, `.github/workflows/` |

## API contract

**Change everywhere or nowhere** — `backend/server.js`, `frontend/src/app/link.service.ts`,
and `cli/cli.js` must always agree.

| Method | Path | Body | Success | Error |
|--------|------|------|---------|-------|
| `POST` | `/api/links` | `{ "url": "https://…" }` | `201 { code, url, shortUrl, hits, createdAt }` | `400` |
| `GET` | `/api/links` | — | `200` array of link objects | — |
| `GET` | `/:code` | — | `302 → original URL` (hits++) | `404` |

CORS is fully open (`*`); `OPTIONS` preflight → `204`.

## Key commands

```bash
# Backend (requires Bun)
cd backend && bun start                           # default PORT=3000

# Frontend
cd frontend && npm install && npx ng serve        # :4200; API calls go to :3000

# CLI
cd cli && node cli.js add https://example.com
cd cli && node cli.js ls
cd cli && SNIP_API=http://localhost:3001 node cli.js ls

# Bundle build (run from superproject root)
node scripts/build-bundle.mjs                     # assemble + local commits; no push
node scripts/build-bundle.mjs --push             # assemble + commit + push bundle + main
```

## Edit → push → pointer-bump

1. Edit inside a submodule dir (`backend/`, `frontend/`, or `cli/`).
2. `git commit` + `git push origin <branch>` **inside** that submodule.
3. Back in the superproject root:
   ```bash
   git submodule update --remote <path>
   git add <path>
   git commit -m "chore: bump <path> to $(git -C <path> rev-parse --short HEAD)"
   git push origin main
   ```
4. The hourly `bundle.yml` CI picks up the change, rebuilds, and pushes the bundle
   branch — which triggers `docker.yml` to publish a new container image.

## Rules — non-obvious traps

**❌ Never hand-edit `bundle/`.**  
`bundle/` is the output of `scripts/build-bundle.mjs`. Every run wipes and regenerates
`public/`, `server.js`, `cli.js`, and the config files. Manual edits are silently
overwritten. Edit the source branch and rerun the script.

**❌ No `"type": "module"` anywhere near `cli/` or `bundle/`.**  
`cli.js` uses CommonJS (`require()`). `bundle/package.json` has **no** `"type"` field
deliberately so that `node cli.js` keeps working under plain Node.js inside the Docker
container. Adding `"type": "module"` to either package.json breaks the CLI at runtime.

**⚠️ The Angular output path `dist/snip-frontend/browser/` is load-bearing.**  
`build-bundle.mjs` copies that exact path to `bundle/public/` and hard-fails with a
non-zero exit if `index.html` is missing. Do not rename the Angular project
(`snip-frontend`) or change `outputPath` in `angular.json`.

**⚠️ Storage is intentionally ephemeral (in-memory `Map`).**  
`backend/server.js` stores all links in a `Map`. Data is lost on every restart.
This is by design — it is a minimal demo. Do not add persistence without also
updating the API contract, the CLI, and the README.

**⚠️ `bundle.yml` has no `push:` trigger — this is intentional.**  
GitHub executes a workflow from the file on the branch that *received* the push.
`bundle.yml` only exists on `main`; a push to `backend`, `frontend`, or `cli` would
never trigger it. The hourly `schedule:` cron polls those branches instead. See the
comment block at the top of `.github/workflows/bundle.yml` for the full explanation.

**⚠️ `docker.yml`'s `paths: [bundle]` watches the gitlink, not directory contents.**  
`bundle` in the superproject index is a single gitlink entry (mode `160000`), not a
directory tree. The `paths` filter fires when the submodule **pointer** is bumped by a
new bundle build — not when files inside `bundle/` change on the bundle branch.
