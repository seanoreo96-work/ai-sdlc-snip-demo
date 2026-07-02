#!/usr/bin/env node
// scripts/build-bundle.mjs
//
// Assembles the Snip deployment bundle from the three project submodules.
//
// Usage:  node scripts/build-bundle.mjs [--push]
//
// What it does:
//   1. Updates backend / frontend / cli submodules to their remote branch tips.
//   2. npm install + ng build in frontend/.
//   3. Assembles bundle/ with server.js, cli.js, public/ (Angular SPA),
//      .env, package.json, Dockerfile, .dockerignore, railway.json.
//   4. Commits inside bundle/ (guarded – skips when nothing changed).
//   5. Bumps the superproject's submodule pointers (also guarded).
//   --push  additionally pushes bundle branch + main to origin.
//
// Requirements: Node >= 18, npm, bun (for runtime – not needed to run this script)
// Zero npm dependencies – uses only Node built-ins.

import { execSync, spawnSync } from 'node:child_process';
import {
  existsSync, mkdirSync, rmSync,
  copyFileSync, writeFileSync, readdirSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PUSH = process.argv.includes('--push');

// scripts/ lives one level below the superproject root
const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');

const dirs = {
  backend:  join(root, 'backend'),
  frontend: join(root, 'frontend'),
  cli:      join(root, 'cli'),
  bundle:   join(root, 'bundle'),
};
const frontendBuildDir = join(dirs.frontend, 'dist', 'snip-frontend', 'browser');

// ─── helpers ──────────────────────────────────────────────────────────────────

function sh(cmd, cwd = root) {
  console.log(`\n  $ ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit', shell: true });
}

/** Run cmd, return trimmed stdout (never throws). */
function capture(cmd, cwd = root) {
  return spawnSync(cmd, { cwd, shell: true, encoding: 'utf8' }).stdout.trim();
}

/** Recursively copy the contents of src into dest. */
function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const e of readdirSync(src, { withFileTypes: true })) {
    const s = join(src, e.name), d = join(dest, e.name);
    e.isDirectory() ? copyDir(s, d) : copyFileSync(s, d);
  }
}

// ─── 1 / 5  Update source submodules ─────────────────────────────────────────
console.log('\n━━ 1/5  Update submodules ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
sh('git submodule update --init --remote backend frontend cli');

// ─── 2 / 5  Build the Angular frontend ────────────────────────────────────────
console.log('\n━━ 2/5  Build frontend ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
sh('npm install --prefer-offline', dirs.frontend);
sh('npx ng build',                 dirs.frontend);

const indexHtml = join(frontendBuildDir, 'index.html');
if (!existsSync(indexHtml)) {
  console.error(`\nFATAL: ${indexHtml} not found – ng build did not produce output.`);
  process.exit(1);
}
console.log(`\n  ✓  ${indexHtml}`);

// ─── 3 / 5  Assemble bundle/ ──────────────────────────────────────────────────
console.log('\n━━ 3/5  Assemble bundle/ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// server.js  +  cli.js  (straight copies)
copyFileSync(join(dirs.backend, 'server.js'), join(dirs.bundle, 'server.js'));
copyFileSync(join(dirs.cli,     'cli.js'),    join(dirs.bundle, 'cli.js'));
console.log('  ✓  server.js  cli.js');

// public/  — wipe and replace so stale build assets never accumulate
const publicDir = join(dirs.bundle, 'public');
if (existsSync(publicDir)) rmSync(publicDir, { recursive: true, force: true });
copyDir(frontendBuildDir, publicDir);
console.log(`  ✓  public/  (${readdirSync(publicDir).length} top-level entries)`);

// .env  — Bun auto-loads this; switches server.js into "also serve the SPA" mode
writeFileSync(join(dirs.bundle, '.env'), 'PUBLIC_DIR=./public\n');

// package.json  — NO "type" field so cli.js remains valid CommonJS under node
writeFileSync(join(dirs.bundle, 'package.json'), JSON.stringify({
  name:        'snip-bundle',
  version:     '1.0.0',
  description: 'Snip assembled deployment bundle — generated, do not edit',
  scripts:     { start: 'bun server.js' },
}, null, 2) + '\n');

// Dockerfile
writeFileSync(join(dirs.bundle, 'Dockerfile'), [
  'FROM oven/bun:1-alpine',
  'WORKDIR /app',
  'COPY . .',
  'ENV PORT=3000',
  'EXPOSE 3000',
  'CMD bun server.js',
  '',
].join('\n'));

// .dockerignore
writeFileSync(join(dirs.bundle, '.dockerignore'), [
  'node_modules',
  '.git',
  '*.md',
  '',
].join('\n'));

// railway.json  — selects Dockerfile builder so Railway uses Docker, not Nixpacks
writeFileSync(join(dirs.bundle, 'railway.json'), JSON.stringify({
  $schema: 'https://railway.app/railway.schema.json',
  build:   { builder: 'DOCKERFILE', dockerfilePath: 'Dockerfile' },
}, null, 2) + '\n');

console.log('  ✓  .env  package.json  Dockerfile  .dockerignore  railway.json');

// ─── 4 / 5  Commit inside bundle/ ────────────────────────────────────────────
console.log('\n━━ 4/5  Commit bundle/ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
sh('git add -A', dirs.bundle);
const bundleStat = capture('git diff --cached --stat', dirs.bundle);

if (bundleStat) {
  sh('git commit -m "build: assemble bundle output"', dirs.bundle);
  console.log('  ✓  bundle/ committed');
} else {
  console.log('  bundle/: nothing to commit — skipping');
}

if (PUSH) {
  // Detached-HEAD checkout → push current HEAD explicitly to the bundle branch
  sh('git push origin HEAD:bundle', dirs.bundle);
  console.log('  ✓  bundle branch pushed');
}

// ─── 5 / 5  Bump superproject pointers ───────────────────────────────────────
console.log('\n━━ 5/5  Bump superproject pointers ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Stage every submodule whose pinned commit changed (bundle + any updated source)
sh('git add bundle backend frontend cli');
const rootStat = capture('git diff --cached --stat');

if (rootStat) {
  sh('git commit -m "chore: bump submodule pointers (bundle + source branches)"');
  console.log('  ✓  superproject committed');
} else {
  console.log('  superproject: nothing to commit — skipping');
}

if (PUSH) {
  sh('git push origin main');
  console.log('  ✓  main pushed');
}

console.log('\n✓  build-bundle.mjs complete.\n');
