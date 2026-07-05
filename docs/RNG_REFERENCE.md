# RNG Technical Reference — CSPRNG & Xoshiro128++

> **Propósito:** Documentación técnica completa de las fuentes de aleatoriedad criptográfica `crypto-pure` y `crypto-xoshiro-ng`, estructurada para que cualquier IA agentica pueda comprender, reutilizar y adaptar los generadores a cualquier caso de uso.

---

## Quick Reference

| ID | Clase | Tipo | Estado | Seed | Velocidad | Entropía |
|----|-------|------|--------|------|-----------|----------|
| `xoshiro128` | `Xoshiro128` | PRNG | 128-bit state | 32-bit → splitmix32 | ~200M nums/s | Determinista |
| `crypto-pure` | `CryptoPureSource` | Criptográfico | Stateless | Ninguna (OS entropy) | ~500K nums/s | Hardware |
| `crypto-xoshiro-ng` | `CryptoXoshiroNGSource` | Híbrido | 128-bit state | 128-bit criptográfica | ~180M nums/s | 128-bit + noise |

---

## 1. Interface Contract

Toda fuente de aleatoriedad implementa un método que recibe el número de caras (o rango máximo) y devuelve un entero:

```javascript
interface RandomSource {
    roll(sides: number): number  // Retorna entero en [1, sides]
}
```

Para adaptar a otro rango `[min, max]`: `min + (roll(max - min + 1) - 1)`, o bien implementar un método `next()` que devuelva `[0, N-1]` y aplicar el desplazamiento externamente.

---

## 2. Xoshiro128++ PRNG

Xoshiro128++ (2018, Blackman & Vigna) es un generador de números pseudoaleatorios de 128 bits de estado, diseñado para ser rápido y pasar baterías de tests estadísticos como BigCrush.

```javascript
const splitmix32 = (state) => {
    state = (state + 0x9E3779B9) | 0;
    let t = state;
    t ^= t >>> 16;
    t = Math.imul(t, 0x85EBCA6B);
    t ^= t >>> 13;
    t = Math.imul(t, 0xC2B2AE35);
    t ^= t >>> 16;
    return t >>> 0;
};

class Xoshiro128 {
    constructor(seed) {
        let s = seed != null ? seed >>> 0 : (Date.now() >>> 0);
        this.s = new Uint32Array(4);
        let state = s;
        for (let i = 0; i < 4; i++) {
            state = splitmix32(state);
            this.s[i] = state;
        }
    }

    static fromState(s0, s1, s2, s3) {
        const rng = Object.create(Xoshiro128.prototype);
        rng.s = new Uint32Array([s0 >>> 0, s1 >>> 0, s2 >>> 0, s3 >>> 0]);
        return rng;
    }

    nextRaw() {
        const s = this.s;
        const result = (s[0] + s[3]) >>> 0;
        const t = (s[1] << 9) >>> 0;
        s[2] ^= s[0];
        s[3] ^= s[1];
        s[1] ^= s[2];
        s[0] ^= s[3];
        s[2] ^= t;
        s[3] = ((s[3] << 11) | (s[3] >>> 21)) >>> 0;
        const output = ((result + s[0]) >>> 0) + ((result + s[1]) >>> 0);
        return output >>> 0;
    }

    next() {
        return this.nextRaw();
    }
}
```

### Características

- **Estado:** 128-bit (`Uint32Array[4]`)
- **Período:** 2¹²⁸ − 1 (prácticamente infinito)
- **Seed expansion:** SplitMix32 itera 4 veces para llenar state array desde una semilla de 32 bits
- **`fromState()`:** Constructor estático que inyecta estado 128-bit directamente sin SplitMix32
- **Seed por defecto:** `Date.now()` si no se provee
- **`nextRaw()`** devuelve el valor completo de 32 bits sin módulo; el consumidor aplica el rango que necesite

### Xoshiro128++ vs variantes

| Variante | Scramble | Calidad |
|----------|----------|---------|
| Xoshiro128** | XOR de estado completo | Rápida, bits bajos débiles |
| Xoshiro128+ | `s[0] + s[3]` | Buena, falla BigCrush |
| Xoshiro128++ | `(s[0]+s[3]) + s[0] + s[1]` (pre + post) | Excelente, pasa BigCrush |

---

## 3. Cryptographic Sources

### 3.1 CryptoPureSource

Fuente criptográfica pura que obtiene entropía directamente del sistema operativo en cada llamada. Stateless, sin sesgo, ideal para aplicaciones donde cada número debe ser impredecible.

```javascript
const crypto = require('crypto');

class CryptoPureSource {
    roll(sides) {
        return crypto.randomInt(1, sides + 1);
    }
}
```

**Características:**

- **Stateless:** cada llamada obtiene entropía fresca del SO vía `getrandom()` → `/dev/urandom`
- **Sin sesgo:** `crypto.randomInt()` implementa rejection sampling interno para distribución uniforme perfecta
- **Velocidad:** ~500K números/segundo (limitado por el CSPRNG del kernel)
- **API:** `roll(sides)` devuelve entero en `[1, sides]`
- **Sin seed ni reseed:** no hay estado que resembrar

#### Navegador (Web Crypto API)

```javascript
class CryptoPureSource {
    roll(sides) {
        return (crypto.getRandomValues(new Uint32Array(1))[0] % sides) + 1;
    }
}
```

### 3.2 CryptoXoshiroNGSource (Next Gen)

Arquitectura híbrida que combina la entropía real del sistema para la semilla con la velocidad de Xoshiro128++ para la generación, más inyección de ruido temporal por llamada.

```javascript
const crypto = require('crypto');
const { Xoshiro128 } = require('./xoshiro128');

const DEFAULT_RESEED_INTERVAL_MS = 3600000;

class CryptoXoshiroNGSource {
    constructor(reseedIntervalMs) {
        this._reseedInterval = reseedIntervalMs || DEFAULT_RESEED_INTERVAL_MS;
        this._lastReseed = 0;
        this._rng = null;
        this._doReseed();
    }

    _doReseed() {
        const seedArr = new Uint32Array(4);
        const buf = crypto.randomBytes(16);
        seedArr[0] = buf.readUInt32LE(0);
        seedArr[1] = buf.readUInt32LE(4);
        seedArr[2] = buf.readUInt32LE(8);
        seedArr[3] = buf.readUInt32LE(12);
        this._rng = Xoshiro128.fromState(seedArr[0], seedArr[1], seedArr[2], seedArr[3]);
        this._lastReseed = Date.now();
    }

    _maybeReseed() {
        if (Date.now() - this._lastReseed >= this._reseedInterval) {
            this._doReseed();
        }
    }

    roll(sides) {
        this._maybeReseed();
        const x = this._rng.next();
        const noise = (Date.now() * 1000) >>> 0;
        const result = ((x ^ noise) >>> 0);
        return (result % sides) + 1;
    }
}
```

**Innovaciones clave:**

1. **128-bit real seeding:** Obtiene 128 bits genuinos vía `crypto.randomBytes(16)` → 4×Uint32LE
2. **Inyección directa:** Usa `Xoshiro128.fromState()` sin SplitMix32 (los 128 bits ya son entropía real)
3. **Reseed automático por tiempo:** Se re-semilla cada `reseedIntervalMs` (default 1h) en lugar de por número de llamadas
4. **Per-call noise injection:** `x ^ (Date.now() * 1000)` — ruido de granularidad milisegundo que rompe correlaciones entre resiembras

#### Flujo de 3 fases

```
crypto.randomBytes(16)   ──Fase 1──►  Xoshiro128.fromState(s0,s1,s2,s3)
      ▲                                                    │
      │                  cada 1h                            │ Fase 2
      └─────────────── _doReseed() ◄────────────────────────┘
                                                           nextRaw()
                                                             │
                                                             │ Fase 3
                                                             ▼
                                              (nextRaw() ^ (Date.now()*1000)) >>> 0
                                                             │
                                                             ▼
                                                         % sides + 1
```

**Fase 1 — Seed (128-bit criptográfica)**
Se obtienen 16 bytes del CSPRNG del kernel vía `crypto.randomBytes(16)`,
se dividen en 4×Uint32LE y se inyectan directamente en `Xoshiro128.fromState()`.
Sin SplitMix32: los 128 bits ya son entropía real genuina.
Cada `reseedIntervalMs` (defecto 1h) se repite esta fase con entropía fresca.

**Fase 2 — Generación (Xoshiro128++)**
El engine produce un flujo continuo de números de 32-bit sin syscalls al
kernel (todo en memoria, ~200M nums/s). Pasa la batería BigCrush.
Estado interno: 128-bit (Uint32Array[4]), período 2¹²⁸−1.

**Fase 3 — Noise injection + módulo**
Cada número crudo se mezcla con el timestamp vía XOR:
`x ^ (Date.now() * 1000)`. El timestamp en microsegundos asegura que dos
llamadas en el mismo ms produzcan salidas diferentes. Finalmente se aplica
`% sides + 1` para obtener el rango del dado.

| Fase | Operación | Velocidad |
|------|-----------|-----------|
| 1 | crypto.randomBytes(16) + fromState | Cada 1h (~3ms) |
| 2 | Xoshiro128.nextRaw() | ~200M nums/s |
| 3 | XOR + módulo | ~180M nums/s (combinado fase 2+3) |

**Modos de inicialización:**

| Seed | Inicialización | Reseed | Reproducible |
|------|---------------|--------|-------------|
| Vacía | `crypto.randomBytes(16)` → 128-bit directo | `crypto.randomBytes(16)` | ❌ |

---

## 4. Seed Management

### 4.1 SplitMix32 Seed Expansion

Convierte una semilla de 32 bits en un estado de 128 bits para Xoshiro128. Se itera 4 veces encadenando la salida como entrada siguiente:

```
s = seed
s0 = splitmix32(s)
s1 = splitmix32(s0)
s2 = splitmix32(s1)
s3 = splitmix32(s2)
```

```javascript
function splitmix32(state) {
    state = (state + 0x9E3779B9) | 0;   // Fracción áurea en 32 bits
    let t = state;
    t ^= t >>> 16;
    t = Math.imul(t, 0x85EBCA6B);       // Primera constante de avalancha
    t ^= t >>> 13;
    t = Math.imul(t, 0xC2B2AE35);       // Segunda constante de avalancha
    t ^= t >>> 16;
    return t >>> 0;
}
```

### 4.2 Crypto Seed (128-bit directa)

Para máxima entropía, se pueden obtener 128 bits directamente del CSPRNG del sistema e inyectarlos en Xoshiro128 sin pasar por SplitMix32:

```javascript
// Node.js
const buf = crypto.randomBytes(16);
const s0 = buf.readUInt32LE(0);
const s1 = buf.readUInt32LE(4);
const s2 = buf.readUInt32LE(8);
const s3 = buf.readUInt32LE(12);
const rng = Xoshiro128.fromState(s0, s1, s2, s3);

// Navegador
const arr = crypto.getRandomValues(new Uint32Array(4));
const rng = Xoshiro128.fromState(arr[0], arr[1], arr[2], arr[3]);
```

### 4.3 Reseed Mechanism

El reseed en `CryptoXoshiroNGSource` se activa por tiempo transcurrido:

```javascript
_doReseed() {
    // 128 bits frescos del CSPRNG del sistema
    const buf = crypto.randomBytes(16);
    // ... inyectar en Xoshiro128.fromState()
    this._lastReseed = Date.now();
}

_maybeReseed() {
    if (Date.now() - this._lastReseed >= this._reseedInterval) {
        this._doReseed();
    }
}
```

| Fuente | Comportamiento reseed |
|--------|----------------------|
| `crypto-pure` | No aplica (stateless) |
| `crypto-xoshiro-ng` | `crypto.randomBytes(16)` — no determinista |

---

## 5. Noise Injection

Usado en `CryptoXoshiroNGSource.roll()` para añadir entropía por llamada:

```javascript
roll(sides) {
    const x = this._rng.next();          // Xoshiro128++ output (32-bit)
    const noise = (Date.now() * 1000) >>> 0; // Timestamp en μs
    const result = ((x ^ noise) >>> 0);  // XOR → unsigned 32-bit
    return (result % sides) + 1;
}
```

**Propiedades del noise:**

- `Date.now() * 1000` da un timestamp en microsegundos (aunque la precisión real es milisegundo, la multiplicación escala el jitter)
- El valor concreto depende de cuándo exactamente se llame
- XOR mezcla el estado del PRNG con el tiempo actual, rompiendo la correlación entre salidas
- `>>> 0` trunca a 32-bit unsigned
- Para mayor resolución temporal, usar `performance.now()` (microsegundos reales)

---

## 6. Critical Technical Details

### 6.1 Math.imul vs *

```javascript
// Correcto para 32-bit:
t = Math.imul(t, 0x85EBCA6B);

// Incorrecto (pérdida de precisión para valores > 2⁵³):
t = (t * 0x85EBCA6B) | 0;
```

JavaScript representa números como float64. `Math.imul()` es el equivalente nativo de multiplicación entera 32-bit, necesaria para PRNGs que requieren aritmética exacta.

### 6.2 >>> 0 (uint32 coercion)

`>>> 0` convierte cualquier número a entero de 32 bits sin signo (rango 0 a 4,294,967,295). Esencial tras:
- XOR (`^`) que puede producir negativos en JS
- Suma que excede 2³¹
- Desplazamientos de bits

### 6.3 Uint32Array

`new Uint32Array(4)` garantiza que las operaciones de bits se comporten como en C, sin conversiones implícitas a float64.

### 6.4 Modulo Bias

Para un rango `[0, M-1]` con M que no divide exactamente 2³²:
```
4294967296 / M = ...
```
El resto crea un sesgo. Para la mayoría de usos es despreciable (~8.6e-9 para M=37). Para aplicaciones que requieren distribución perfecta, usar rejection sampling:

```javascript
function unbiasedMod(range, nextRawFn) {
    const limit = (0x100000000 - (0x100000000 % range)) >>> 0;
    let x;
    do { x = nextRawFn(); } while (x >= limit);
    return x % range;
}
```

---

## 7. Adaptation Guide

### 7.1 Change Output Range

```javascript
// Rango [1, sides] (dados):
roll(sides) { return (this.nextRaw() % sides) + 1; }

// Rango [0, M-1]:
next() { return this.nextRaw() % M; }

// Rango [min, max]:
nextRange(min, max) { return min + (this.nextRaw() % (max - min + 1)); }

// Float [0, 1):
nextFloat() { return this.nextRaw() / 0x100000000; }
```

### 7.2 Add Persistence (Save/Restore Xoshiro128 State)

```javascript
// Serializar:
const state = Array.from(rng.s);  // [s0, s1, s2, s3]

// Restaurar:
const restored = Xoshiro128.fromState(state[0], state[1], state[2], state[3]);
```

### 7.3 Create a Custom Hybrid Source

Plantilla para combinar Xoshiro128++ con fuente criptográfica:

```javascript
class MyHybridSource {
    constructor(reseedIntervalMs) {
        this._reseedInterval = reseedIntervalMs || 3600000;
        this._lastReseed = 0;
        this._doReseed();
    }

    _doReseed() {
        // Obtener 128 bits del CSPRNG del sistema
        const buf = crypto.randomBytes(16);
        this._rng = Xoshiro128.fromState(
            buf.readUInt32LE(0),
            buf.readUInt32LE(4),
            buf.readUInt32LE(8),
            buf.readUInt32LE(12)
        );
        this._lastReseed = Date.now();
    }

    _maybeReseed() {
        if (Date.now() - this._lastReseed >= this._reseedInterval) {
            this._doReseed();
        }
    }

    roll(sides) {
        this._maybeReseed();
        const x = this._rng.next();
        const noise = this._useNoise ? ((Date.now() * 1000) >>> 0) : 0;
        return (((x ^ noise) >>> 0) % sides) + 1;
    }

    reseed() { this._doReseed(); }
}
```

### 7.4 Deterministic Parallel Sequences

Para simulaciones multi-thread con secuencias independientes:

```javascript
// Worker 0: Xoshiro128.fromState(base + 0, base + 1, base + 2, base + 3)
// Worker 1: Xoshiro128.fromState(base + 4, base + 5, base + 6, base + 7)
// ...
```

Cada worker recibe 4×Uint32 contiguos y produce secuencia totalmente independiente (período 2¹²⁸ por worker).

### 7.5 Node.js Usage

En Node.js, `crypto.randomInt()` y `crypto.randomBytes()` son parte del módulo `crypto` nativo (disponible desde v14+). No requieren instalación adicional.

```javascript
const crypto = require('crypto');

// Entero en [min, max]:
const n = crypto.randomInt(1, 21);  // D20

// Bytes crudos para seed de 128 bits:
const buf = crypto.randomBytes(16);
```

---

## 8. Test Patterns

### Determinism Test (Xoshiro128 con splitmix32)
```javascript
const a = new Xoshiro128(42);
const b = new Xoshiro128(42);
for (let i = 0; i < 100; i++) {
    expect(a.next()).toBe(b.next());
}
```

### Range Test
```javascript
const rng = new CryptoXoshiroNGSource();
for (let i = 0; i < 1000; i++) {
    const n = rng.roll(20);
    expect(n).toBeGreaterThanOrEqual(1);
    expect(n).toBeLessThanOrEqual(20);
}
```

### Coverage Test
```javascript
const rng = new Xoshiro128(42);
const seen = new Set();
for (let i = 0; i < 5000; i++) seen.add(rng.nextRaw() % 20 + 1);
expect(seen.size).toBeGreaterThanOrEqual(18);  // Al menos 18/20 valores
```

### Consistency Test (Cross-platform)
```javascript
// JS: Xoshiro128.fromState(s0,s1,s2,s3) → next() produce valores deterministas
// Cualquier implementación que siga el algoritmo Xoshiro128++ con el mismo
// estado inicial debe producir la misma secuencia.
```

### Reseed Test
```javascript
const source = new CryptoXoshiroNGSource(50);  // reseed cada 50ms
const a = source.roll(100);
await new Promise(r => setTimeout(r, 60));
const b = source.roll(100);
// 'a' y 'b' provienen de semillas diferentes (no determinista)
```

---

## 9. References

- Blackman, D. & Vigna, S. (2018). "Scrambled Linear Pseudorandom Number Generators". ACM Trans. Math. Softw. — https://prng.di.unimi.it/
- Xoshiro128++ reference implementation (C): https://prng.di.unimi.it/xoshiro128plusplus.c
- SplitMix64 (paper): https://gee.cs.oswego.edu/dl/papers/oopsla14.pdf
- `crypto.randomInt` (Node.js): https://nodejs.org/api/crypto.html#cryptorandomintmin-max-callback
- `crypto.randomBytes` (Node.js): https://nodejs.org/api/crypto.html#cryptorandombytessize-callback
- `Math.imul` (MDN): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/imul
- `crypto.getRandomValues` (MDN): https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues

---

> Generado para que cualquier IA agentica pueda comprender, reutilizar y adaptar los sistemas de aleatoriedad `crypto-pure` y `crypto-xoshiro-ng` sin necesidad de leer los archivos fuente completos. Todos los fragmentos de código son reproducciones literales de los archivos fuente del proyecto EntropyDice.
