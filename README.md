# Snip — Backend

Tiny URL shortener server built with [Bun](https://bun.sh).  
Zero npm dependencies. Links are stored in memory (ephemeral on restart).

## Prerequisites

[Bun](https://bun.sh) ≥ 1.0

## Quick start

```bash
bun start            # or: bun run server.js
```

## Environment variables

| Variable                | Default                              | Description                                               |
|-------------------------|--------------------------------------|-----------------------------------------------------------|
| `PORT`                  | `3000`                               | TCP port the server listens on                            |
| `BASE_URL`              | see below                            | Origin prefix used in `shortUrl` values                   |
| `RAILWAY_PUBLIC_DOMAIN` | —                                    | Injected automatically by Railway; used as BASE_URL fallback |
| `PUBLIC_DIR`            | —                                    | When set, also serves static files from this directory    |

`BASE_URL` resolution order: `BASE_URL` env → `https://$RAILWAY_PUBLIC_DOMAIN` → `http://localhost:PORT`

When `PUBLIC_DIR` is set, `GET /` returns `index.html` and any existing file
takes priority over a short code with the same name.

## API

### Shorten a URL

```
POST /api/links
Content-Type: application/json

{ "url": "https://example.com/some/long/path" }
```

**201**
```json
{
  "code": "aB3xYz",
  "url": "https://example.com/some/long/path",
  "shortUrl": "http://localhost:3000/aB3xYz",
  "hits": 0,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

Returns **400** on invalid JSON or a non-http(s) URL.

### List all links

```
GET /api/links
```

**200** — array of link objects (same shape as above).

### Follow a short link

```
GET /:code
```

**302** → original URL (increments `hits`).  
**404** if the code is unknown.

## CORS

All origins are permitted; OPTIONS preflight requests are handled automatically.
