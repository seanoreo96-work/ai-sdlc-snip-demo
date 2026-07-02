# Snip Design System

Borrowed visual language: dark minimal, near-black background with a warm
coral/pink/orange radial glow behind the hero; large pill chat-input as the
absolute hero centerpiece; generously rounded cards on subtle borders; clean
sans-serif type; generous breathing room.

---

## Color Tokens

| Token | Value | Role |
|---|---|---|
| `--bg` | `#09090e` | Page background |
| `--surface` | `#111119` | Card / table fill |
| `--surface-elevated` | `#16161f` | Input pill fill |
| `--border` | `rgba(255,255,255,.07)` | Card borders, row dividers |
| `--border-strong` | `rgba(255,255,255,.14)` | Input border, column-header rule |
| `--text` | `#f2f2f5` | Primary text |
| `--text-muted` | `rgba(242,242,245,.45)` | Tagline, labels, placeholder, empty state |
| `--text-link` | `#f472b6` | Hyperlinks |
| `--success-bg` | `rgba(16,185,129,.08)` | Success banner fill |
| `--success-border` | `rgba(16,185,129,.25)` | Success banner border |
| `--success-text` | `#6ee7b7` | Success banner text |
| `--error-bg` | `rgba(239,68,68,.08)` | Error banner fill |
| `--error-border` | `rgba(239,68,68,.25)` | Error banner border |
| `--error-text` | `#fca5a5` | Error banner text |

---

## Accent Gradient

```
--grad-from : #ff6b6b   (coral)
--grad-mid  : #e879a8   (pink)
--grad-to   : #fb923c   (orange)
--grad      : linear-gradient(90deg, var(--grad-from), var(--grad-mid), var(--grad-to))
```

Applied to: primary button background.

---

## Hero Glow

Warm radial gradient pinned to the very top of the page, applied as a second
`background-image` on `body` so it bleeds through the hero without extra markup:

```
radial-gradient(
  ellipse 90% 70% at 50% -15%,
  rgba(232,121,168,.22)  0%,
  rgba(251,146,60,.09)  50%,
  transparent           70%
)
background-size: 100% 80vh;  background-repeat: no-repeat;
```

---

## Typography

```
--font: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
```

| Scale | Size | Weight | Notes |
|---|---|---|---|
| Hero heading | `clamp(3rem, 8vw, 4.5rem)` | 800 | −0.04 em tracking; white→transparent gradient clip |
| Tagline | `1.0625rem` | 400 | `--text-muted` |
| Section label | `0.6875rem` | 600 | Uppercase, 0.08 em tracking — card `h2` |
| Body / input | `0.9375rem` | 400 | Input text, banner text |
| Table body | `0.8125rem` | 400 | — |

---

## Spacing

| Use | Value |
|---|---|
| Hero top padding | `5rem` |
| Hero bottom padding | `3.5rem` |
| Space below `<header>` in hero | `2.5rem` |
| Card padding | `1.5rem` |
| Max content width | `760px` |
| Max input pill width | `640px` |

---

## Border Radius

| Token | Value | Applied to |
|---|---|---|
| `--r-sm` | `10px` | — |
| `--r-md` | `14px` | Banners |
| `--r-lg` | `20px` | Cards |
| `--r-pill` | `9999px` | Input pill container & button |

---

## Borders · Shadows · Glow

```
--shadow-card : 0 0 0 1px var(--border), 0 8px 32px rgba(0,0,0,.5)
--glow-focus  : 0 0 0 3px rgba(232,121,168,.3)
```

- All cards use `--shadow-card`.
- Input pill adds `--glow-focus` + shifts `border-color → rgba(232,121,168,.5)` on `:focus-within`.

---

## Element → Token Mapping

| Snip element | Design role | Key styling |
|---|---|---|
| `<header> h1` | Hero headline | `clamp` size, weight 800, gradient text clip, −0.04 em tracking |
| `.tagline` | Hero subline | `--text-muted`, `1.0625rem` |
| `.hero` | Hero wrapper | `text-align: center`, `padding: 5rem 0 3.5rem`; sits above body glow |
| `.input-pill` | Chat-style URL input | `--r-pill` container; `--surface-elevated` fill; gradient button; `--glow-focus` on focus |
| `.banner.success` | Shortened-link result | `--success-*` tokens, `--r-md` |
| `.banner.error` | Validation / API error | `--error-*` tokens, `--r-md` |
| `.card` | Links history card | `--surface`, `--r-lg`, `--shadow-card` |
| `table th` | Column headers | `0.6875rem` uppercase micro-label, `--text-muted` |
| `td a` | Short-code / URL links | `--text-link` (#f472b6 pink) |
