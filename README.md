# Snip CLI

Zero-dependency Node.js CLI for the [Snip](https://github.com/seanoreo96-work/ai-sdlc-snip-demo)
URL shortener. Requires Node.js ≥ 18 (uses the built-in `fetch` global).

## Install

```bash
# Global install via npm (creates the snip bin automatically)
npm install -g .

# Manual: copy cli.js + one wrapper into a directory on your PATH
#   Unix/macOS  →  snip        (chmod +x snip first)
#   Windows CMD →  snip.cmd
#   PowerShell  →  snip.ps1
```

## Commands

```
snip add <url>    Shorten a URL and print the short link
snip ls           List all shortened links
snip open <code>  Open a short link in the OS browser
```

## Environment

| Variable | Default | Description |
|---|---|---|
| `SNIP_API` | `http://localhost:3000` | Backend base URL |

## Examples

```bash
$ snip add https://example.com/very/long/path
http://localhost:3000/aB3xYz

$ snip ls
CODE    HITS  URL
------  ----  ---
aB3xYz  3     https://example.com/very/long/path

$ snip open aB3xYz
Opening: https://example.com/very/long/path
```

Errors (bad input, unknown code, unreachable backend) are printed to **stderr**
and exit with code 1.
