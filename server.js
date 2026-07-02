// ─── Config ──────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? "3000", 10);
const BASE_URL =
  process.env.BASE_URL ??
  (process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : `http://localhost:${PORT}`);
const PUBLIC_DIR = process.env.PUBLIC_DIR
  ? process.env.PUBLIC_DIR.replace(/\/$/, "")
  : null;

// ─── In-memory store ─────────────────────────────────────────────────────────
const links = new Map(); // code → { code, url, shortUrl, hits, createdAt }

// ─── Helpers ─────────────────────────────────────────────────────────────────
const BASE62 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function generateCode() {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += BASE62[Math.floor(Math.random() * 62)];
  }
  return code;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// Serve a file from PUBLIC_DIR.
// pathname is already URL-normalised by the URL parser — no ".." traversal possible.
async function tryStatic(pathname) {
  const rel = pathname === "/" ? "index.html" : pathname.replace(/^\//, "");
  const file = Bun.file(`${PUBLIC_DIR}/${rel}`);
  if (await file.exists()) {
    return new Response(file, { headers: CORS });
  }
  return null;
}

// ─── Server ───────────────────────────────────────────────────────────────────
Bun.serve({
  port: PORT,

  async fetch(req) {
    const { pathname } = new URL(req.url);
    const method = req.method;

    // CORS preflight
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    // POST /api/links — shorten a URL
    if (method === "POST" && pathname === "/api/links") {
      let body;
      try {
        body = await req.json();
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }

      const raw = body?.url;
      if (typeof raw !== "string" || !raw) {
        return json({ error: '"url" is required and must be a string' }, 400);
      }

      let parsed;
      try {
        parsed = new URL(raw);
      } catch {
        return json({ error: "Invalid URL" }, 400);
      }
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return json({ error: "Only http(s) URLs are allowed" }, 400);
      }

      // Guarantee uniqueness (collisions are astronomically rare, but handle them)
      let code;
      do {
        code = generateCode();
      } while (links.has(code));

      const link = {
        code,
        url: raw,
        shortUrl: `${BASE_URL}/${code}`,
        hits: 0,
        createdAt: new Date().toISOString(),
      };
      links.set(code, link);
      return json(link, 201);
    }

    // GET /api/links — list all links
    if (method === "GET" && pathname === "/api/links") {
      return json([...links.values()]);
    }

    // GET /:code — static file (wins) or short-code redirect
    if (method === "GET") {
      // 1. An existing static file always wins over a same-named short code
      if (PUBLIC_DIR) {
        const staticResp = await tryStatic(pathname);
        if (staticResp) return staticResp;
      }

      // 2. Short-code redirect — single path segment only
      const code = pathname.slice(1); // strip leading /
      if (code && !code.includes("/")) {
        const link = links.get(code);
        if (link) {
          link.hits++;
          return new Response(null, {
            status: 302,
            headers: { ...CORS, Location: link.url },
          });
        }
      }

      return json({ error: "Not found" }, 404);
    }

    return json({ error: "Not found" }, 404);
  },
});

console.log(`Snip listening on port ${PORT}`);
console.log(`BASE_URL : ${BASE_URL}`);
if (PUBLIC_DIR) console.log(`Static   : ${PUBLIC_DIR}`);
