const VALID_SIDES = new Set([4, 6, 8, 10, 12, 20, 100]);

function parseExpression(input) {
    const raw = input.trim();
    if (!raw) throw new Error('Expresión vacía');

    const tokens = tokenize(raw);
    let pos = 0;

    function peek() { return tokens[pos]; }
    function next() { return tokens[pos++]; }
    function hasNext() { return pos < tokens.length; }

    function expression() {
        let left = term();
        while (hasNext() && peek().type === 'op' && (peek().value === '+' || peek().value === '-')) {
            const op = next().value;
            const right = term();
            left = { type: 'binary', op, left, right };
        }
        return left;
    }

    function term() {
        let left = factor();
        while (hasNext() && peek().type === 'op' && (peek().value === '*' || peek().value === '/')) {
            const op = next().value;
            const right = factor();
            left = { type: 'binary', op, left, right };
        }
        return left;
    }

    function factor() {
        if (!hasNext()) {
            throw new Error('Se esperaba un dado o número');
        }

        if (peek().type === 'op' && peek().value === '(') {
            next();
            const node = expression();
            if (!hasNext() || peek().type !== 'op' || peek().value !== ')') {
                throw new Error('Falta cerrar paréntesis');
            }
            next();
            return node;
        }

        if (peek().type === 'op' && peek().value === '-') {
            next();
            const child = factor();
            if (child.type === 'number') {
                return { type: 'number', value: -child.value };
            }
            if (child.type === 'dice') {
                return { type: 'dice', count: -child.count, sides: child.sides };
            }
            return { type: 'binary', op: '-', left: { type: 'number', value: 0 }, right: child };
        }

        if (peek().type === 'op' && peek().value === '+') {
            next();
            return factor();
        }

        if (peek().type === 'dice') {
            const tok = next();
            if (!VALID_SIDES.has(tok.sides)) {
                throw new Error(`Caras no válidas: D${tok.sides}. Válidas: D4, D6, D8, D10, D12, D20, D100`);
            }
            return { type: 'dice', count: tok.count, sides: tok.sides };
        }

        if (peek().type === 'number') {
            return { type: 'number', value: next().value };
        }

        throw new Error(`Carácter inesperado: '${peek().value}'`);
    }

    const ast = expression();

    if (hasNext()) {
        throw new Error('Token inesperado después de la expresión');
    }

    return ast;
}

function tokenize(raw) {
    const tokens = [];
    const cleaned = raw.replace(/\s+/g, '').toUpperCase();
    let i = 0;

    while (i < cleaned.length) {
        const ch = cleaned[i];

        if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
            tokens.push({ type: 'op', value: ch });
            i++;
        } else if (ch === '(' || ch === ')') {
            tokens.push({ type: 'op', value: ch });
            i++;
        } else if (ch === 'D') {
            i++;
            const { num, next } = readNumber(cleaned, i);
            tokens.push({ type: 'dice', count: 1, sides: num });
            i = next;
        } else if (/[0-9]/.test(ch)) {
            const { num, next } = readNumber(cleaned, i);
            if (next < cleaned.length && cleaned[next] === 'D') {
                i = next + 1;
                const sidesResult = readNumber(cleaned, i);
                tokens.push({ type: 'dice', count: num, sides: sidesResult.num });
                i = sidesResult.next;
            } else {
                tokens.push({ type: 'number', value: num });
                i = next;
            }
        } else {
            throw new Error(`Carácter inesperado: '${ch}'`);
        }
    }

    return tokens;
}

function readNumber(str, start) {
    let end = start;
    while (end < str.length && /[0-9]/.test(str[end])) {
        end++;
    }
    if (end === start) {
        throw new Error(`Se esperaba un número en la posición ${start}`);
    }
    return { num: parseInt(str.substring(start, end), 10), next: end };
}

module.exports = { parseExpression };
