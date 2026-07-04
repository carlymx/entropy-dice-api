# EntropyDice — API Implementation Guide

> **Version:** v0.8.5 &nbsp;|&nbsp; **License:** GPL-3.0-only &nbsp;|&nbsp; **Author:** carlymx
>
> Complete reference for human developers and AI agents integrating the EntropyDice REST API
> into scripts, programs, websites, and bots.

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start (curl)](#quick-start-curl)
3. [API Reference](#api-reference)
   - [GET /](#get-)
   - [GET /roll](#get-roll)
4. [Dice Expression Syntax](#dice-expression-syntax)
   - [Grammar](#grammar)
   - [Valid Dice](#valid-dice)
   - [Valid Operators](#valid-operators)
   - [URL Encoding](#url-encoding)
5. [Response Formats](#response-formats)
   - [JSON](#json)
   - [Text](#text)
   - [HTML](#html)
   - [Raw](#raw)
6. [Randomness Sources](#randomness-sources)
7. [Error Handling](#error-handling)
8. [Rate Limits & Headers](#rate-limits--headers)
9. [Implementation Examples](#implementation-examples)
   - [Bash / Shell Script](#bash--shell-script)
   - [Python](#python)
   - [JavaScript (Browser)](#javascript-browser)
   - [JavaScript (Node.js)](#javascript-nodejs)
   - [TypeScript](#typescript)
   - [Kotlin / Android](#kotlin--android)
   - [Swift / iOS](#swift--ios)
   - [C# / .NET](#c--net)
   - [Rust](#rust)
   - [Go](#go)
   - [PHP](#php)
   - [Ruby](#ruby)
   - [Lua](#lua)
   - [Telegram Bot (Python)](#telegram-bot-python)
   - [Discord Bot (JavaScript)](#discord-bot-javascript)
   - [Web Page (HTML + JS)](#web-page-html--js)
10. [Rate-Limit-Aware Client Design](#rate-limit-aware-client-design)
11. [Best Practices](#best-practices)
12. [Self-Hosting](#self-hosting)
13. [Reference Tables](#reference-tables)

---

## Overview

**EntropyDice** is a REST API that generates cryptographically secure random numbers
for role-playing game dice. It uses the Linux kernel's CSPRNG (`/dev/urandom`) via
Node.js `crypto.randomInt()`, providing true hardware entropy — no seeds, no state,
no deterministic sequences.

| Property | Value |
|----------|-------|
| Protocol | HTTP/1.1 |
| Method | `GET` only (no POST, no authentication) |
| Base URL (hosted) | `https://entropydice.onrender.com` |
| Base URL (local) | `http://localhost:3000` |
| Response content types | `application/json`, `text/plain`, `text/html` |
| Supported dice | D4, D6, D8, D10, D12, D20, D100 |
| Supported operators | `+`, `-`, `*`, `/`, `( )` |

---

## Quick Start (curl)

```bash
# Roll a single D20
curl "https://entropydice.onrender.com/roll?q=D20"

# Roll 4d6 + 1d12, human-readable text
curl "https://entropydice.onrender.com/roll?q=4D6%2BD12&format=text"

# Roll 2d8 + 1d20 - 4, raw number only
curl "https://entropydice.onrender.com/roll?q=2D8%2B1D20-4&format=raw"
```

---

## API Reference

### GET /

Returns API metadata and a health check.

**Request:**
```
GET /
```

**Response example (JSON):**
```json
{
  "service": "EntropyDice API",
  "version": "v0.8.5",
  "endpoints": {
    "roll": {
      "method": "GET",
      "path": "/roll",
      "params": {
        "q": "Dice expression (e.g. D6, 4D6+D12, 2D8+1D20-4, D6*2, (2D6+3)*2)",
        "source": "Randomness source (default: crypto-pure)",
        "format": "Response format: json (default), text, html, raw"
      },
      "validDice": "D4, D6, D8, D10, D12, D20, D100",
      "validOperators": "+, -, *, / and parentheses ()",
      "validSources": ["crypto-pure", "crypto-xoshiro-ng"]
    }
  }
}
```

### GET /roll

The main endpoint. Rolls dice according to the expression in the `q` parameter.

**Endpoint:**
```
GET /roll?q=<expression>[&source=<source>][&format=<format>]
```

#### Parameters

| Parameter | Required | Default | Values | Description |
|-----------|----------|---------|--------|-------------|
| `q` | **Yes** | — | Dice expression string | The dice expression to evaluate |
| `source` | No | `crypto-pure` | `crypto-pure`, `crypto-xoshiro-ng` | Randomness source for die rolls |
| `format` | No | `json` | `json`, `text`, `html`, `raw` | Output format |

---

## Dice Expression Syntax

### Grammar

```
expr    → term (('+' | '-') term)*
term    → factor (('*' | '/') factor)*
factor  → dice | number | '(' expr ')'
dice    → ('D' | 'd') number             (implicit 1Dn)
        | number ('D' | 'd') number
number  → \d+
```

Operators follow standard mathematical precedence: `*` and `/` bind tighter than `+` and `-`. Parentheses override precedence.

### Valid Dice

| Die | Sides | Common RPG Use |
|-----|-------|----------------|
| D4 | 4 | Small weapon damage, caltrops |
| D6 | 6 | Standard damage, ability scores |
| D8 | 8 | Medium weapon damage |
| D10 | 10 | Polearm damage, percentile pairs |
| D12 | 12 | Greataxe damage |
| D20 | 20 | Attack rolls, ability checks, saving throws |
| D100 | 100 | Percentile dice, loot tables |

### Valid Operators

| Operator | Meaning | Precedence | Example | Notes |
|----------|---------|------------|---------|-------|
| `+` | Addition | Low (1) | `D6+3` | |
| `-` | Subtraction | Low (1) | `D20-4` | |
| `*` | Multiplication | High (2) | `D6*2` | Result is a number, not a die |
| `/` | Division | High (2) | `D20/2` | Rounded to 2 decimal places |
| `( )` | Grouping | Highest | `(2D6+3)*2` | Nesting supported |

#### Expression Examples

| Expression | Meaning |
|------------|---------|
| `D6` | One six-sided die |
| `4D6` | Four six-sided dice |
| `D20` | One twenty-sided die |
| `2D20` | Two twenty-sided dice (not advantage — see [Planned Features](#planned-features)) |
| `4D6+D12` | 4d6 plus 1d12 |
| `2D8+1D20-4` | 2d8 + 1d20, subtract 4 |
| `D6-D4` | 1d6 minus 1d4 |
| `D6+3` | 1d6 plus 3 (modifier) |
| `D6*2` | 1d6 times 2 |
| `D20/2` | Half the result of 1d20 |
| `(2D6+3)*2` | Roll 2d6, add 3, multiply by 2 |
| `2*(D4+D6)` | Add 1d4 + 1d6, then multiply by 2 |

**Restrictions:**
- Only D4, D6, D8, D10, D12, D20, and D100 are accepted as die face counts.
- Expression must not be empty.
- Division by zero returns a 400 error.
- Negative die counts (e.g., `-2D6`) are syntactically valid but unusual.

### URL Encoding

The `+`, `*`, `/`, and `(` `)` characters have special meaning in URLs. Always encode them:

| Character | URL-encoded |
|-----------|-------------|
| `+` | `%2B` |
| `*` | `%2A` |
| `/` | `%2F` |
| `(` | `%28` |
| `)` | `%29` |
| Space | `%20` |

**Examples:**
```
4D6+D12             →  ?q=4D6%2BD12
(2D6+3)*2           →  ?q=%282D6%2B3%29%2A2
2D8+1D20-4          →  ?q=2D8%2B1D20-4
```

> **Note:** `-` and digits need no encoding. `D` and letters need no encoding.
> Most HTTP client libraries (Python `requests`, JS `fetch` with `URLSearchParams`,
> Go `url.Values`) encode these automatically when you pass parameters as objects/dicts
> rather than building the query string manually.

---

## Response Formats

### JSON

Default format. Returns a full structured response with all roll details.

```
GET /roll?q=2D8+1D20-4
```

**Response (200 OK):**
```json
{
  "ok": true,
  "expression": "2D8+1D20-4",
  "normalized": "2D8+1D20-4",
  "source": "crypto-pure",
  "groups": [
    { "dice": "D8",  "count": 2, "rolls": [8, 8], "subtotal": 16 },
    { "dice": "D20", "count": 1, "rolls": [20],   "subtotal": 20 }
  ],
  "modifier": -4,
  "detail": "[8+8]+[20]-4",
  "total": 32,
  "timestamp": "2026-07-04T12:00:00.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `ok` | `boolean` | Always `true` on success |
| `expression` | `string` | The original expression as received |
| `normalized` | `string` | Normalized version (e.g., `D6+D12` → same, `d6` → `D6`) |
| `source` | `string` | Randomness source used (`crypto-pure` or `crypto-xoshiro-ng`) |
| `groups` | `array` | One object per die group in the expression |
| `groups[].dice` | `string` | Die type label (e.g., `"D6"`) |
| `groups[].count` | `number` | How many dice of this type (negative if subtracted) |
| `groups[].rolls` | `array` | Individual die results, `count` elements |
| `groups[].subtotal` | `number` | Sum of rolls × sign |
| `modifier` | `number` | Net constant modifier extracted from the expression |
| `detail` | `string` | Human-readable breakdown (e.g., `"[8+8]+[20]-4"`) |
| `total` | `number` | Final result (all groups + modifiers, rounded to 2 decimals) |
| `timestamp` | `string` | ISO 8601 timestamp of the roll |

### Text

Human-readable plain text. Ideal for terminal output.

```
GET /roll?q=2D8+1D20-4&format=text
Content-Type: text/plain

[8+8]+[20]-4 = 32
```

### HTML

Full styled HTML page with dark theme. Suitable for embedding in iframes or opening directly in a browser.

```
GET /roll?q=2D8+1D20-4&format=html
Content-Type: text/html

<!-- Returns a complete HTML document with dark-themed result card -->
```

### Raw

A single number as plain text — no formatting, no extra characters. Ideal for scripts that only need the final result.

```
GET /roll?q=2D8+1D20-4&format=raw
Content-Type: text/plain

32
```

**Use in scripts:**
```bash
RESULT=$(curl -s "https://entropydice.onrender.com/roll?q=D20&format=raw")
echo "You rolled a $RESULT"
```

---

## Randomness Sources

### `crypto-pure` (default)

Uses Node.js `crypto.randomInt()` which calls the kernel's CSPRNG (`getrandom()` →
`/dev/urandom`). True hardware entropy from CPU jitter, disk I/O timing, network
interrupts, and hardware RNGs.

- **Stateless** — every call is independent, no sequence
- **Unbiased** — uses rejection sampling to eliminate modulo bias
- **CSPRNG quality** — suitable for cryptographic and gaming purposes

**Use this when:** You need true, unpredictable randomness. This is the default and recommended choice for all use cases.

### `crypto-xoshiro-ng`

Hybrid source for high-throughput scenarios:

1. Seeded with 128 bits of true entropy (`crypto.randomBytes(16)`)
2. Internal PRNG: Xoshiro128++ algorithm (~200M numbers/sec)
3. Noise injection: each output XOR'd with microsecond-granularity timestamp
4. Auto-reseed: fresh 128-bit seed every hour (configurable via `RESEED_INTERVAL_MS`)

- **Faster** — avoids the kernel context switch per call (especially at very high throughput)
- **Still non-deterministic** — timestamp noise prevents pure-PRNG reproduction
- **Cryptographic seed** — seed comes from the same kernel CSPRNG as `crypto-pure`

**Use this when:** You're making thousands of rolls per second and every microsecond counts.

---

## Error Handling

All errors return a JSON body with `"ok": false` and an `"error"` field with a human-readable
message (in Spanish, as the server errors are currently localized).

| HTTP Status | Cause | Error message examples |
|-------------|-------|----------------------|
| `400 Bad Request` | Missing `q` parameter | `Falta el parámetro "q" con la expresión de dados` |
| `400 Bad Request` | Invalid die sides (e.g., D7) | `Caras no válidas: D7` |
| `400 Bad Request` | Invalid expression syntax | `Carácter inesperado: 'X'`, `Se esperaba un número` |
| `400 Bad Request` | Division by zero | `División por cero` |
| `400 Bad Request` | Invalid source name | `Fuente no válida: "foo". Válidas: crypto-pure, crypto-xoshiro-ng` |
| `403 Forbidden` | IP permanently banned | `IP bloqueada permanentemente` |
| `429 Too Many Requests` | Rate limit exceeded (burst) | `Demasiadas peticiones. Intenta de nuevo en 1 minuto.` |
| `429 Too Many Requests` | Rate limit exceeded (daily) | Daily limit message from rate limiter |
| `500 Internal Server Error` | Unexpected server error | Varies |

**Client-side error handling pattern (pseudocode):**

```
response = fetch(url)
if response.status == 200:
    data = parse_json(response.body)
    if data.ok:
        use(data.total, data.detail)
elif response.status == 429:
    wait_and_retry(response.headers["Retry-After"])
elif response.status == 403:
    log("IP is permanently banned, contact admin")
else:
    log_error(response.status, response.body)
```

---

## Rate Limits & Headers

The `/roll` endpoint enforces two-layer rate limiting per IP address.

### Burst Limit

| Setting | Default | Env var |
|---------|---------|---------|
| Window | 60 seconds | `RATE_LIMIT_WINDOW_MS` |
| Max requests | 120 | `RATE_LIMIT_MAX` |

Standard `X-RateLimit-*` headers are included:

| Response Header | Meaning |
|-----------------|---------|
| `X-RateLimit-Limit` | Max requests per window |
| `X-RateLimit-Remaining` | Requests left in the current window |
| `X-RateLimit-Reset` | Unix timestamp when the window resets |

### Daily Limit

| Setting | Default | Env var |
|---------|---------|---------|
| Per day | 7200 | `RATE_LIMIT_DAILY` |

| Response Header | Meaning |
|-----------------|---------|
| `X-RateLimit-Daily-Limit` | Max requests per day |
| `X-RateLimit-Daily-Remaining` | Requests remaining today |

### Ban System

- Each time an IP exceeds the daily limit → **1 strike**
- **3 consecutive strikes** → **permanent ban** (all requests return `403`)
- Strikes expire after **24 hours of good behaviour** (no further overflow)
- Manual bans via `BANNED_IPS` env var (comma-separated IPs)

### The `Retry-After` Header

When you receive a `429`, the response includes:
```
Retry-After: <seconds>
```

Use this to schedule your retry. Common approach:

```python
import time

response = requests.get(url)
if response.status_code == 429:
    retry_after = int(response.headers.get("Retry-After", 60))
    time.sleep(retry_after)
    response = requests.get(url)
```

---

## Implementation Examples

> Replace `https://entropydice.onrender.com` with `http://localhost:3000` if self-hosting.

### Bash / Shell Script

```bash
#!/usr/bin/env bash
# rolldice — Roll dice via EntropyDice API

API="https://entropydice.onrender.com"

roll() {
    local expr="${1:-D20}"
    local fmt="${2:-text}"

    case "$fmt" in
        raw|text|html|json) ;;
        *) echo "Invalid format: $fmt (use: json, text, html, raw)" >&2; return 1 ;;
    esac

    curl -s "${API}/roll?q=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$expr'))")&format=${fmt}"
}

# Usage:
roll "4D6+D12" text      # → [4+2+6+1]+[9] = 22
roll "D20" raw           # → 17
RESULT=$(roll "D20" raw) # capture in variable
echo "You rolled: $RESULT"
```

### Python

```python
"""
EntropyDice client for Python — zero dependencies beyond the stdlib.
"""
import json
import time
import urllib.request
import urllib.parse
from typing import Optional, Dict, Any, Literal


class EntropyDice:
    """Lightweight client for the EntropyDice REST API."""

    BASE_URL = "https://entropydice.onrender.com"

    def __init__(self, base_url: Optional[str] = None):
        self.base_url = (base_url or self.BASE_URL).rstrip("/")

    def roll(
        self,
        expression: str,
        source: Optional[Literal["crypto-pure", "crypto-xoshiro-ng"]] = None,
        fmt: Optional[Literal["json", "text", "html", "raw"]] = None,
        retries: int = 3,
    ) -> Any:
        """Roll dice. Returns dict for JSON, str for text/html/raw."""
        params = {"q": expression}
        if source:
            params["source"] = source
        if fmt:
            params["format"] = fmt

        url = f"{self.base_url}/roll?{urllib.parse.urlencode(params)}"

        for attempt in range(retries):
            try:
                with urllib.request.urlopen(url) as resp:
                    body = resp.read().decode("utf-8")

                if fmt in (None, "json"):
                    data = json.loads(body)
                    if data.get("ok"):
                        return data
                    raise DiceError(data.get("error", "Unknown error"))
                return body

            except urllib.error.HTTPError as e:
                if e.code == 429:
                    retry_after = int(e.headers.get("Retry-After", 60))
                    if attempt < retries - 1:
                        time.sleep(retry_after)
                        continue
                raise DiceError(f"HTTP {e.code}: {e.read().decode()}") from e

        raise DiceError(f"Failed after {retries} retries")


class DiceError(Exception):
    """EntropyDice API error."""
    pass


# ---- Quick usage ----
if __name__ == "__main__":
    dice = EntropyDice()

    # JSON (default)
    result = dice.roll("4D6+D12")
    print(f"  Detail: {result['detail']}")
    print(f"  Total:  {result['total']}")
    for g in result["groups"]:
        print(f"  {g['count']}{g['dice']}: {g['rolls']} = {g['subtotal']}")

    # Raw number
    total = dice.roll("2D8+1D20-4", fmt="raw")
    print(f"  Raw: {total}")

    # Text format
    text = dice.roll("D20", fmt="text")
    print(f"  Text: {text.strip()}")

    # Custom source
    result = dice.roll("2D20", source="crypto-xoshiro-ng")
    print(f"  With xoshiro: {result['total']}")
```

### JavaScript (Browser)

```javascript
/**
 * EntropyDice client for browser JavaScript.
 * Uses fetch() and URLSearchParams — no dependencies.
 */
class EntropyDice {
  constructor(baseUrl = "https://entropydice.onrender.com") {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  /**
   * Roll dice.
   * @param {string} expression — e.g. "4D6+D12"
   * @param {object} [options]
   * @param {"crypto-pure"|"crypto-xoshiro-ng"} [options.source]
   * @param {"json"|"text"|"html"|"raw"} [options.format]
   * @returns {Promise<object|string>}
   */
  async roll(expression, { source, format } = {}) {
    const params = new URLSearchParams({ q: expression });
    if (source) params.set("source", source);
    if (format) params.set("format", format);

    const url = `${this.baseUrl}/roll?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get("Retry-After") || "60", 10);
        throw new DiceError(`Rate limited — retry after ${retryAfter}s`, 429, retryAfter);
      }
      const body = await response.json().catch(() => ({}));
      throw new DiceError(body.error || `HTTP ${response.status}`, response.status);
    }

    if (format === "json" || !format) {
      const data = await response.json();
      if (!data.ok) throw new DiceError(data.error, 200);
      return data;
    }
    return response.text();
  }
}

class DiceError extends Error {
  constructor(message, status, retryAfter) {
    super(message);
    this.name = "DiceError";
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

// ---- Usage in the browser ----
const dice = new EntropyDice();

// With async/await
const button = document.getElementById("roll-btn");
button.addEventListener("click", async () => {
  try {
    const result = await dice.roll("4D6+D12");
    document.getElementById("output").textContent =
      `${result.detail} = ${result.total}`;
  } catch (err) {
    console.error(err.message);
  }
});

// With .then()
dice.roll("D20", { format: "raw" }).then(total => {
  console.log("You rolled:", total);
});
```

### JavaScript (Node.js)

```javascript
/**
 * EntropyDice client for Node.js.
 * No external dependencies — uses built-in https/http modules.
 */
const https = require("https");
const http = require("http");

class EntropyDice {
  constructor(baseUrl = "https://entropydice.onrender.com") {
    this.baseUrl = new URL(baseUrl);
  }

  roll(expression, { source, format } = {}) {
    const params = new URLSearchParams({ q: expression });
    if (source) params.set("source", source);
    if (format) params.set("format", format);

    const url = new URL(`/roll?${params}`, this.baseUrl);
    const transport = url.protocol === "https:" ? https : http;

    return new Promise((resolve, reject) => {
      transport.get(url, (res) => {
        let body = "";
        res.on("data", chunk => body += chunk);
        res.on("end", () => {
          if (res.statusCode !== 200) {
            if (res.statusCode === 429) {
              const retryAfter = parseInt(res.headers["retry-after"] || "60");
              return reject(Object.assign(
                new Error("Rate limited"), { status: 429, retryAfter }
              ));
            }
            return reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
          if (format === "json" || !format) {
            const data = JSON.parse(body);
            if (!data.ok) reject(new Error(data.error));
            else resolve(data);
          } else {
            resolve(body);
          }
        });
      }).on("error", reject);
    });
  }
}

// ---- Usage ----
const dice = new EntropyDice();

dice.roll("4D6+D12").then(result => {
  console.log(`${result.detail} = ${result.total}`);
});
```

### TypeScript

```typescript
type Source = "crypto-pure" | "crypto-xoshiro-ng";
type Format = "json" | "text" | "html" | "raw";
type DieFace = 4 | 6 | 8 | 10 | 12 | 20 | 100;

interface DieGroup {
  dice: `D${DieFace}`;
  count: number;
  rolls: number[];
  subtotal: number;
}

interface RollResult {
  ok: true;
  expression: string;
  normalized: string;
  source: Source;
  groups: DieGroup[];
  modifier: number;
  detail: string;
  total: number;
  timestamp: string;
}

interface RollError {
  ok: false;
  error: string;
}

interface RollOptions {
  source?: Source;
  format?: Format;
}

class EntropyDice {
  private baseUrl: string;

  constructor(baseUrl: string = "https://entropydice.onrender.com") {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async roll<T extends Format = "json">(
    expression: string,
    options?: RollOptions
  ): Promise<T extends "raw" | "text" | "html" ? string : RollResult> {
    const params = new URLSearchParams({ q: expression });
    if (options?.source) params.set("source", options.source);
    if (options?.format) params.set("format", options.format);

    const url = `${this.baseUrl}/roll?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error((body as RollError).error || `HTTP ${response.status}`);
    }

    if (options?.format && options.format !== "json") {
      return response.text() as any;
    }

    const data = await response.json() as RollResult | RollError;
    if (!data.ok) throw new Error((data as RollError).error);
    return data as any;
  }
}

// ---- Usage ----
async function main() {
  const dice = new EntropyDice();

  const result = await dice.roll("4D6+D12");
  // TypeScript now knows result is RollResult
  console.log(result.detail, "=", result.total);
}
```

### Kotlin / Android

```kotlin
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

data class DieGroup(
    val dice: String,
    val count: Int,
    val rolls: List<Int>,
    val subtotal: Int
)

data class RollResult(
    val expression: String,
    val normalized: String,
    val source: String,
    val groups: List<DieGroup>,
    val modifier: Int,
    val detail: String,
    val total: Double,
    val timestamp: String
)

class DiceError(message: String, val status: Int) : Exception(message)

class EntropyDice(
    private val baseUrl: String = "https://entropydice.onrender.com"
) {
    suspend fun roll(
        expression: String,
        source: String? = null,
        format: String? = null
    ): Any = withContext(Dispatchers.IO) {
        val params = mutableListOf("q" to URLEncoder.encode(expression, "UTF-8"))
        if (source != null) params.add("source" to source)
        if (format != null) params.add("format" to format)

        val queryString = params.joinToString("&") { "${it.first}=${it.second}" }
        val url = URL("$baseUrl/roll?$queryString")
        val conn = url.openConnection() as HttpURLConnection

        conn.requestMethod = "GET"
        conn.connectTimeout = 10000
        conn.readTimeout = 10000

        val status = conn.responseCode
        val body = if (status == 200)
            conn.inputStream.bufferedReader().readText()
        else
            conn.errorStream?.bufferedReader()?.readText() ?: ""

        when {
            status == 429 -> throw DiceError("Rate limited", status)
            status != 200 -> throw DiceError(
                try { JSONObject(body).optString("error", "HTTP $status") }
                catch (_: Exception) { "HTTP $status" },
                status
            )
        }

        if (format == null || format == "json") {
            val json = JSONObject(body)
            if (!json.optBoolean("ok")) throw DiceError(json.optString("error"), 200)
            parseRollResult(json)
        } else {
            body
        }
    }

    private fun parseRollResult(json: JSONObject): RollResult {
        val groupsArray = json.getJSONArray("groups")
        val groups = (0 until groupsArray.length()).map { i ->
            val g = groupsArray.getJSONObject(i)
            val rollsArray = g.getJSONArray("rolls")
            val rolls = (0 until rollsArray.length()).map { j -> rollsArray.getInt(j) }
            DieGroup(
                dice = g.getString("dice"),
                count = g.getInt("count"),
                rolls = rolls,
                subtotal = g.getInt("subtotal")
            )
        }
        return RollResult(
            expression = json.getString("expression"),
            normalized = json.getString("normalized"),
            source = json.getString("source"),
            groups = groups,
            modifier = json.getInt("modifier"),
            detail = json.getString("detail"),
            total = json.getDouble("total"),
            timestamp = json.getString("timestamp")
        )
    }
}

// ---- Usage (in a ViewModel or CoroutineScope) ----
// val dice = EntropyDice()
// launch {
//     val result = dice.roll("4D6+D12") as RollResult
//     println("${result.detail} = ${result.total}")
// }
```

### Swift / iOS

```swift
import Foundation

struct DieGroup: Codable {
    let dice: String
    let count: Int
    let rolls: [Int]
    let subtotal: Int
}

struct RollResult: Codable {
    let ok: Bool
    let expression: String
    let normalized: String
    let source: String
    let groups: [DieGroup]
    let modifier: Int
    let detail: String
    let total: Double
    let timestamp: String
}

struct RollError: Codable {
    let ok: Bool
    let error: String
}

enum DiceError: Error {
    case httpError(Int, String)
    case rateLimited(retryAfter: Int)
    case apiError(String)
}

class EntropyDice {
    let baseURL: String

    init(baseURL: String = "https://entropydice.onrender.com") {
        self.baseURL = baseURL.hasSuffix("/") ? String(baseURL.dropLast()) : baseURL
    }

    func roll(
        expression: String,
        source: String? = nil,
        format: String? = nil
    ) async throws -> Any {
        var components = URLComponents(string: "\(baseURL)/roll")!
        var queryItems = [URLQueryItem(name: "q", value: expression)]
        if let source = source { queryItems.append(URLQueryItem(name: "source", value: source)) }
        if let format = format { queryItems.append(URLQueryItem(name: "format", value: format)) }
        components.queryItems = queryItems

        let (data, response) = try await URLSession.shared.data(from: components.url!)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw DiceError.httpError(0, "Invalid response")
        }

        guard httpResponse.statusCode == 200 else {
            if httpResponse.statusCode == 429 {
                let retryAfter = Int(httpResponse.value(forHTTPHeaderField: "Retry-After") ?? "60") ?? 60
                throw DiceError.rateLimited(retryAfter: retryAfter)
            }
            let body = String(data: data, encoding: .utf8) ?? ""
            throw DiceError.httpError(httpResponse.statusCode, body)
        }

        if format == nil || format == "json" {
            let result = try JSONDecoder().decode(RollResult.self, from: data)
            if !result.ok { throw DiceError.apiError("Unknown API error") }
            return result
        }
        return String(data: data, encoding: .utf8) ?? ""
    }
}

// ---- Usage ----
// let dice = EntropyDice()
// Task {
//     do {
//         let result = try await dice.roll(expression: "4D6+D12") as! RollResult
//         print("\(result.detail) = \(result.total)")
//     } catch {
//         print("Error: \(error)")
//     }
// }
```

### C# / .NET

```csharp
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using System.Web;

public class EntropyDice
{
    private readonly HttpClient _client;
    private readonly string _baseUrl;

    public EntropyDice(string baseUrl = "https://entropydice.onrender.com")
    {
        _baseUrl = baseUrl.TrimEnd('/');
        _client = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
    }

    public async Task<string> RollRawAsync(string expression)
    {
        var uri = BuildUri(expression, format: "raw");
        return await _client.GetStringAsync(uri);
    }

    public async Task<RollResult> RollAsync(string expression, string source = null)
    {
        var uri = BuildUri(expression, source: source);
        var json = await _client.GetStringAsync(uri);
        return JsonSerializer.Deserialize<RollResult>(json)!;
    }

    private string BuildUri(string expression, string source = null, string format = null)
    {
        var query = HttpUtility.ParseQueryString("");
        query["q"] = expression;
        if (source != null) query["source"] = source;
        if (format != null) query["format"] = format;
        return $"{_baseUrl}/roll?{query}";
    }
}

public class DieGroup
{
    [JsonPropertyName("dice")] public string Dice { get; set; }
    [JsonPropertyName("count")] public int Count { get; set; }
    [JsonPropertyName("rolls")] public List<int> Rolls { get; set; }
    [JsonPropertyName("subtotal")] public int Subtotal { get; set; }
}

public class RollResult
{
    [JsonPropertyName("ok")] public bool Ok { get; set; }
    [JsonPropertyName("expression")] public string Expression { get; set; }
    [JsonPropertyName("normalized")] public string Normalized { get; set; }
    [JsonPropertyName("source")] public string Source { get; set; }
    [JsonPropertyName("groups")] public List<DieGroup> Groups { get; set; }
    [JsonPropertyName("modifier")] public int Modifier { get; set; }
    [JsonPropertyName("detail")] public string Detail { get; set; }
    [JsonPropertyName("total")] public double Total { get; set; }
    [JsonPropertyName("timestamp")] public string Timestamp { get; set; }
}

// ---- Usage ----
// var dice = new EntropyDice();
// var result = await dice.RollAsync("4D6+D12");
// Console.WriteLine($"{result.Detail} = {result.Total}");
```

### Rust

```rust
use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct DieGroup {
    pub dice: String,
    pub count: i32,
    pub rolls: Vec<i32>,
    pub subtotal: i32,
}

#[derive(Debug, Deserialize)]
pub struct RollResult {
    pub ok: bool,
    pub expression: String,
    pub normalized: String,
    pub source: String,
    pub groups: Vec<DieGroup>,
    pub modifier: i32,
    pub detail: String,
    pub total: f64,
    pub timestamp: String,
}

#[derive(Debug, Deserialize)]
pub struct RollError {
    pub ok: bool,
    pub error: String,
}

pub struct EntropyDice {
    base_url: String,
    client: Client,
}

impl EntropyDice {
    pub fn new(base_url: Option<&str>) -> Self {
        EntropyDice {
            base_url: base_url.unwrap_or("https://entropydice.onrender.com").trim_end_matches('/').to_string(),
            client: Client::new(),
        }
    }

    pub async fn roll(&self, expression: &str, source: Option<&str>, format: Option<&str>) -> Result<RollResult, String> {
        let mut params = vec![("q".to_string(), expression.to_string())];
        if let Some(s) = source { params.push(("source".to_string(), s.to_string())); }
        if let Some(f) = format { params.push(("format".to_string(), f.to_string())); }

        let url = format!("{}/roll", &self.base_url);
        let response = self.client
            .get(&url)
            .query(&params)
            .send()
            .await
            .map_err(|e| format!("HTTP error: {}", e))?;

        let status = response.status();
        let body = response.text().await.map_err(|e| format!("Read error: {}", e))?;

        if !status.is_success() {
            if status.as_u16() == 429 {
                return Err("Rate limited".to_string());
            }
            return Err(format!("HTTP {}: {}", status.as_u16(), body));
        }

        let result: RollResult = serde_json::from_str(&body)
            .map_err(|e| format!("JSON parse error: {}", e))?;
        Ok(result)
    }

    pub async fn roll_raw(&self, expression: &str) -> Result<String, String> {
        let url = format!("{}/roll", &self.base_url);
        let response = self.client
            .get(&url)
            .query(&[("q", expression), ("format", "raw")])
            .send()
            .await
            .map_err(|e| format!("HTTP error: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("HTTP {}", response.status().as_u16()));
        }

        response.text().await.map_err(|e| format!("Read error: {}", e))
    }
}

// ---- Usage ----
// #[tokio::main]
// async fn main() {
//     let dice = EntropyDice::new(None);
//     match dice.roll("4D6+D12", None, None).await {
//         Ok(r) => println!("{} = {}", r.detail, r.total),
//         Err(e) => eprintln!("Error: {}", e),
//     }
// }
```

### Go

```go
package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

type DieGroup struct {
	Dice     string `json:"dice"`
	Count    int    `json:"count"`
	Rolls    []int  `json:"rolls"`
	Subtotal int    `json:"subtotal"`
}

type RollResult struct {
	OK          bool       `json:"ok"`
	Expression  string     `json:"expression"`
	Normalized  string     `json:"normalized"`
	Source      string     `json:"source"`
	Groups      []DieGroup `json:"groups"`
	Modifier    int        `json:"modifier"`
	Detail      string     `json:"detail"`
	Total       float64    `json:"total"`
	Timestamp   string     `json:"timestamp"`
}

type RollError struct {
	OK    bool   `json:"ok"`
	Error string `json:"error"`
}

type EntropyDice struct {
	BaseURL string
	Client  *http.Client
}

func NewEntropyDice(baseURL string) *EntropyDice {
	if baseURL == "" {
		baseURL = "https://entropydice.onrender.com"
	}
	return &EntropyDice{
		BaseURL: baseURL,
		Client:  &http.Client{Timeout: 10 * time.Second},
	}
}

func (d *EntropyDice) Roll(expression, source, format string) (*RollResult, error) {
	params := url.Values{}
	params.Set("q", expression)
	if source != "" { params.Set("source", source) }
	if format != "" { params.Set("format", format) }

	resp, err := d.Client.Get(fmt.Sprintf("%s/roll?%s", d.BaseURL, params.Encode()))
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		if resp.StatusCode == 429 {
			return nil, fmt.Errorf("rate limited (retry after %s)", resp.Header.Get("Retry-After"))
		}
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(body))
	}

	var result RollResult
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("parse error: %w", err)
	}
	if !result.OK {
		var e RollError
		json.Unmarshal(body, &e)
		return nil, fmt.Errorf("API error: %s", e.Error)
	}
	return &result, nil
}

func (d *EntropyDice) RollRaw(expression string) (string, error) {
	resp, err := d.Client.Get(fmt.Sprintf("%s/roll?q=%s&format=raw", d.BaseURL, url.QueryEscape(expression)))
	if err != nil {
		return "", fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(body))
	}
	return string(body), nil
}

// ---- Usage ----
// func main() {
//     dice := NewEntropyDice("")
//     result, err := dice.Roll("4D6+D12", "", "json")
//     if err != nil {
//         fmt.Println("Error:", err)
//         return
//     }
//     fmt.Printf("%s = %.0f\n", result.Detail, result.Total)
// }
```

### PHP

```php
<?php

class EntropyDice {
    private string $baseUrl;

    public function __construct(string $baseUrl = 'https://entropydice.onrender.com') {
        $this->baseUrl = rtrim($baseUrl, '/');
    }

    /**
     * Roll dice. Returns array for JSON, string for raw/text/html.
     */
    public function roll(
        string $expression,
        ?string $source = null,
        ?string $format = null
    ): array|string {
        $params = ['q' => $expression];
        if ($source !== null) $params['source'] = $source;
        if ($format !== null) $params['format'] = $format;

        $url = $this->baseUrl . '/roll?' . http_build_query($params);

        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'timeout' => 10,
                'ignore_errors' => true,
            ]
        ]);

        $response = file_get_contents($url, false, $context);

        if ($response === false) {
            throw new RuntimeException('HTTP request failed');
        }

        // Check status from response headers
        if (isset($http_response_header)) {
            $statusLine = $http_response_header[0];
            preg_match('{HTTP/\S+\s+(\d+)}', $statusLine, $matches);
            $status = (int)($matches[1] ?? 200);

            if ($status === 429) {
                throw new RuntimeException('Rate limited — retry later');
            }
            if ($status >= 400) {
                throw new RuntimeException("HTTP $status: $response");
            }
        }

        if ($format === null || $format === 'json') {
            $data = json_decode($response, true);
            if (!$data || empty($data['ok'])) {
                throw new RuntimeException($data['error'] ?? 'Unknown API error');
            }
            return $data;
        }

        return $response;
    }

    public function rollRaw(string $expression): string {
        return $this->roll($expression, null, 'raw');
    }
}

// ---- Usage ----
// $dice = new EntropyDice();
// $result = $dice->roll('4D6+D12');
// echo $result['detail'] . ' = ' . $result['total'] . PHP_EOL;
//
// $raw = $dice->rollRaw('D20');
// echo "You rolled: $raw" . PHP_EOL;
```

### Ruby

```ruby
require 'net/http'
require 'json'
require 'uri'

class EntropyDice
  BASE_URL = 'https://entropydice.onrender.com'

  def initialize(base_url = nil)
    @base_url = (base_url || BASE_URL).chomp('/')
  end

  def roll(expression, source: nil, format: nil)
    params = { q: expression }
    params[:source] = source if source
    params[:format] = format if format

    uri = URI("#{@base_url}/roll")
    uri.query = URI.encode_www_form(params)

    response = Net::HTTP.get_response(uri)

    case response.code.to_i
    when 200
      if format.nil? || format == 'json'
        data = JSON.parse(response.body)
        raise "API error: #{data['error']}" unless data['ok']
        data
      else
        response.body
      end
    when 429
      retry_after = response['Retry-After']&.to_i || 60
      raise "Rate limited — retry after #{retry_after}s"
    when 403
      raise "IP permanently banned"
    else
      raise "HTTP #{response.code}: #{response.body}"
    end
  end

  def roll_raw(expression)
    roll(expression, format: 'raw').strip
  end
end

# ---- Usage ----
# dice = EntropyDice.new
# result = dice.roll('4D6+D12')
# puts "#{result['detail']} = #{result['total']}"
#
# raw = dice.roll_raw('D20')
# puts "You rolled: #{raw}"
```

### Lua

```lua
-- EntropyDice client for Lua (requires LuaSocket)
local http = require("socket.http")
local ltn12 = require("ltn12")
local json = require("dkjson")

local EntropyDice = {}
EntropyDice.__index = EntropyDice

function EntropyDice:new(base_url)
    local o = { base_url = base_url or "https://entropydice.onrender.com" }
    return setmetatable(o, self)
end

function EntropyDice:roll(expression, source, format)
    local params = "q=" .. expression
    if source then params = params .. "&source=" .. source end
    if format then params = params .. "&format=" .. format end

    local response_body = {}
    local _, status = http.request {
        url = self.base_url .. "/roll?" .. params,
        sink = ltn12.sink.table(response_body),
    }

    local body = table.concat(response_body)

    if status ~= 200 then
        error("HTTP " .. tostring(status) .. ": " .. body)
    end

    if not format or format == "json" then
        local data, _, err = json.decode(body)
        if err then error("JSON parse error: " .. err) end
        if not data.ok then error(data.error or "Unknown API error") end
        return data
    end

    return body
end

function EntropyDice:roll_raw(expression)
    return self:roll(expression, nil, "raw")
end

-- ---- Usage ----
-- local dice = EntropyDice:new()
-- local result = dice:roll("4D6+D12")
-- print(string.format("%s = %s", result.detail, result.total))
```

### Telegram Bot (Python)

```python
#!/usr/bin/env python3
"""
EntropyDice Telegram bot — responds to /roll <expression> commands.

Dependencies: pip install python-telegram-bot requests
"""
import requests
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

API_URL = "https://entropydice.onrender.com/roll"
BOT_TOKEN = "YOUR_TELEGRAM_BOT_TOKEN"


def roll_dice(expression: str) -> str:
    """Call the EntropyDice API and return formatted result."""
    try:
        r = requests.get(API_URL, params={"q": expression}, timeout=10)

        if r.status_code == 429:
            return "The dice are overheating... wait a moment and try again."

        data = r.json()
        if not data.get("ok"):
            return f"Error: {data.get('error', 'Unknown error')}"

        return f"{expression}\n```\n{data['detail']} = {data['total']}\n```"

    except requests.RequestException as e:
        return f"Network error: {e}"


async def roll_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /roll command."""
    expression = " ".join(context.args) if context.args else "D20"
    result = roll_dice(expression)
    await update.message.reply_text(result, parse_mode="Markdown")


async def start_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start command."""
    await update.message.reply_text(
        "EntropyDice Bot\n\n"
        "Commands:\n"
        "/roll D20 — Roll a D20\n"
        "/roll 4D6+D12 — Roll 4d6 + 1d12\n"
        "/roll 2D8+1D20-4 — Roll with modifier\n\n"
        "All standard RPG dice supported.",
    )


def main():
    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start_cmd))
    app.add_handler(CommandHandler("roll", roll_cmd))
    print("Bot polling...")
    app.run_polling()


if __name__ == "__main__":
    main()
```

### Discord Bot (JavaScript)

```javascript
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const API_URL = 'https://entropydice.onrender.com/roll';
const PREFIX = '!roll';

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

async function rollDice(expression) {
    const params = new URLSearchParams({ q: expression, format: 'json' });
    const res = await fetch(`${API_URL}?${params}`);
    if (!res.ok) {
        if (res.status === 429) throw new Error('Rate limited — slow down!');
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    return data;
}

client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.content.startsWith(PREFIX)) return;

    const expression = msg.content.slice(PREFIX.length).trim() || 'D20';

    try {
        const result = await rollDice(expression);

        const embed = new EmbedBuilder()
            .setTitle(result.expression)
            .setDescription(`${result.detail} = **${result.total}**`)
            .setColor(0xe94560)
            .setFooter({ text: `source: ${result.source} | v0.8.5` })
            .setTimestamp();

        // Show individual rolls as fields
        for (const group of result.groups) {
            embed.addFields({
                name: `${group.count}${group.dice}`,
                value: `[${group.rolls.join(', ')}] = **${group.subtotal}**`,
                inline: true,
            });
        }

        msg.channel.send({ embeds: [embed] });
    } catch (err) {
        msg.reply(`Error: ${err.message}`);
    }
});

client.once('ready', () => {
    console.log(`EntropyDice bot ready as ${client.user.tag}`);
});

client.login('YOUR_DISCORD_BOT_TOKEN');
```

### Web Page (HTML + JS)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Dice Roller — EntropyDice</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', system-ui, sans-serif;
    background: #0f1923;
    color: #c8d6e5;
    display: flex; justify-content: center; align-items: center;
    min-height: 100vh;
  }
  .container {
    background: #1a1a2e;
    border: 1px solid #2a3a4a;
    border-radius: 12px;
    padding: 32px;
    max-width: 500px;
    width: 100%;
  }
  h1 { text-align: center; color: #e94560; margin-bottom: 8px; }
  .sub { text-align: center; color: #888; font-size: 0.85em; margin-bottom: 24px; }
  input[type="text"] {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid #2a3a4a;
    border-radius: 8px;
    background: #0f1923;
    color: #c8d6e5;
    font-size: 1.1em;
    font-family: 'SF Mono', monospace;
    margin-bottom: 12px;
  }
  input[type="text"]:focus {
    outline: none;
    border-color: #e94560;
  }
  .row {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }
  select, button {
    padding: 10px 16px;
    border: 1px solid #2a3a4a;
    border-radius: 8px;
    background: #1a2a3a;
    color: #c8d6e5;
    font-size: 0.95em;
    cursor: pointer;
  }
  button {
    background: #e94560;
    border-color: #e94560;
    color: #fff;
    font-weight: bold;
    flex: 1;
  }
  button:hover { background: #c0392b; }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
  #result {
    margin-top: 16px;
    padding: 16px;
    background: #1a2a3a;
    border-radius: 8px;
    border: 1px solid #2a3a4a;
    min-height: 60px;
    display: none;
  }
  #result .detail { font-family: 'SF Mono', monospace; color: #f5c542; }
  #result .total { color: #e94560; font-size: 1.5em; font-weight: bold; text-align: center; margin-top: 8px; }
  #error { color: #e74c3c; margin-top: 8px; display: none; }
  .shortcuts {
    display: flex;
    gap: 6px;
    margin-bottom: 12px;
    flex-wrap: wrap;
    justify-content: center;
  }
  .shortcuts button {
    flex: 0;
    background: #1a2a3a;
    border-color: #2a3a4a;
    color: #c8d6e5;
    font-weight: normal;
  }
  .shortcuts button:hover { background: #2a3a4a; }
</style>
</head>
<body>
<div class="container">
  <h1>EntropyDice</h1>
  <p class="sub">Cryptographically secure dice rolls</p>

  <div class="shortcuts">
    <button onclick="roll('D4')">D4</button>
    <button onclick="roll('D6')">D6</button>
    <button onclick="roll('D8')">D8</button>
    <button onclick="roll('D10')">D10</button>
    <button onclick="roll('D12')">D12</button>
    <button onclick="roll('D20')">D20</button>
    <button onclick="roll('D100')">D100</button>
  </div>

  <input type="text" id="expression" placeholder="e.g. 4D6+D12" value="D20"
         onkeydown="if(event.key==='Enter') doRoll()">

  <div class="row">
    <select id="source">
      <option value="crypto-pure">crypto-pure (true entropy)</option>
      <option value="crypto-xoshiro-ng">crypto-xoshiro-ng (fast hybrid)</option>
    </select>
    <select id="format">
      <option value="json">JSON</option>
      <option value="text">Text</option>
      <option value="raw">Raw</option>
    </select>
    <button onclick="doRoll()">Roll</button>
  </div>

  <div id="result">
    <div class="detail" id="detail"></div>
    <div class="total" id="total"></div>
  </div>
  <div id="error"></div>
</div>

<script>
const API = 'https://entropydice.onrender.com';

function roll(expr) {
  document.getElementById('expression').value = expr;
  doRoll();
}

async function doRoll() {
  const expr = document.getElementById('expression').value.trim();
  const source = document.getElementById('source').value;
  const format = document.getElementById('format').value;
  const btn = document.querySelector('button');
  const resultDiv = document.getElementById('result');
  const errorDiv = document.getElementById('error');

  if (!expr) return;

  btn.disabled = true;
  resultDiv.style.display = 'none';
  errorDiv.style.display = 'none';

  try {
    const params = new URLSearchParams({ q: expr, source: source, format: 'json' });
    const res = await fetch(`${API}/roll?${params}`);

    if (res.status === 429) {
      errorDiv.textContent = 'Too many requests. Slow down!';
      errorDiv.style.display = 'block';
      return;
    }

    const data = await res.json();

    if (!data.ok) {
      errorDiv.textContent = `Error: ${data.error}`;
      errorDiv.style.display = 'block';
      return;
    }

    document.getElementById('detail').textContent = data.detail;
    document.getElementById('total').textContent = data.total;
    resultDiv.style.display = 'block';
  } catch (err) {
    errorDiv.textContent = `Network error: ${err.message}`;
    errorDiv.style.display = 'block';
  } finally {
    btn.disabled = false;
  }
}
</script>
</body>
</html>
```

---

## Rate-Limit-Aware Client Design

### Reading Rate-Limit Headers

After every `/roll` request, extract these headers to know how many requests you have left:

```python
response = requests.get(url)
remaining = int(response.headers.get("X-RateLimit-Remaining", -1))
daily_remaining = int(response.headers.get("X-RateLimit-Daily-Remaining", -1))

if remaining < 10:
    print("Approaching burst limit — slowing down")
if daily_remaining < 100:
    print("Approaching daily limit — consider caching")
```

### Exponential Backoff on 429

```python
import time
import random

def fetch_with_backoff(url, max_retries=5):
    for attempt in range(max_retries):
        response = requests.get(url)
        if response.status_code != 429:
            return response

        retry_after = int(response.headers.get("Retry-After", 60))
        # Add jitter to avoid thundering herd
        wait = retry_after + random.uniform(0, 2)
        print(f"Rate limited. Waiting {wait:.1f}s... (attempt {attempt + 1}/{max_retries})")
        time.sleep(wait)

    raise Exception("Max retries exceeded")
```

### Caching Results

For static dice expressions that don't change (e.g., a loot table that rolls `D20` for initiative), cache results locally:

```python
import functools
import time

@functools.lru_cache(maxsize=256)
def cached_roll(expression, source="crypto-pure"):
    """Cache is invalidated by new function calls with different args."""
    return dice.roll(expression, source=source)

# For time-based caching:
_cache = {}

def roll_with_cache(expression, ttl=5):
    """Cache for `ttl` seconds."""
    now = time.time()
    key = expression
    if key in _cache and _cache[key][0] > now:
        return _cache[key][1]

    result = dice.roll(expression, fmt="raw")
    _cache[key] = (now + ttl, result)
    return result
```

### Batching vs Sequential

- The API does **not** support batch rolling (multiple expressions in one request).
- Use sequential requests with a small delay between them (e.g., `time.sleep(0.1)`).
- At 120 req/min, you can safely make 2 req/sec without hitting the burst limit.

```python
import time

expressions = ["D20", "4D6", "D8+D4", "3D10", "D100"]
for expr in expressions:
    result = dice.roll(expr, fmt="raw")
    print(f"{expr}: {result}")
    time.sleep(0.1)  # polite spacing between requests
```

---

## Best Practices

### 1. Always encode the expression
Use your HTTP library's query parameter builder — don't concatenate strings.

```python
# GOOD — requests handles encoding
requests.get(API, params={"q": "4D6+D12"})

# BAD — manual string, `+` is not encoded
requests.get(f"{API}?q=4D6+D12")  # `+` interpreted as space by some servers
```

### 2. Check `ok` field, not just HTTP status
A 200 response can still contain an error if the expression was invalid:
```json
{ "ok": false, "error": "Caras no válidas: D7" }
```

### 3. Use `format=raw` when you only need the number
It's faster (less data transfer) and simpler to parse. If you need individual rolls, use `format=json`.

### 4. Implement exponential backoff
On 429, read `Retry-After` and wait that many seconds. Add random jitter to avoid synchronized retries.

### 5. Monitor `X-RateLimit-Daily-Remaining`
If you're building a long-running bot or service, log or alert when daily remaining drops below 100 so you can throttle your own usage before hitting the limit.

### 6. Don't poll the API
There's no event system. If you need frequent dice rolls, batch them or use a local PRNG. The API is designed for occasional use — not real-time games with thousands of rolls per second.

### 7. Handle errors gracefully
Wrap every API call in try/catch. The internet is unreliable, the server might be sleeping (Render free tier cold start), and the expression might be invalid.

```python
try:
    result = dice.roll(user_input, fmt="raw")
except DiceError as e:
    print(f"Dice error: {e}")
except Exception as e:
    print(f"Unexpected error: {e}")
```

### 8. Use `crypto-xoshiro-ng` for bulk rolls
If you need to make 100+ rolls quickly (e.g., generating a loot table), use `source=crypto-xoshiro-ng` to reduce kernel context switches. It's faster and still cryptographically seeded.

### 9. Don't hardcode the URL
Allow users of your client library to configure the base URL — they may be self-hosting.

```python
class Dice:
    def __init__(self, base_url=None):
        self.base_url = base_url or "https://entropydice.onrender.com"
```

### 10. Cache the root endpoint response
The `/` endpoint returns static metadata. Cache it once and reuse it.

---

## Self-Hosting

### Requirements
- **Node.js** 18+
- **npm** 9+

### Installation

```bash
git clone https://github.com/carlymx/entropydice.git
cd entropydice
npm install
```

### Running

```bash
# Default settings (port 3000, crypto-pure source)
npm start

# Custom configuration
PORT=8080 DEFAULT_SOURCE=crypto-xoshiro-ng npm start
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP server port |
| `DEFAULT_SOURCE` | `crypto-pure` | Default randomness source when `source` is omitted |
| `RESEED_INTERVAL_MS` | `3600000` | Reseed interval for `crypto-xoshiro-ng` (1 hour) |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Burst limit time window (1 minute) |
| `RATE_LIMIT_MAX` | `120` | Max requests per burst window |
| `RATE_LIMIT_DAILY` | `7200` | Max requests per day |
| `BAN_MAX_STRIKES` | `3` | Daily-overflow strikes before permanent ban |
| `BANNED_IPS` | — | Comma-separated IPs to manually ban |

### Deploying on Render

1. Create a **Web Service** on [render.com](https://render.com)
2. Connect your GitHub/GitLab repository
3. Set **Build Command:** `npm install`
4. Set **Start Command:** `node server.js`
5. Choose the **Free** plan
6. Add environment variables as needed
7. Deploy

> The free tier **sleeps after 15 minutes** of inactivity. First request after sleep takes ~5–10 seconds (cold start).

---

## Reference Tables

### All Valid Dice

| Notation | Sides | Range |
|----------|-------|-------|
| `D4` or `1D4` | 4 | 1–4 |
| `D6` or `1D6` | 6 | 1–6 |
| `D8` or `1D8` | 8 | 1–8 |
| `D10` or `1D10` | 10 | 1–10 |
| `D12` or `1D12` | 12 | 1–12 |
| `D20` or `1D20` | 20 | 1–20 |
| `D100` or `1D100` | 100 | 1–100 |
| `ND{x}` where x is any of the above | | Sum of N dice |

### All Valid Sources

| Source ID | Type | Seed |
|-----------|------|------|
| `crypto-pure` | True CSPRNG (kernel) | Stateless (no seed) |
| `crypto-xoshiro-ng` | Hybrid PRNG + CSPRNG seed | 128-bit crypto seed per hour |

### All Response Formats

| Format | Content-Type | Returns | Use case |
|--------|-------------|---------|----------|
| `json` | `application/json` | Full structured object | Programmatic parsing |
| `text` | `text/plain` | `[4+2+6]+[9] = 21` | Terminal, logs |
| `html` | `text/html` | Styled HTML page | Browser display, iframes |
| `raw` | `text/plain` | `21` | Scripts, arithmetic downstream |

### HTTP Status Codes

| Code | Name | Meaning |
|------|------|---------|
| `200` | OK | Roll succeeded |
| `400` | Bad Request | Invalid expression, die, source, or division by zero |
| `403` | Forbidden | IP is permanently banned |
| `429` | Too Many Requests | Burst or daily rate limit exceeded |
| `500` | Internal Server Error | Unexpected server failure |

### Response Headers (non-standard)

| Header | Applies To | Meaning |
|--------|-----------|---------|
| `X-RateLimit-Limit` | `/roll` | Max requests per burst window |
| `X-RateLimit-Remaining` | `/roll` | Requests left in current burst window |
| `X-RateLimit-Reset` | `/roll` | Unix timestamp when burst window resets |
| `X-RateLimit-Daily-Limit` | `/roll` | Max requests per day |
| `X-RateLimit-Daily-Remaining` | `/roll` | Requests remaining today |
| `Retry-After` | `/roll` (on 429) | Seconds to wait before retrying |

---

## Planned Features

Features under consideration for future versions (not yet available):

- `max(a, b)` and `min(a, b)` — highest/lowest of two expressions
- `d` (drop) operator — e.g. `4D6d1` to drop the lowest die
- `k` (keep) operator — e.g. `4D6k3` to keep the 3 highest dice
- Advantage/disadvantage notation: `ADV(D20)`, `DIS(D20)`
- `name` / `user` parameter — tag rolls with a player or character identifier
- Colored dice / parallel groups — roll independent dice pools in one request
- Raw-dice mode — return individual rolls without arithmetic

---

*Documentation for EntropyDice v0.8.5 — 2026-07-04 — carlymx — GPL-3.0-only*
