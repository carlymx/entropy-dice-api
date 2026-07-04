# Changelog

## [v0.8.5] — 2026-07-04

### Añadido
- Frontend bilingüe: botón EN/ES en la esquina superior izquierda del probador de API
- Traducciones inline con `data-i18n` + JS: subtítulo, placeholder, botones, labels, estados
- Persistencia del idioma en `localStorage` y detección automática vía `navigator.language`
- Icono de ayuda (?) que abre la documentación del idioma actual en nueva pestaña
- Archivo `LICENSE` (GPL-3.0) añadido al proyecto

### Cambiado
- Versión `package.json` → v0.8.5
- Botón EN/ES movido dentro del cuadro principal, con `?` al lado derecho
- Todos los textos dinámicos del frontend (loading, errores, resultados) se traducen al vuelo

## [v0.8.0] — 2026-07-04

### Añadido
- Rate limiting: límite de ráfaga (120 req/min/IP) vía `express-rate-limit`
- Límite diario (7200 req/día/IP) con contador de strikes
- Sistema de baneo progresivo: 3 strikes consecutivos → ban permanente
- Lista manual de IPs baneadas vía variable de entorno `BANNED_IPS`
- Persistencia de contadores y baneos en `data/rate-limit.json`
- Headers `X-RateLimit-Daily-Limit` y `X-RateLimit-Daily-Remaining` en cada respuesta
- `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` (headers estándar de ráfaga)
- Variables de entorno: `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `RATE_LIMIT_DAILY`, `BAN_MAX_STRIKES`, `BANNED_IPS`
- `app.set('trust proxy', true)` para obtener la IP real del cliente tras el proxy de Render

### Cambiado
- Versión `package.json` → v0.8.0
- `server.js` usa dos middlewares de rate limiting antes del handler `/roll`
- `.gitignore` ahora incluye `/data/`

## [v0.7.0] — 2026-07-04

### Añadido
- Operadores de multiplicación (`*`) y división (`/`) en expresiones de dados
- Paréntesis para agrupar subexpresiones: `(2D6+3)*2`, `2*(D4+D6)`
- Precedencia estándar: `*` y `/` evalúan antes que `+` y `-`
- División con redondeo a 2 decimales
- Error 400 para división por cero
- Sección "Futuras Funcionalidades" en páginas de ayuda (`max()`, `min()`, `d`, `k`, etc.)
- Nota de codificación URL para `*` (`%2A`) y `/` (`%2F`)

### Cambiado
- Parser completamente reescrito: gramática recursiva descendente con AST
  (árbol de sintaxis abstracta) en lugar del viejo `{ groups, modifier }`
- `executeRoll()` camina el AST recursivamente en lugar de iterar sobre grupos
- `formatHtml()` detecta expresiones complejas y adapta el renderizado
- `modifier` se establece a 0 cuando hay `*`, `/` o paréntesis
- `normalized` usa la expresión original cuando hay operadores complejos
- Versión de `package.json` → v0.7.0

## [v0.6.3] — 2026-07-03

### Corregido
- `format=html` ahora muestra correctamente el signo `-` entre grupos de dados en
  expresiones con resta (ej: `D6-D4` → `[5]-[2]`)
- Eliminado dead code (`formatJson` import y variable `allDice` en server.js)
- El modificador final en la respuesta JSON ya no se colorea como dado en el
  frontend (regex corregida a `(\d+)(?=[^\]]*\])`)

---

## [v0.6.0] — 2026-07-03

### Añadido
- API REST completa con Express
- Endpoint `GET /roll` con parámetros `q`, `source`, `format`
- Fuente `crypto-pure`: entropía real del kernel vía `crypto.randomInt()`
- Fuente `crypto-xoshiro-ng`: Xoshiro128++ con seed criptográfica de 128 bits
  y reseed automático cada 1h
- Parser de expresiones de dados: `D6`, `4D6`, `4D6+D12`, `2D8+1D20-4`,
  `D6-D4`, `D6+3`, `D4+2D10`, `D100`
- Validación de dados: solo D4, D6, D8, D10, D12, D20, D100
- 4 formatos de respuesta: `json`, `text`, `html`, `raw`
- Frontend de prueba standalone (`public/index.html`) con:
  - Selector de fuente y formato
  - Botones rápidos de dados
  - Botón de borrado (✕) en el campo de entrada
  - Ejemplos de expresiones
  - Historial de últimas 10 tiradas
  - Renderizado de HTML en iframe
- Página de ayuda ReadTheDocs-style en inglés y español
- Documentación completa en README.md y README_ES.md
- PLAN.md con arquitectura y diseño
- CHANGELOG.md con historial de versiones
- Variable de entorno `RESEED_INTERVAL_MS` para configurar reseed
- Variable de entorno `DEFAULT_SOURCE` para configurar fuente por defecto
