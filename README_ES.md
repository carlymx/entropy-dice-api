# EntropyDice - API 🎲

![logo](./assets/EntropyDice_logo/EntropyDICE_logo_yellow.png)

**Dados aleatorios reales para juegos de rol. Criptográficamente seguros.**

API REST que genera números aleatorios reales usando el CSPRNG del kernel
(`/dev/urandom`) para dados D4, D6, D8, D10, D12, D20 y D100. Soporta
expresiones compuestas como `4D6+D12`, `(2D6+3)*2` y modificadores como `2D8+1D20-4`.

> 📖 **English:** [README.md](README.md)

![Captura de pantalla](./assets/captures/web001.png)

El proyecto incluye, dentro de la carpeta /public/, una página web sencilla que demuestra el funcionamiento de la API. Sin embargo, su uso no es obligatorio: puede integrar la API en cualquiera de sus proyectos sin necesidad de incluir esta página de prueba.

---

## Inicio rápido

```bash
npm install
npm start
# → EntropyDice API v0.8.7 en http://localhost:3000
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

### Aleatoriedad real vs pseudoaleatoriedad

La mayoría de dados virtuales son pseudoaleatorios. EntropyDice es
aleatoriedad real. Punto.

Los sistemas tradicionales usan fórmulas matemáticas para calcular
números que parecen aleatorios, pero no lo son. Con el mismo punto
de partida (la "semilla") siempre producen los mismos resultados.
Si alguien descubre esa semilla, puede saber de antemano qué va a
salir en cada tirada.

EntropyDice funciona de otra forma. Ofrece dos modos:

| Modo | Fuente | Tipo | Velocidad | Capacidad |
|------|--------|------|-----------|-----------|
| **Entropía pura** | `crypto-pure` | Aleatoriedad obtenida del ruido de los dispositivos electrónicos | ~500K tiradas/s | ~5k-50k usuarios simultáneos |
| **Híbrido ultrarrápido** | `crypto-xoshiro-ng` | Aleatoriedad casi-real con renovación periódica | ~180M tiradas/s | ~1.8M-18M usuarios simultáneos |

**crypto-pure** — Para cuando la prioridad es la aleatoriedad real sin
concesiones (su estado por defecto). Cada tirada se genera a partir de fenómenos físicos
imperceptibles del propio servidor (ruido eléctrico, vibraciones,
temperatura). No hay ningún número inicial del que se puedan deducir
los demás. Es más lento, pero 500.000 tiradas por segundo siguen
siendo suficientes para miles de jugadores a la vez.

**crypto-xoshiro-ng** — Para cuando necesitas velocidad sin
sacrificar la seguridad. Funciona en tres capas:

1. **Semilla renovada cada hora** — Cada 60 minutos (configurables) se genera una
   nueva semilla a partir de procesos aleatorios reales del sistema. Nunca
   se usa la misma semilla dos veces.
2. **Motor de alta velocidad** — Un motor de números probado
   rigurosamente que trabaja directamente desde la memoria del
   servidor, sin pausas ni cuellos de botella, con cadenas de números tan largas que superan la edad del universo.
3. **Mezcla con el instante exacto** — Cada número se combina con
   la hora exacta en que se pide, de forma que aunque dos personas
   tiren a la vez, sus resultados son completamente distintos.

El resultado: un sistema que, aunque técnicamente está generado por
un algoritmo, es tan intrincado — semilla aleatoria real renovable + motor de alto
rendimiento + huella del momento exacto — que supera con creces a
cualquiera de los sistemas tradicionales como Mersenne Twister.

¿Quieres números realmente aleatorios? Usa `crypto-pure`.
¿Necesitas velocidad sin preocuparte? `crypto-xoshiro-ng` te cubre.

Para aleatoriedad real y una API sencilla de usar que cualquiera puede alojar en su servidor y no depender de nadie, EntropyDice es tu mejor opción. 💪

### Fuentes

| Fuente | Descripción |
|--------|-------------|
| `crypto-pure` | Entropía real del servidor — sin semilla, sin estado, sin sesgo. ~500K t/s |
| `crypto-xoshiro-ng` | Híbrido: semilla renovable + motor rápido + mezcla temporal. ~180M t/s |

---

## Documentación completa

Consulta la documentación interactiva completa en:

👉 **https://entropydice.onrender.com/help/es.html**  *(cuando esté desplegado)*

O abre `public/help/es.html` localmente.

---

## Licencia

[![GPLv3](https://img.shields.io/badge/Licencia-GPLv3-azul.svg)](https://www.gnu.org/licenses/gpl-3.0.html)

Este programa es software libre: puedes redistribuirlo y/o modificarlo bajo los términos de la GNU General Public License publicada por la Free Software Foundation, ya sea la versión 3 de la Licencia, o (a tu elección) cualquier versión posterior.

Consulta la [GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0.html) para más detalles.

---

## Changelog

### v0.8.7 — 2026-07-06
- **Calculadora visual de dados**: botones numéricos (0-9) y operadores (+, -, *, /, (), )) en el frontend
- **Modo acumulativo**: los botones de dados construyen expresiones sin lanzar automáticamente
- **Narrativa de aleatoriedad**: nueva sección en ambos READMEs con tabla de velocidades y capacidades
- **Diagrama de 3 fases**: pipeline ASCII añadido a `docs/RNG_REFERENCE.md`
- **Corrección responsive**: ancho del campo API ajustado para móvil
- **Enlace al repositorio**: crédito del frontend actualizado con enlace a GitHub

### v0.8.6 — 2026-07-05
- **Referencia RNG refactorizada**: documentación de `crypto-pure` y `crypto-xoshiro-ng` movida a `/docs/`
- **Actualización de versión**: 0.8.5 → 0.8.6

### v0.8.5 — 2026-07-04
- **Frontend bilingüe**: botón EN/ES en el probador de API con traducción completa,
  detección automática del idioma del navegador y persistencia en `localStorage`
- **Icono de ayuda**: botón `?` junto al selector de idioma que abre la documentación
  del idioma actual en una nueva pestaña
- **Archivo LICENSE**: GPL-3.0 añadido al repositorio

Ver [CHANGELOG.md](CHANGELOG.md) para el historial completo.
