# EntropyDice 🎲

![Captura de pantalla](./assets/captures/web001.png)

**Dados aleatorios reales para juegos de rol. Criptográficamente seguros.**

API REST que genera números aleatorios reales usando el CSPRNG del kernel
(`/dev/urandom`) para dados D4, D6, D8, D10, D12, D20 y D100. Soporta
expresiones compuestas como `4D6+D12`, `(2D6+3)*2` y modificadores como `2D8+1D20-4`.

> 📖 **English:** [README.md](README.md)

---

## Inicio rápido

```bash
npm install
npm start
# → EntropyDice API v0.8.5 en http://localhost:3000
```

## Uso

```bash
# Dado simple
curl "http://localhost:3000/roll?q=D6"

# Múltiples dados
curl "http://localhost:3000/roll?q=4D6%2BD12"

# Con modificador
curl "http://localhost:3000/roll?q=2D8%2B1D20-4"

# Percentil
curl "http://localhost:3000/roll?q=D100"

# Multiplicación y división
curl "http://localhost:3000/roll?q=D6*2"
curl "http://localhost:3000/roll?q=D20%2F2"

# Expresiones complejas con paréntesis
curl "http://localhost:3000/roll?q=%282D6%2B3%29*2"

# Respuesta en texto plano
curl "http://localhost:3000/roll?q=4D6&format=text"

# Solo el número
curl "http://localhost:3000/roll?q=4D6&format=raw"

# Fuente híbrida (Xoshiro128++ con reseed cada 1h)
curl "http://localhost:3000/roll?q=D20&source=crypto-xoshiro-ng"
```

**Codificación URL:** `+` → `%2B`, `*` → `%2A`, `/` → `%2F`, `(` → `%28`, `)` → `%29`.

---

## API

| Endpoint | Parámetros | Descripción |
|----------|-----------|-------------|
| `GET /` | — | Info de la API y health check |
| `GET /roll` | `q`, `source`, `format` | Lanzar dados |

### Parámetros

| Parámetro | Default | Valores |
|-----------|---------|---------|
| `q` | — | Expresión de dados (requerido) |
| `source` | `crypto-pure` | `crypto-pure`, `crypto-xoshiro-ng` |
| `format` | `json` | `json`, `text`, `html`, `raw` |

### Dados válidos

`D4`, `D6`, `D8`, `D10`, `D12`, `D20`, `D100`

### Formatos de respuesta

| Formato | Content-Type | Ejemplo |
|---------|-------------|---------|
| `json` | `application/json` | `{"total": 15, "detail": "[5+3]+[7]", ...}` |
| `text` | `text/plain` | `[5+3]+[7] = 15` |
| `html` | `text/html` | Página HTML estilizada |
| `raw` | `text/plain` | `15` |

### Fuentes

| Fuente | Descripción |
|--------|-------------|
| `crypto-pure` | CSPRNG del kernel — entropía real, sin estado, sin sesgo |
| `crypto-xoshiro-ng` | Seed criptográfica 128-bit → Xoshiro128++ con reseed automático cada hora |

---

## Documentación completa

Consulta la documentación interactiva completa en:

👉 **https://entropydice.onrender.com/help/es.html**  *(cuando esté desplegado)*

O abre `public/help/es.html` localmente.

---

## Despliegue (Render)

1. Crea un **Web Service** en [render.com](https://render.com)
2. Conecta tu repositorio
3. Configura:
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Plan:** Free
4. Variables de entorno opcionales:
    - `RESEED_INTERVAL_MS=3600000`
    - `DEFAULT_SOURCE=crypto-pure`
    - `RATE_LIMIT_MAX=120`
    - `RATE_LIMIT_DAILY=7200`
    - `BANNED_IPS=1.2.3.4,5.6.7.8` (baneos manuales)

---

## Licencia

[![GPLv3](https://img.shields.io/badge/Licencia-GPLv3-azul.svg)](https://www.gnu.org/licenses/gpl-3.0.html)

Este programa es software libre: puedes redistribuirlo y/o modificarlo bajo los términos de la GNU General Public License publicada por la Free Software Foundation, ya sea la versión 3 de la Licencia, o (a tu elección) cualquier versión posterior.

Consulta la [GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0.html) para más detalles.

---

## Changelog

### v0.8.5 — 2026-07-04
- **Frontend bilingüe**: botón EN/ES en el probador de API con traducción completa,
  detección automática del idioma del navegador y persistencia en `localStorage`
- **Icono de ayuda**: botón `?` junto al selector de idioma que abre la documentación
  del idioma actual en una nueva pestaña
- **Archivo LICENSE**: GPL-3.0 añadido al repositorio

Ver [CHANGELOG.md](CHANGELOG.md) para el historial completo.
