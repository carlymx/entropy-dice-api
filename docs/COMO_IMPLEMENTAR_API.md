# EntropyDice — Guía de Implementación de la API

> **Versión:** v0.8.7 &nbsp;|&nbsp; **Licencia:** GPL-3.0-only &nbsp;|&nbsp; **Autor:** carlymx
>
> Referencia completa para desarrolladores humanos y agentes de IA que deseen integrar
> la API REST de EntropyDice en scripts, programas, sitios web y bots.

---

## Tabla de Contenidos

1. [Resumen General](#resumen-general)
2. [Inicio Rápido (curl)](#inicio-rápido-curl)
3. [Referencia de la API](#referencia-de-la-api)
   - [GET /](#get-)
   - [GET /roll](#get-roll)
4. [Sintaxis de Expresiones de Dados](#sintaxis-de-expresiones-de-dados)
   - [Gramática](#gramática)
   - [Dados Válidos](#dados-válidos)
   - [Operadores Válidos](#operadores-válidos)
   - [Codificación URL](#codificación-url)
5. [Formatos de Respuesta](#formatos-de-respuesta)
   - [JSON](#json)
   - [Texto](#texto)
   - [HTML](#html)
   - [Raw](#raw)
6. [Fuentes de Aleatoriedad](#fuentes-de-aleatoriedad)
7. [Manejo de Errores](#manejo-de-errores)
8. [Límites de Peticiones y Cabeceras](#límites-de-peticiones-y-cabeceras)
9. [Ejemplos de Implementación](#ejemplos-de-implementación)
   - [Bash / Shell Script](#bash--shell-script)
   - [Python](#python)
   - [JavaScript (Navegador)](#javascript-navegador)
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
   - [Bot de Telegram (Python)](#bot-de-telegram-python)
   - [Bot de Discord (JavaScript)](#bot-de-discord-javascript)
   - [Página Web (HTML + JS)](#página-web-html--js)
10. [Diseño de Clientes Conscientes de Rate-Limits](#diseño-de-clientes-conscientes-de-rate-limits)
11. [Buenas Prácticas](#buenas-prácticas)
12. [Auto-alojamiento](#auto-alojamiento)
13. [Tablas de Referencia](#tablas-de-referencia)

---

## Resumen General

**EntropyDice** es una API REST que genera números aleatorios criptográficamente seguros
para dados de juegos de rol. Utiliza el CSPRNG del kernel de Linux (`/dev/urandom`) a
través de `crypto.randomInt()` de Node.js, proporcionando entropía real de hardware:
sin semillas, sin estado, sin secuencias deterministas.

| Propiedad | Valor |
|-----------|-------|
| Protocolo | HTTP/1.1 |
| Método | Solo `GET` (sin POST, sin autenticación) |
| URL base (alojada) | `https://entropydice.onrender.com` |
| URL base (local) | `http://localhost:3000` |
| Tipos de contenido | `application/json`, `text/plain`, `text/html` |
| Dados soportados | D4, D6, D8, D10, D12, D20, D100 |
| Operadores soportados | `+`, `-`, `*`, `/`, `( )` |

---

## Inicio Rápido (curl)

```bash
# Lanzar un D20
curl "https://entropydice.onrender.com/roll?q=D20"

# Lanzar 4d6 + 1d12, texto legible
curl "https://entropydice.onrender.com/roll?q=4D6%2BD12&format=text"

# Lanzar 2d8 + 1d20 - 4, solo el número
curl "https://entropydice.onrender.com/roll?q=2D8%2B1D20-4&format=raw"
```

---

## Referencia de la API

### GET /

Devuelve metadatos de la API y verificación de estado (health check).

**Petición:**
```
GET /
```

**Ejemplo de respuesta (JSON):**
```json
{
  "service": "EntropyDice API",
  "version": "v0.8.7",
  "endpoints": {
    "roll": {
      "method": "GET",
      "path": "/roll",
      "params": {
        "q": "Expresión de dados (ej: D6, 4D6+D12, 2D8+1D20-4, D6*2, (2D6+3)*2)",
        "source": "Fuente de aleatoriedad (por defecto: crypto-pure)",
        "format": "Formato de respuesta: json (defecto), text, html, raw"
      },
      "validDice": "D4, D6, D8, D10, D12, D20, D100",
      "validOperators": "+, -, *, / y paréntesis ()",
      "validSources": ["crypto-pure", "crypto-xoshiro-ng"]
    }
  }
}
```

### GET /roll

El endpoint principal. Lanza dados según la expresión en el parámetro `q`.

**Endpoint:**
```
GET /roll?q=<expresión>[&source=<fuente>][&format=<formato>]
```

#### Parámetros

| Parámetro | Obligatorio | Defecto | Valores | Descripción |
|-----------|-------------|---------|---------|-------------|
| `q` | **Sí** | — | Cadena de expresión de dados | La expresión de dados a evaluar |
| `source` | No | `crypto-pure` | `crypto-pure`, `crypto-xoshiro-ng` | Fuente de aleatoriedad para las tiradas |
| `format` | No | `json` | `json`, `text`, `html`, `raw` | Formato de salida |

---

## Sintaxis de Expresiones de Dados

### Gramática

```
expr    → term (('+' | '-') term)*
term    → factor (('*' | '/') factor)*
factor  → dado | número | '(' expr ')'
dado    → ('D' | 'd') número            (implícito 1Dn)
        | número ('D' | 'd') número
número  → \d+
```

Los operadores siguen la precedencia matemática estándar: `*` y `/` tienen mayor
precedencia que `+` y `-`. Los paréntesis anulan la precedencia.

### Dados Válidos

| Dado | Caras | Uso común en RPG |
|------|-------|------------------|
| D4 | 4 | Daño de armas pequeñas |
| D6 | 6 | Daño estándar, puntuaciones de característica |
| D8 | 8 | Daño de armas medianas |
| D10 | 10 | Daño de asta, pares percentiles |
| D12 | 12 | Daño de gran hacha |
| D20 | 20 | Tiradas de ataque, pruebas de característica, salvaciones |
| D100 | 100 | Dados percentiles, tablas de botín |

### Operadores Válidos

| Operador | Significado | Precedencia | Ejemplo | Notas |
|----------|-------------|-------------|---------|-------|
| `+` | Suma | Baja (1) | `D6+3` | |
| `-` | Resta | Baja (1) | `D20-4` | |
| `*` | Multiplicación | Alta (2) | `D6*2` | El resultado es un número, no un dado |
| `/` | División | Alta (2) | `D20/2` | Redondeado a 2 decimales |
| `( )` | Agrupación | Máxima | `(2D6+3)*2` | Se soporta anidamiento |

#### Ejemplos de Expresiones

| Expresión | Significado |
|-----------|-------------|
| `D6` | Un dado de seis caras |
| `4D6` | Cuatro dados de seis caras |
| `D20` | Un dado de veinte caras |
| `2D20` | Dos dados de veinte caras (no es ventaja — consulta [Funcionalidades Futuras](#funcionalidades-futuras)) |
| `4D6+D12` | 4d6 más 1d12 |
| `2D8+1D20-4` | 2d8 + 1d20, restar 4 |
| `D6-D4` | 1d6 menos 1d4 |
| `D6+3` | 1d6 más 3 (modificador) |
| `D6*2` | 1d6 por 2 |
| `D20/2` | Mitad del resultado de 1d20 |
| `(2D6+3)*2` | Lanzar 2d6, sumar 3, multiplicar por 2 |
| `2*(D4+D6)` | Sumar 1d4 + 1d6, luego multiplicar por 2 |

**Restricciones:**
- Solo se aceptan D4, D6, D8, D10, D12, D20 y D100 como número de caras.
- La expresión no debe estar vacía.
- La división por cero devuelve un error 400.
- Los conteos negativos de dados (ej. `-2D6`) son sintácticamente válidos pero inusuales.

### Codificación URL

Los caracteres `+`, `*`, `/`, `(` y `)` tienen significado especial en las URLs. Codifícalos siempre:

| Carácter | Codificado |
|----------|-----------|
| `+` | `%2B` |
| `*` | `%2A` |
| `/` | `%2F` |
| `(` | `%28` |
| `)` | `%29` |
| Espacio | `%20` |

**Ejemplos:**
```
4D6+D12             →  ?q=4D6%2BD12
(2D6+3)*2           →  ?q=%282D6%2B3%29%2A2
2D8+1D20-4          →  ?q=2D8%2B1D20-4
```

> **Nota:** `-` y los dígitos no necesitan codificación. `D` y las letras tampoco.
> La mayoría de las librerías HTTP (Python `requests`, JS `fetch` con `URLSearchParams`,
> Go `url.Values`) codifican estos caracteres automáticamente cuando pasas los parámetros
> como objetos/diccionarios en lugar de construir la cadena de consulta manualmente.

---

## Formatos de Respuesta

### JSON

Formato por defecto. Devuelve una respuesta estructurada completa con todos los detalles de la tirada.

```
GET /roll?q=2D8+1D20-4
```

**Respuesta (200 OK):**
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

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `ok` | `boolean` | Siempre `true` en caso de éxito |
| `expression` | `string` | La expresión original tal como se recibió |
| `normalized` | `string` | Versión normalizada (ej. `d6` → `D6`) |
| `source` | `string` | Fuente de aleatoriedad usada (`crypto-pure` o `crypto-xoshiro-ng`) |
| `groups` | `array` | Un objeto por cada grupo de dados en la expresión |
| `groups[].dice` | `string` | Etiqueta del tipo de dado (ej. `"D6"`) |
| `groups[].count` | `number` | Cuántos dados de este tipo (negativo si se resta) |
| `groups[].rolls` | `array` | Resultados individuales de los dados, `count` elementos |
| `groups[].subtotal` | `number` | Suma de tiradas × signo |
| `modifier` | `number` | Modificador constante neto extraído de la expresión |
| `detail` | `string` | Desglose legible (ej. `"[8+8]+[20]-4"`) |
| `total` | `number` | Resultado final (todos los grupos + modificadores, redondeado a 2 decimales) |
| `timestamp` | `string` | Marca de tiempo ISO 8601 de la tirada |

### Texto

Texto plano legible para humanos. Ideal para salida de terminal.

```
GET /roll?q=2D8+1D20-4&format=text
Content-Type: text/plain

[8+8]+[20]-4 = 32
```

### HTML

Página HTML completa con tema oscuro. Adecuada para incrustar en iframes o abrir directamente en el navegador.

```
GET /roll?q=2D8+1D20-4&format=html
Content-Type: text/html

<!-- Devuelve un documento HTML completo con tarjeta de resultado en tema oscuro -->
```

### Raw

Un único número como texto plano — sin formato, sin caracteres adicionales. Ideal para scripts que solo necesitan el resultado final.

```
GET /roll?q=2D8+1D20-4&format=raw
Content-Type: text/plain

32
```

**Uso en scripts:**
```bash
RESULTADO=$(curl -s "https://entropydice.onrender.com/roll?q=D20&format=raw")
echo "Has sacado un $RESULTADO"
```

---

## Fuentes de Aleatoriedad

### `crypto-pure` (por defecto)

Usa `crypto.randomInt()` de Node.js, que llama al CSPRNG del kernel (`getrandom()` →
`/dev/urandom`). Entropía real de hardware proveniente del jitter de la CPU, temporización
de I/O de disco, interrupciones de red y RNGs de hardware.

- **Sin estado** — cada llamada es independiente, sin secuencia
- **Sin sesgo** — usa rejection sampling para eliminar el sesgo de módulo
- **Calidad CSPRNG** — adecuado para fines criptográficos y de juego

**Usa esta cuando:** Necesites aleatoriedad verdadera e impredecible. Es la opción por defecto y la recomendada para todos los casos de uso.

### `crypto-xoshiro-ng`

Fuente híbrida para escenarios de alto rendimiento:

1. Sembrado con 128 bits de entropía real (`crypto.randomBytes(16)`)
2. PRNG interno: algoritmo Xoshiro128++ (~200M números/segundo)
3. Inyección de ruido: cada salida se combina con XOR contra un timestamp de microsegundos
4. Auto-resiembra: nueva semilla de 128 bits cada hora (configurable mediante `RESEED_INTERVAL_MS`)

- **Más rápida** — evita el cambio de contexto al kernel por cada llamada (especialmente a muy alto rendimiento)
- **Sigue siendo no determinista** — el ruido del timestamp impide la reproducción PRNG pura
- **Semilla criptográfica** — la semilla proviene del mismo CSPRNG del kernel que `crypto-pure`

**Usa esta cuando:** Estés haciendo miles de tiradas por segundo y cada microsegundo cuente.

---

## Manejo de Errores

Todos los errores devuelven un cuerpo JSON con `"ok": false` y un campo `"error"` con un mensaje legible.

| HTTP Status | Causa | Ejemplos de mensaje de error |
|-------------|-------|------------------------------|
| `400 Bad Request` | Falta el parámetro `q` | `Falta el parámetro "q" con la expresión de dados` |
| `400 Bad Request` | Caras de dado no válidas (ej. D7) | `Caras no válidas: D7` |
| `400 Bad Request` | Sintaxis de expresión inválida | `Carácter inesperado: 'X'`, `Se esperaba un número` |
| `400 Bad Request` | División por cero | `División por cero` |
| `400 Bad Request` | Nombre de fuente inválido | `Fuente no válida: "foo". Válidas: crypto-pure, crypto-xoshiro-ng` |
| `403 Forbidden` | IP baneada permanentemente | `IP bloqueada permanentemente` |
| `429 Too Many Requests` | Límite de peticiones excedido (ráfaga) | `Demasiadas peticiones. Intenta de nuevo en 1 minuto.` |
| `429 Too Many Requests` | Límite de peticiones excedido (diario) | Mensaje del limitador diario |
| `500 Internal Server Error` | Error inesperado del servidor | Varía |

**Patrón de manejo de errores en el cliente (pseudocódigo):**

```
respuesta = fetch(url)
si respuesta.status == 200:
    datos = parse_json(respuesta.body)
    si datos.ok:
        usar(datos.total, datos.detail)
si no, respuesta.status == 429:
    esperar_y_reintentar(respuesta.headers["Retry-After"])
si no, respuesta.status == 403:
    log("IP baneada permanentemente, contactar al admin")
si no:
    log_error(respuesta.status, respuesta.body)
```

---

## Límites de Peticiones y Cabeceras

El endpoint `/roll` está protegido por un sistema de rate limiting en dos capas por dirección IP.

### Límite de Ráfaga

| Configuración | Defecto | Variable de entorno |
|---------------|---------|---------------------|
| Ventana | 60 segundos | `RATE_LIMIT_WINDOW_MS` |
| Máx. peticiones | 120 | `RATE_LIMIT_MAX` |

Se incluyen las cabeceras estándar `X-RateLimit-*`:

| Cabecera de Respuesta | Significado |
|-----------------------|-------------|
| `X-RateLimit-Limit` | Máx. de peticiones por ventana |
| `X-RateLimit-Remaining` | Peticiones restantes en la ventana actual |
| `X-RateLimit-Reset` | Marca de tiempo Unix de cuándo se reinicia la ventana |

### Límite Diario

| Configuración | Defecto | Variable de entorno |
|---------------|---------|---------------------|
| Por día | 7200 | `RATE_LIMIT_DAILY` |

| Cabecera de Respuesta | Significado |
|-----------------------|-------------|
| `X-RateLimit-Daily-Limit` | Máx. de peticiones por día |
| `X-RateLimit-Daily-Remaining` | Peticiones restantes hoy |

### Sistema de Baneo

- Cada vez que una IP excede el límite diario → **1 strike**
- **3 strikes consecutivos** → **baneo permanente** (todas las peticiones devuelven `403`)
- Los strikes expiran tras **24 horas de buen comportamiento** (sin más desbordamientos)
- Baneos manuales mediante la variable de entorno `BANNED_IPS` (IPs separadas por comas)

### La Cabecera `Retry-After`

Cuando recibes un `429`, la respuesta incluye:
```
Retry-After: <segundos>
```

Usa esto para programar tu reintento. Estrategia común:

```python
import time

response = requests.get(url)
if response.status_code == 429:
    retry_after = int(response.headers.get("Retry-After", 60))
    time.sleep(retry_after)
    response = requests.get(url)
```

---

## Ejemplos de Implementación

> Reemplaza `https://entropydice.onrender.com` por `http://localhost:3000` si estás auto-alojando.

### Bash / Shell Script

```bash
#!/usr/bin/env bash
# rolldice — Lanzar dados mediante la API de EntropyDice

API="https://entropydice.onrender.com"

roll() {
    local expr="${1:-D20}"
    local fmt="${2:-text}"

    case "$fmt" in
        raw|text|html|json) ;;
        *) echo "Formato inválido: $fmt (usa: json, text, html, raw)" >&2; return 1 ;;
    esac

    curl -s "${API}/roll?q=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$expr'))")&format=${fmt}"
}

# Uso:
roll "4D6+D12" text      # → [4+2+6+1]+[9] = 22
roll "D20" raw           # → 17
RESULTADO=$(roll "D20" raw) # capturar en variable
echo "Has sacado: $RESULTADO"
```

### Python

```python
"""
Cliente de EntropyDice para Python — sin dependencias externas.
"""
import json
import time
import urllib.request
import urllib.parse
from typing import Optional, Dict, Any, Literal


class EntropyDice:
    """Cliente ligero para la API REST de EntropyDice."""

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
        """Lanza dados. Devuelve dict para JSON, str para text/html/raw."""
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
                    raise DiceError(data.get("error", "Error desconocido"))
                return body

            except urllib.error.HTTPError as e:
                if e.code == 429:
                    retry_after = int(e.headers.get("Retry-After", 60))
                    if attempt < retries - 1:
                        time.sleep(retry_after)
                        continue
                raise DiceError(f"HTTP {e.code}: {e.read().decode()}") from e

        raise DiceError(f"Falló tras {retries} reintentos")


class DiceError(Exception):
    """Error de la API de EntropyDice."""
    pass


# ---- Uso rápido ----
if __name__ == "__main__":
    dice = EntropyDice()

    # JSON (por defecto)
    resultado = dice.roll("4D6+D12")
    print(f"  Detalle: {resultado['detail']}")
    print(f"  Total:   {resultado['total']}")
    for g in resultado["groups"]:
        print(f"  {g['count']}{g['dice']}: {g['rolls']} = {g['subtotal']}")

    # Número raw
    total = dice.roll("2D8+1D20-4", fmt="raw")
    print(f"  Raw: {total}")

    # Formato texto
    texto = dice.roll("D20", fmt="text")
    print(f"  Texto: {texto.strip()}")

    # Fuente personalizada
    resultado = dice.roll("2D20", source="crypto-xoshiro-ng")
    print(f"  Con xoshiro: {resultado['total']}")
```

### JavaScript (Navegador)

```javascript
/**
 * Cliente de EntropyDice para JavaScript en navegador.
 * Usa fetch() y URLSearchParams — sin dependencias.
 */
class EntropyDice {
  constructor(baseUrl = "https://entropydice.onrender.com") {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  /**
   * Lanza dados.
   * @param {string} expression — ej. "4D6+D12"
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
        throw new DiceError(`Límite de peticiones — reintenta en ${retryAfter}s`, 429, retryAfter);
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

// ---- Uso en el navegador ----
const dice = new EntropyDice();

// Con async/await
const boton = document.getElementById("roll-btn");
boton.addEventListener("click", async () => {
  try {
    const resultado = await dice.roll("4D6+D12");
    document.getElementById("salida").textContent =
      `${resultado.detail} = ${resultado.total}`;
  } catch (err) {
    console.error(err.message);
  }
});

// Con .then()
dice.roll("D20", { format: "raw" }).then(total => {
  console.log("Has sacado:", total);
});
```

### JavaScript (Node.js)

```javascript
/**
 * Cliente de EntropyDice para Node.js.
 * Sin dependencias externas — usa los módulos nativos https/http.
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
                new Error("Límite de peticiones"), { status: 429, retryAfter }
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

// ---- Uso ----
const dice = new EntropyDice();

dice.roll("4D6+D12").then(resultado => {
  console.log(`${resultado.detail} = ${resultado.total}`);
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

// ---- Uso ----
async function main() {
  const dice = new EntropyDice();

  const resultado = await dice.roll("4D6+D12");
  // TypeScript ahora sabe que resultado es RollResult
  console.log(resultado.detail, "=", resultado.total);
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
            status == 429 -> throw DiceError("Límite de peticiones", status)
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

// ---- Uso (en un ViewModel o CoroutineScope) ----
// val dice = EntropyDice()
// launch {
//     val resultado = dice.roll("4D6+D12") as RollResult
//     println("${resultado.detail} = ${resultado.total}")
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
            throw DiceError.httpError(0, "Respuesta inválida")
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
            if !result.ok { throw DiceError.apiError("Error desconocido de la API") }
            return result
        }
        return String(data: data, encoding: .utf8) ?? ""
    }
}

// ---- Uso ----
// let dice = EntropyDice()
// Task {
//     do {
//         let resultado = try await dice.roll(expression: "4D6+D12") as! RollResult
//         print("\(resultado.detail) = \(resultado.total)")
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

// ---- Uso ----
// var dice = new EntropyDice();
// var resultado = await dice.RollAsync("4D6+D12");
// Console.WriteLine($"{resultado.Detail} = {resultado.Total}");
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
            .map_err(|e| format!("Error HTTP: {}", e))?;

        let status = response.status();
        let body = response.text().await.map_err(|e| format!("Error de lectura: {}", e))?;

        if !status.is_success() {
            if status.as_u16() == 429 {
                return Err("Límite de peticiones excedido".to_string());
            }
            return Err(format!("HTTP {}: {}", status.as_u16(), body));
        }

        let result: RollResult = serde_json::from_str(&body)
            .map_err(|e| format!("Error de parseo JSON: {}", e))?;
        Ok(result)
    }

    pub async fn roll_raw(&self, expression: &str) -> Result<String, String> {
        let url = format!("{}/roll", &self.base_url);
        let response = self.client
            .get(&url)
            .query(&[("q", expression), ("format", "raw")])
            .send()
            .await
            .map_err(|e| format!("Error HTTP: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("HTTP {}", response.status().as_u16()));
        }

        response.text().await.map_err(|e| format!("Error de lectura: {}", e))
    }
}

// ---- Uso ----
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
		return nil, fmt.Errorf("petición fallida: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		if resp.StatusCode == 429 {
			return nil, fmt.Errorf("límite de peticiones (reintentar en %s)", resp.Header.Get("Retry-After"))
		}
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(body))
	}

	var result RollResult
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("error de parseo: %w", err)
	}
	if !result.OK {
		var e RollError
		json.Unmarshal(body, &e)
		return nil, fmt.Errorf("error de API: %s", e.Error)
	}
	return &result, nil
}

func (d *EntropyDice) RollRaw(expression string) (string, error) {
	resp, err := d.Client.Get(fmt.Sprintf("%s/roll?q=%s&format=raw", d.BaseURL, url.QueryEscape(expression)))
	if err != nil {
		return "", fmt.Errorf("petición fallida: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(body))
	}
	return string(body), nil
}

// ---- Uso ----
// func main() {
//     dice := NewEntropyDice("")
//     resultado, err := dice.Roll("4D6+D12", "", "json")
//     if err != nil {
//         fmt.Println("Error:", err)
//         return
//     }
//     fmt.Printf("%s = %.0f\n", resultado.Detail, resultado.Total)
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
     * Lanza dados. Devuelve array para JSON, string para raw/text/html.
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
            throw new RuntimeException('Petición HTTP fallida');
        }

        // Verificar estado desde las cabeceras de respuesta
        if (isset($http_response_header)) {
            $statusLine = $http_response_header[0];
            preg_match('{HTTP/\S+\s+(\d+)}', $statusLine, $matches);
            $status = (int)($matches[1] ?? 200);

            if ($status === 429) {
                throw new RuntimeException('Límite de peticiones — reintenta más tarde');
            }
            if ($status >= 400) {
                throw new RuntimeException("HTTP $status: $response");
            }
        }

        if ($format === null || $format === 'json') {
            $data = json_decode($response, true);
            if (!$data || empty($data['ok'])) {
                throw new RuntimeException($data['error'] ?? 'Error desconocido de la API');
            }
            return $data;
        }

        return $response;
    }

    public function rollRaw(string $expression): string {
        return $this->roll($expression, null, 'raw');
    }
}

// ---- Uso ----
// $dice = new EntropyDice();
// $resultado = $dice->roll('4D6+D12');
// echo $resultado['detail'] . ' = ' . $resultado['total'] . PHP_EOL;
//
// $raw = $dice->rollRaw('D20');
// echo "Has sacado: $raw" . PHP_EOL;
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
        raise "Error de API: #{data['error']}" unless data['ok']
        data
      else
        response.body
      end
    when 429
      retry_after = response['Retry-After']&.to_i || 60
      raise "Límite de peticiones — reintentar en #{retry_after}s"
    when 403
      raise "IP baneada permanentemente"
    else
      raise "HTTP #{response.code}: #{response.body}"
    end
  end

  def roll_raw(expression)
    roll(expression, format: 'raw').strip
  end
end

# ---- Uso ----
# dice = EntropyDice.new
# resultado = dice.roll('4D6+D12')
# puts "#{resultado['detail']} = #{resultado['total']}"
#
# raw = dice.roll_raw('D20')
# puts "Has sacado: #{raw}"
```

### Lua

```lua
-- Cliente EntropyDice para Lua (requiere LuaSocket)
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
        if err then error("Error de parseo JSON: " .. err) end
        if not data.ok then error(data.error or "Error desconocido de la API") end
        return data
    end

    return body
end

function EntropyDice:roll_raw(expression)
    return self:roll(expression, nil, "raw")
end

-- ---- Uso ----
-- local dice = EntropyDice:new()
-- local resultado = dice:roll("4D6+D12")
-- print(string.format("%s = %s", resultado.detail, resultado.total))
```

### Bot de Telegram (Python)

```python
#!/usr/bin/env python3
"""
Bot de Telegram para EntropyDice — responde a comandos /roll <expresión>.

Dependencias: pip install python-telegram-bot requests
"""
import requests
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

API_URL = "https://entropydice.onrender.com/roll"
BOT_TOKEN = "TU_TOKEN_DE_TELEGRAM"


def lanzar_dados(expression: str) -> str:
    """Llama a la API de EntropyDice y devuelve el resultado formateado."""
    try:
        r = requests.get(API_URL, params={"q": expression}, timeout=10)

        if r.status_code == 429:
            return "Los dados se están sobrecalentando... espera un momento y vuelve a intentarlo."

        data = r.json()
        if not data.get("ok"):
            return f"Error: {data.get('error', 'Error desconocido')}"

        return f"{expression}\n```\n{data['detail']} = {data['total']}\n```"

    except requests.RequestException as e:
        return f"Error de red: {e}"


async def roll_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Maneja el comando /roll."""
    expression = " ".join(context.args) if context.args else "D20"
    resultado = lanzar_dados(expression)
    await update.message.reply_text(resultado, parse_mode="Markdown")


async def start_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Maneja el comando /start."""
    await update.message.reply_text(
        "Bot de EntropyDice\n\n"
        "Comandos:\n"
        "/roll D20 — Lanzar un D20\n"
        "/roll 4D6+D12 — Lanzar 4d6 + 1d12\n"
        "/roll 2D8+1D20-4 — Lanzar con modificador\n\n"
        "Todos los dados estándar de RPG soportados.",
    )


def main():
    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start_cmd))
    app.add_handler(CommandHandler("roll", roll_cmd))
    print("Bot en escucha...")
    app.run_polling()


if __name__ == "__main__":
    main()
```

### Bot de Discord (JavaScript)

```javascript
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const API_URL = 'https://entropydice.onrender.com/roll';
const PREFIX = '!roll';

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

async function lanzarDados(expression) {
    const params = new URLSearchParams({ q: expression, format: 'json' });
    const res = await fetch(`${API_URL}?${params}`);
    if (!res.ok) {
        if (res.status === 429) throw new Error('¡Límite de peticiones — más despacio!');
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
        const result = await lanzarDados(expression);

        const embed = new EmbedBuilder()
            .setTitle(result.expression)
            .setDescription(`${result.detail} = **${result.total}**`)
            .setColor(0xe94560)
            .setFooter({ text: `fuente: ${result.source} | v0.8.7` })
            .setTimestamp();

        // Mostrar tiradas individuales como campos
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
    console.log(`Bot de EntropyDice listo como ${client.user.tag}`);
});

client.login('TU_TOKEN_DE_DISCORD');
```

### Página Web (HTML + JS)

```html
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Lanzador de Dados — EntropyDice</title>
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
  #resultado {
    margin-top: 16px;
    padding: 16px;
    background: #1a2a3a;
    border-radius: 8px;
    border: 1px solid #2a3a4a;
    min-height: 60px;
    display: none;
  }
  #resultado .detalle { font-family: 'SF Mono', monospace; color: #f5c542; }
  #resultado .total { color: #e94560; font-size: 1.5em; font-weight: bold; text-align: center; margin-top: 8px; }
  #error { color: #e74c3c; margin-top: 8px; display: none; }
  .atajos {
    display: flex;
    gap: 6px;
    margin-bottom: 12px;
    flex-wrap: wrap;
    justify-content: center;
  }
  .atajos button {
    flex: 0;
    background: #1a2a3a;
    border-color: #2a3a4a;
    color: #c8d6e5;
    font-weight: normal;
  }
  .atajos button:hover { background: #2a3a4a; }
</style>
</head>
<body>
<div class="container">
  <h1>EntropyDice</h1>
  <p class="sub">Tiradas de dados criptográficamente seguras</p>

  <div class="atajos">
    <button onclick="lanzar('D4')">D4</button>
    <button onclick="lanzar('D6')">D6</button>
    <button onclick="lanzar('D8')">D8</button>
    <button onclick="lanzar('D10')">D10</button>
    <button onclick="lanzar('D12')">D12</button>
    <button onclick="lanzar('D20')">D20</button>
    <button onclick="lanzar('D100')">D100</button>
  </div>

  <input type="text" id="expresion" placeholder="ej. 4D6+D12" value="D20"
         onkeydown="if(event.key==='Enter') hacerTirada()">

  <div class="row">
    <select id="fuente">
      <option value="crypto-pure">crypto-pure (entropía real)</option>
      <option value="crypto-xoshiro-ng">crypto-xoshiro-ng (híbrido rápido)</option>
    </select>
    <select id="formato">
      <option value="json">JSON</option>
      <option value="text">Texto</option>
      <option value="raw">Raw</option>
    </select>
    <button onclick="hacerTirada()">Lanzar</button>
  </div>

  <div id="resultado">
    <div class="detalle" id="detalle"></div>
    <div class="total" id="total"></div>
  </div>
  <div id="error"></div>
</div>

<script>
const API = 'https://entropydice.onrender.com';

function lanzar(expr) {
  document.getElementById('expresion').value = expr;
  hacerTirada();
}

async function hacerTirada() {
  const expr = document.getElementById('expresion').value.trim();
  const fuente = document.getElementById('fuente').value;
  const formato = document.getElementById('formato').value;
  const btn = document.querySelector('button');
  const divResultado = document.getElementById('resultado');
  const divError = document.getElementById('error');

  if (!expr) return;

  btn.disabled = true;
  divResultado.style.display = 'none';
  divError.style.display = 'none';

  try {
    const params = new URLSearchParams({ q: expr, source: fuente, format: 'json' });
    const res = await fetch(`${API}/roll?${params}`);

    if (res.status === 429) {
      divError.textContent = 'Demasiadas peticiones. ¡Más despacio!';
      divError.style.display = 'block';
      return;
    }

    const data = await res.json();

    if (!data.ok) {
      divError.textContent = `Error: ${data.error}`;
      divError.style.display = 'block';
      return;
    }

    document.getElementById('detalle').textContent = data.detail;
    document.getElementById('total').textContent = data.total;
    divResultado.style.display = 'block';
  } catch (err) {
    divError.textContent = `Error de red: ${err.message}`;
    divError.style.display = 'block';
  } finally {
    btn.disabled = false;
  }
}
</script>
</body>
</html>
```

---

## Diseño de Clientes Conscientes de Rate-Limits

### Leer las Cabeceras de Rate-Limit

Después de cada petición a `/roll`, extrae estas cabeceras para saber cuántas peticiones te quedan:

```python
response = requests.get(url)
remaining = int(response.headers.get("X-RateLimit-Remaining", -1))
daily_remaining = int(response.headers.get("X-RateLimit-Daily-Remaining", -1))

if remaining < 10:
    print("Acercándose al límite de ráfaga — reduciendo velocidad")
if daily_remaining < 100:
    print("Acercándose al límite diario — considera usar caché")
```

### Backoff Exponencial ante 429

```python
import time
import random

def fetch_con_backoff(url, max_reintentos=5):
    for intento in range(max_reintentos):
        response = requests.get(url)
        if response.status_code != 429:
            return response

        retry_after = int(response.headers.get("Retry-After", 60))
        # Añadir variabilidad para evitar tormentas de reintentos
        wait = retry_after + random.uniform(0, 2)
        print(f"Límite de peticiones. Esperando {wait:.1f}s... (intento {intento + 1}/{max_reintentos})")
        time.sleep(wait)

    raise Exception("Máximo de reintentos superado")
```

### Cachear Resultados

Para expresiones de dados estáticas que no cambian (ej. una tabla de botín que lanza `D20` para iniciativa), cachea los resultados localmente:

```python
import functools
import time

@functools.lru_cache(maxsize=256)
def roll_cacheado(expression, source="crypto-pure"):
    """La caché se invalida con nuevas llamadas con diferentes argumentos."""
    return dice.roll(expression, source=source)

# Para caché basada en tiempo:
_cache = {}

def roll_con_cache(expression, ttl=5):
    """Cachea durante `ttl` segundos."""
    now = time.time()
    key = expression
    if key in _cache and _cache[key][0] > now:
        return _cache[key][1]

    result = dice.roll(expression, fmt="raw")
    _cache[key] = (now + ttl, result)
    return result
```

### Lotes vs Secuencial

- La API **no** soporta tiradas por lotes (múltiples expresiones en una petición).
- Usa peticiones secuenciales con una pequeña pausa entre ellas (ej. `time.sleep(0.1)`).
- A 120 req/min, puedes hacer 2 req/seg de forma segura sin alcanzar el límite de ráfaga.

```python
import time

expresiones = ["D20", "4D6", "D8+D4", "3D10", "D100"]
for expr in expresiones:
    resultado = dice.roll(expr, fmt="raw")
    print(f"{expr}: {resultado}")
    time.sleep(0.1)  # separación educada entre peticiones
```

---

## Buenas Prácticas

### 1. Codifica siempre la expresión
Usa el constructor de parámetros de consulta de tu librería HTTP — no concatenes cadenas.

```python
# BIEN — requests maneja la codificación
requests.get(API, params={"q": "4D6+D12"})

# MAL — cadena manual, `+` no está codificado
requests.get(f"{API}?q=4D6+D12")  # `+` interpretado como espacio por algunos servidores
```

### 2. Verifica el campo `ok`, no solo el estado HTTP
Una respuesta 200 aún puede contener un error si la expresión era inválida:
```json
{ "ok": false, "error": "Caras no válidas: D7" }
```

### 3. Usa `format=raw` cuando solo necesites el número
Es más rápido (menos transferencia de datos) y más simple de parsear. Si necesitas las tiradas individuales, usa `format=json`.

### 4. Implementa backoff exponencial
Ante un 429, lee `Retry-After` y espera esa cantidad de segundos. Añade variabilidad aleatoria para evitar reintentos sincronizados.

### 5. Monitoriza `X-RateLimit-Daily-Remaining`
Si estás construyendo un bot o servicio de larga duración, registra o alerta cuando el restante diario baje de 100 para poder limitar tu propio uso antes de alcanzar el límite.

### 6. No hagas polling a la API
No hay sistema de eventos. Si necesitas tiradas de dados frecuentes, agrúpalas o usa un PRNG local. La API está diseñada para uso ocasional — no para juegos en tiempo real con miles de tiradas por segundo.

### 7. Maneja los errores con elegancia
Envuelve cada llamada a la API en try/catch. Internet no es fiable, el servidor puede estar dormido (cold start del plan gratuito de Render) y la expresión puede ser inválida.

```python
try:
    resultado = dice.roll(entrada_usuario, fmt="raw")
except DiceError as e:
    print(f"Error de dados: {e}")
except Exception as e:
    print(f"Error inesperado: {e}")
```

### 8. Usa `crypto-xoshiro-ng` para tiradas masivas
Si necesitas hacer más de 100 tiradas rápidamente (ej. generando una tabla de botín), usa `source=crypto-xoshiro-ng` para reducir los cambios de contexto al kernel. Es más rápido y sigue teniendo semilla criptográfica.

### 9. No hardcodees la URL
Permite que los usuarios de tu librería cliente configuren la URL base — puede que estén auto-alojando.

```python
class Dice:
    def __init__(self, base_url=None):
        self.base_url = base_url or "https://entropydice.onrender.com"
```

### 10. Cachea la respuesta del endpoint raíz
El endpoint `/` devuelve metadatos estáticos. Cachea la respuesta una vez y reutilízala.

---

## Auto-alojamiento

### Requisitos
- **Node.js** 18+
- **npm** 9+

### Instalación

```bash
git clone https://github.com/carlymx/entropydice.git
cd entropydice
npm install
```

### Ejecución

```bash
# Configuración por defecto (puerto 3000, fuente crypto-pure)
npm start

# Configuración personalizada
PORT=8080 DEFAULT_SOURCE=crypto-xoshiro-ng npm start
```

### Variables de Entorno

| Variable | Defecto | Descripción |
|----------|---------|-------------|
| `PORT` | `3000` | Puerto del servidor HTTP |
| `DEFAULT_SOURCE` | `crypto-pure` | Fuente de aleatoriedad por defecto cuando se omite `source` |
| `RESEED_INTERVAL_MS` | `3600000` | Intervalo de resiembra para `crypto-xoshiro-ng` (1 hora) |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Ventana de tiempo del límite de ráfaga (1 minuto) |
| `RATE_LIMIT_MAX` | `120` | Máx. de peticiones por ventana de ráfaga |
| `RATE_LIMIT_DAILY` | `7200` | Máx. de peticiones por día |
| `BAN_MAX_STRIKES` | `3` | Strikes por desbordamiento diario antes del baneo permanente |
| `BANNED_IPS` | — | IPs baneadas manualmente (separadas por comas) |

### Despliegue en Render

1. Crea un **Web Service** en [render.com](https://render.com)
2. Conecta tu repositorio de GitHub/GitLab
3. Configura **Build Command:** `npm install`
4. Configura **Start Command:** `node server.js`
5. Elige el plan **Free**
6. Añade variables de entorno según necesites
7. Despliega

> El plan gratuito **se duerme tras 15 minutos** de inactividad. La primera petición tras el sueño tarda ~5–10 segundos (cold start).

---

## Tablas de Referencia

### Todos los Dados Válidos

| Notación | Caras | Rango |
|----------|-------|-------|
| `D4` o `1D4` | 4 | 1–4 |
| `D6` o `1D6` | 6 | 1–6 |
| `D8` o `1D8` | 8 | 1–8 |
| `D10` o `1D10` | 10 | 1–10 |
| `D12` o `1D12` | 12 | 1–12 |
| `D20` o `1D20` | 20 | 1–20 |
| `D100` o `1D100` | 100 | 1–100 |
| `ND{x}` donde x es cualquiera de los anteriores | | Suma de N dados |

### Todas las Fuentes Válidas

| ID de Fuente | Tipo | Semilla |
|-------------|------|---------|
| `crypto-pure` | CSPRNG real (kernel) | Sin estado (sin semilla) |
| `crypto-xoshiro-ng` | PRNG híbrido + semilla CSPRNG | Semilla criptográfica de 128 bits cada hora |

### Todos los Formatos de Respuesta

| Formato | Content-Type | Devuelve | Caso de uso |
|---------|-------------|----------|-------------|
| `json` | `application/json` | Objeto estructurado completo | Parseo programático |
| `text` | `text/plain` | `[4+2+6]+[9] = 21` | Terminal, logs |
| `html` | `text/html` | Página HTML estilizada | Visualización en navegador, iframes |
| `raw` | `text/plain` | `21` | Scripts, aritmética posterior |

### Códigos de Estado HTTP

| Código | Nombre | Significado |
|--------|--------|-------------|
| `200` | OK | Tirada exitosa |
| `400` | Bad Request | Expresión, dado, fuente inválidos o división por cero |
| `403` | Forbidden | IP baneada permanentemente |
| `429` | Too Many Requests | Límite de ráfaga o diario excedido |
| `500` | Internal Server Error | Fallo inesperado del servidor |

### Cabeceras de Respuesta (no estándar)

| Cabecera | Se aplica a | Significado |
|----------|------------|-------------|
| `X-RateLimit-Limit` | `/roll` | Máx. de peticiones por ventana de ráfaga |
| `X-RateLimit-Remaining` | `/roll` | Peticiones restantes en la ventana de ráfaga actual |
| `X-RateLimit-Reset` | `/roll` | Marca de tiempo Unix de cuándo se reinicia la ventana |
| `X-RateLimit-Daily-Limit` | `/roll` | Máx. de peticiones por día |
| `X-RateLimit-Daily-Remaining` | `/roll` | Peticiones restantes hoy |
| `Retry-After` | `/roll` (en 429) | Segundos a esperar antes de reintentar |

---

## Funcionalidades Futuras

Funcionalidades bajo consideración para versiones futuras (aún no disponibles):

- `max(a, b)` y `min(a, b)` — mayor/menor de dos expresiones
- Operador `d` (descartar) — ej: `4D6d1` para descartar el dado más bajo
- Operador `k` (conservar) — ej: `4D6k3` para conservar los 3 dados más altos
- Notación de ventaja/desventaja: `ADV(D20)`, `DIS(D20)`
- Parámetro `name` / `user` — etiquetar tiradas con identificador de jugador o personaje
- Dados de colores / grupos paralelos — lanzar grupos de dados independientes en una petición
- Modo de solo dados — devolver tiradas individuales sin aritmética

---

*Documentación para EntropyDice v0.8.7 — 2026-07-06 — carlymx — GPL-3.0-only*
