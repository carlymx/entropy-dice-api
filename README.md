# EntropyDice 🎲

![Web screenshot](./assets/captures/web001.png)

**True random dice for role-playing games. Cryptographically secure.**

REST API that generates real random numbers using the kernel's CSPRNG
(`/dev/urandom`) for D4, D6, D8, D10, D12, D20, and D100 dice. Supports
compound expressions like `4D6+D12`, `(2D6+3)*2` and modifiers like `2D8+1D20-4`.

> 📖 **Español:** [README_ES.md](README_ES.md)

---

## Quick start

```bash
npm install
npm start
# → EntropyDice API v0.8.5 en http://localhost:3000
```
## Usage

```bash
# Single die
curl "http://localhost:3000/roll?q=D6"

# Multiple dice
curl "http://localhost:3000/roll?q=4D6%2BD12"

# With modifier
curl "http://localhost:3000/roll?q=2D8%2B1D20-4"

# Percentile
curl "http://localhost:3000/roll?q=D100"

# Multiplication and division
curl "http://localhost:3000/roll?q=D6*2"
curl "http://localhost:3000/roll?q=D20%2F2"

# Complex expressions with parentheses
curl "http://localhost:3000/roll?q=%282D6%2B3%29*2"

# Plain text response
curl "http://localhost:3000/roll?q=4D6&format=text"

# Just the number
curl "http://localhost:3000/roll?q=4D6&format=raw"

# Hybrid source (Xoshiro128++ with 1h reseed)
curl "http://localhost:3000/roll?q=D20&source=crypto-xoshiro-ng"
```

**URL encoding:** `+` → `%2B`, `*` → `%2A`, `/` → `%2F`, `(` → `%28`, `)` → `%29`.

---

## API

| Endpoint | Parameters | Description |
|----------|-----------|-------------|
| `GET /` | — | API info and health check |
| `GET /roll` | `q`, `source`, `format` | Roll dice |

### Parameters

| Param | Default | Values |
|-------|---------|--------|
| `q` | — | Dice expression (required) |
| `source` | `crypto-pure` | `crypto-pure`, `crypto-xoshiro-ng` |
| `format` | `json` | `json`, `text`, `html`, `raw` |

### Valid dice

`D4`, `D6`, `D8`, `D10`, `D12`, `D20`, `D100`

### Response formats

| Format | Content-Type | Example |
|--------|-------------|---------|
| `json` | `application/json` | `{"total": 15, "detail": "[5+3]+[7]", ...}` |
| `text` | `text/plain` | `[5+3]+[7] = 15` |
| `html` | `text/html` | Styled HTML page |
| `raw` | `text/plain` | `15` |

### Sources

| Source | Description |
|--------|-------------|
| `crypto-pure` | Kernel CSPRNG — true entropy, stateless, unbiased |
| `crypto-xoshiro-ng` | 128-bit crypto seed → Xoshiro128++ with automatic reseed every hour |

---

## Full documentation

See the complete interactive documentation at:

👉 **https://entropydice.onrender.com/help/en.html**  *(when deployed)*

Or open `public/help/en.html` locally.

---

## Deployment (Render)

1. Create a **Web Service** on [render.com](https://render.com)
2. Connect your repository
3. Set:
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Plan:** Free
4. Optional env vars:
    - `RESEED_INTERVAL_MS=3600000`
    - `DEFAULT_SOURCE=crypto-pure`
    - `RATE_LIMIT_MAX=120`
    - `RATE_LIMIT_DAILY=7200`
    - `BANNED_IPS=1.2.3.4,5.6.7.8` (manual bans)

---

## License

[![GPLv3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0.html)

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

See the [GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0.html) for details.

---

## Changelog

### v0.8.5 — 2026-07-04
- **Bilingual frontend**: EN/ES toggle button on the API tester with full i18n,
  browser language detection, and localStorage persistence
- **Help icon**: `?` button next to the language switcher opens the docs in the
  current language
- **LICENSE file**: GPL-3.0 added to repository

See [CHANGELOG.md](CHANGELOG.md) for full history.
