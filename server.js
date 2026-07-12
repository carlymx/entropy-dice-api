const express = require('express');
const rateLimit = require('express-rate-limit');
const { parseExpression } = require('./src/parser');
const { CryptoPureSource } = require('./src/crypto-pure');
const { CryptoXoshiroNGSource } = require('./src/crypto-xoshiro-ng');
const { formatText, formatHtml, formatRaw } = require('./src/formatter');
const { middleware: dailyLimiter } = require('./src/rate-limiter');

const VERSION = 'v0.8.0';

const PORT = parseInt(process.env.PORT, 10) || 3000;
const DEFAULT_SOURCE = process.env.DEFAULT_SOURCE || 'crypto-pure';
const RESEED_INTERVAL_MS = parseInt(process.env.RESEED_INTERVAL_MS, 10) || 3600000;
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000;
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX, 10) || 120;

const cryptoPure = new CryptoPureSource();
const cryptoXoshiroNG = new CryptoXoshiroNGSource(RESEED_INTERVAL_MS);

const sources = {
    'crypto-pure': cryptoPure,
    'crypto-xoshiro-ng': cryptoXoshiroNG,
};

function getSource(name) {
    const resolved = name || DEFAULT_SOURCE;
    const source = sources[resolved];
    if (!source) {
        throw new Error(`Fuente no válida: "${resolved}". Válidas: ${Object.keys(sources).join(', ')}`);
    }
    return { source, name: resolved };
}

function evaluateAST(node, rollFn) {
    if (node.type === 'number') {
        return {
            value: node.value,
            groups: [],
            detail: String(node.value),
        };
    }

    if (node.type === 'dice') {
        const absCount = Math.abs(node.count);
        const rolls = [];
        let subtotal = 0;
        for (let i = 0; i < absCount; i++) {
            const roll = rollFn(node.sides);
            rolls.push(roll);
            subtotal += roll;
        }
        const sign = node.count < 0 ? -1 : 1;
        const group = {
            dice: `D${node.sides}`,
            count: node.count,
            rolls,
            subtotal: subtotal * sign,
        };
        const detail = `[${rolls.join('+')}]`;
        const detailWithSign = node.count < 0 ? `-${detail}` : detail;
        return {
            value: subtotal * sign,
            groups: [group],
            detail: detailWithSign,
        };
    }

    if (node.type === 'binary') {
        const left = evaluateAST(node.left, rollFn);
        const right = evaluateAST(node.right, rollFn);

        let value;
        switch (node.op) {
            case '+': value = left.value + right.value; break;
            case '-': value = left.value - right.value; break;
            case '*': value = left.value * right.value; break;
            case '/': 
                if (right.value === 0) throw new Error('División por cero');
                value = left.value / right.value;
                break;
        }

        let detail;
        if (node.op === '+' || node.op === '-') {
            detail = combineSign(left.detail, node.op, right.detail);
        } else {
            const leftStr = needsParens(node.left, node) ? `(${left.detail})` : left.detail;
            const rightStr = needsParens(node.right, node) ? `(${right.detail})` : right.detail;
            detail = `${leftStr}${node.op}${rightStr}`;
        }

        return {
            value,
            groups: [...left.groups, ...right.groups],
            detail,
        };
    }
}

function combineSign(leftStr, op, rightStr) {
    if (rightStr.startsWith('-')) {
        if (op === '+') return `${leftStr}-${rightStr.substring(1)}`;
        if (op === '-') return `${leftStr}+${rightStr.substring(1)}`;
    }
    return `${leftStr}${op}${rightStr}`;
}

function needsParens(child, parent) {
    if (child.type === 'binary') {
        const childPrec = (child.op === '+' || child.op === '-') ? 1 : 2;
        const parentPrec = (parent.op === '+' || parent.op === '-') ? 1 : 2;
        return childPrec < parentPrec;
    }
    return false;
}

function hasComplexOps(node) {
    if (node.type === 'binary') {
        if (node.op === '*' || node.op === '/') return true;
        return hasComplexOps(node.left) || hasComplexOps(node.right);
    }
    return false;
}

function extractModifier(node) {
    if (!hasComplexOps(node)) {
        return collectNumbers(node).reduce((sum, n) => sum + n, 0);
    }
    return 0;
}

function collectNumbers(node, sign = 1) {
    if (node.type === 'number') return [node.value * sign];
    if (node.type === 'dice') return [];
    if (node.type === 'binary') {
        const rightSign = node.op === '-' ? -sign : sign;
        return [...collectNumbers(node.left, sign), ...collectNumbers(node.right, rightSign)];
    }
    return [];
}

function round2(n) {
    return Math.round(n * 100) / 100;
}

function executeRoll(ast, rollFn) {
    const result = {
        expression: '',
        normalized: '',
        source: '',
        groups: [],
        modifier: 0,
        detail: '',
        total: 0,
        timestamp: new Date().toISOString(),
    };

    const evaluated = evaluateAST(ast, rollFn);

    result.groups = evaluated.groups;
    result.detail = evaluated.detail;
    result.total = round2(evaluated.value);
    result.modifier = extractModifier(ast);

    return result;
}

function astToNormalized(node) {
    if (node.type === 'number') return String(node.value);
    if (node.type === 'dice') {
        const sign = node.count < 0 ? '-' : '';
        return `${sign}${Math.abs(node.count)}D${node.sides}`;
    }
    if (node.type === 'binary') {
        const left = astToNormalized(node.left);
        const right = astToNormalized(node.right);
        if (node.op === '+' || node.op === '-') {
            if (right.startsWith('-')) {
                return node.op === '+' ? `${left}-${right.substring(1)}` : `${left}+${right.substring(1)}`;
            }
            return `${left}${node.op}${right}`;
        }
        return `${left}${node.op}${right}`;
    }
    return '';
}

const app = express();
app.set('trust proxy', 1);

const burstLimiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: 'Demasiadas peticiones. Intenta de nuevo en 1 minuto.' },
});

app.use(express.static('public'));
app.use('/assets', express.static('assets'));

app.get('/', (req, res) => {
    res.json({
        service: 'EntropyDice API',
        version: VERSION,
        endpoints: {
            roll: {
                method: 'GET',
                path: '/roll',
                params: {
                    q: 'Expresión de dados (ej: D6, 4D6+D12, 2D8+1D20-4, D6*2, (2D6+3)*2)',
                    source: `Fuente de aleatoriedad (default: ${DEFAULT_SOURCE})`,
                    format: 'Formato de respuesta: json (default), text, html, raw',
                },
                validDice: 'D4, D6, D8, D10, D12, D20, D100',
                validOperators: '+, -, *, / y paréntesis ()',
                validSources: Object.keys(sources),
                sourceInfo: {
                    'crypto-pure': 'Entropía real del kernel (crypto.randomInt). Sin estado, sin sesgo.',
                    'crypto-xoshiro-ng': `Híbrido: Xoshiro128++ con seed criptográfica de 128 bits. Reseed automático cada ${RESEED_INTERVAL_MS / 1000}s vía crypto-pure.`,
                },
            },
        },
    });
});

app.use('/roll', burstLimiter);
app.use('/roll', dailyLimiter);

app.get('/roll', (req, res) => {
    try {
        const { q, source: sourceName, format } = req.query;

        if (!q) {
            return res.status(400).json({ ok: false, error: 'Falta el parámetro "q" con la expresión de dados' });
        }

        const { source, name } = getSource(sourceName);
        const ast = parseExpression(q);

        const result = executeRoll(ast, source.roll.bind(source));
        result.expression = q;
        result.source = name;

        if (hasComplexOps(ast)) {
            result.normalized = q;
        } else {
            result.normalized = astToNormalized(ast);
        }

        switch (format) {
            case 'raw':
                res.type('text/plain').send(formatRaw(result));
                break;
            case 'text':
                res.type('text/plain').send(formatText(result));
                break;
            case 'html':
                res.type('text/html').send(formatHtml(result));
                break;
            default:
                res.json({ ok: true, ...result });
        }
    } catch (e) {
        const status = e.message.includes('no válida') ? 400
            : e.message.includes('vacía') ? 400
            : e.message.includes('División') ? 400
            : e.message.includes('Carácter') ? 400
            : e.message.includes('esperaba') ? 400
            : e.message.includes('requiere') ? 400
            : 500;

        res.status(status).json({ ok: false, error: e.message });
    }
});

app.listen(PORT, () => {
    console.log(`EntropyDice API ${VERSION} en http://localhost:${PORT}`);
    console.log(`  Fuente por defecto: ${DEFAULT_SOURCE}`);
    console.log(`  Reseed interval:    ${RESEED_INTERVAL_MS}ms (${RESEED_INTERVAL_MS / 1000}s)`);
    console.log(`  Rate limit:         ${RATE_LIMIT_MAX} req / ${RATE_LIMIT_WINDOW_MS / 1000}s (ráfaga)`);
    console.log(`  Daily limit:        ${dailyLimiter.getDailyLimit ? dailyLimiter.getDailyLimit() : 7200} req / día / IP`);
    console.log(`  Fuentes:            ${Object.keys(sources).join(', ')}`);
});
