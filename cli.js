#!/usr/bin/env node
'use strict';

const BASE = (process.env.SNIP_API || 'http://localhost:3000').replace(/\/+$/, '');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function die(msg) {
  process.stderr.write(`Error: ${msg}\n`);
  process.exit(1);
}

/** JSON fetch — dies on network error or non-2xx response. */
async function apiFetch(path, init) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, init);
  } catch (e) {
    die(`Cannot reach ${BASE} — ${e.message}`);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) die(body.error || `HTTP ${res.status}`);
  return body;
}

/**
 * GET <shortUrl> without following the redirect — equivalent to
 * fetch(url, { redirect: 'manual' }) but uses the built-in http/https
 * module so the Location header is reliably accessible.
 * Returns the Location value, or null if none.
 */
function resolveRedirect(shortUrl) {
  return new Promise((resolve, reject) => {
    const mod = shortUrl.startsWith('https') ? require('https') : require('http');
    mod.get(shortUrl, (res) => {
      res.resume();                              // discard body
      resolve(res.headers.location ?? null);
    }).once('error', reject);
  });
}

/** Open url in the default OS browser (best-effort). */
function openBrowser(url) {
  const cp = require('child_process');
  const p  = process.platform;
  try {
    if (p === 'win32')       cp.execSync(`start "" "${url}"`, { stdio: 'ignore', shell: true });
    else if (p === 'darwin') cp.execFileSync('open',      [url], { stdio: 'ignore' });
    else                     cp.execFileSync('xdg-open',  [url], { stdio: 'ignore' });
  } catch { /* best-effort */ }
}

/** Right-pad value to width n. */
const col = (v, n) => String(v).padEnd(n);

/** Print an aligned CODE / HITS / URL table. */
function printTable(links) {
  if (!links.length) { console.log('No links yet.'); return; }
  const cW = Math.max(4, ...links.map(l => l.code.length));
  const hW = Math.max(4, ...links.map(l => String(l.hits).length));
  console.log(`${col('CODE', cW)}  ${col('HITS', hW)}  URL`);
  console.log(`${'-'.repeat(cW)}  ${'-'.repeat(hW)}  ---`);
  for (const l of links) {
    console.log(`${col(l.code, cW)}  ${col(l.hits, hW)}  ${l.url}`);
  }
}

// ─── Commands ─────────────────────────────────────────────────────────────────

async function cmdAdd([url]) {
  if (!url) die('"add" requires a URL argument.\n\nUsage: snip add <url>');
  const link = await apiFetch('/api/links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  console.log(link.shortUrl);
}

async function cmdLs() {
  const links = await apiFetch('/api/links');
  printTable(links);
}

async function cmdOpen([code]) {
  if (!code) die('"open" requires a code argument.\n\nUsage: snip open <code>');
  let location;
  try {
    location = await resolveRedirect(`${BASE}/${code}`);
  } catch (e) {
    die(`Cannot reach ${BASE} — ${e.message}`);
  }
  if (!location) die(`Unknown short code: "${code}"`);
  openBrowser(location);
  console.log(`Opening: ${location}`);
}

// ─── Entry point ──────────────────────────────────────────────────────────────

const USAGE = `\
Usage: snip <command> [args]

Commands:
  add <url>    Shorten a URL and print the short link
  ls           List all shortened links
  open <code>  Open a short link in the OS browser

Environment:
  SNIP_API     Backend base URL (default: http://localhost:3000)`;

const [,, cmd, ...args] = process.argv;

(async () => {
  switch (cmd) {
    case 'add':    await cmdAdd(args);  break;
    case 'ls':     await cmdLs();       break;
    case 'open':   await cmdOpen(args); break;
    default:       console.log(USAGE);
  }
})().catch((err) => {
  process.stderr.write(`Error: ${err.message}\n`);
  process.exit(1);
});
