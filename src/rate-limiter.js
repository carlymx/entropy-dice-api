const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'rate-limit.json');
const DAILY_LIMIT = parseInt(process.env.RATE_LIMIT_DAILY, 10) || 7200;
const BAN_MAX_STRIKES = parseInt(process.env.BAN_MAX_STRIKES, 10) || 3;
const MANUAL_BANNED = new Set(
    (process.env.BANNED_IPS || '').split(',').map(s => s.trim()).filter(Boolean)
);

let data = { counters: {}, banned: {} };

function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const raw = fs.readFileSync(DATA_FILE, 'utf8');
            data = JSON.parse(raw);
            if (!data.counters) data.counters = {};
            if (!data.banned) data.banned = {};
        }
    } catch (e) {
        console.error('[rate-limiter] Error loading data:', e.message);
        data = { counters: {}, banned: {} };
    }
}

function saveData() {
    try {
        const dir = path.dirname(DATA_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        console.error('[rate-limiter] Error saving data:', e.message);
    }
}

function getDate() {
    const now = new Date();
    return now.getUTCFullYear() + '-' +
        String(now.getUTCMonth() + 1).padStart(2, '0') + '-' +
        String(now.getUTCDate()).padStart(2, '0');
}

function middleware(req, res, next) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';

    if (MANUAL_BANNED.has(ip)) {
        return res.status(403).json({
            ok: false,
            error: 'IP bloqueada permanentemente por abuso reiterado',
        });
    }

    const ban = data.banned[ip];
    if (ban && ban.permanent) {
        return res.status(403).json({
            ok: false,
            error: 'IP bloqueada permanentemente por abuso reiterado',
        });
    }

    const today = getDate();
    let counter = data.counters[ip];

    if (!counter || counter.date !== today) {
        counter = { date: today, count: 0, strikes: 0, lastStrike: null };
    }

    if (counter.strikes > 0 && counter.lastStrike) {
        const hoursSinceLastStrike = (Date.now() - new Date(counter.lastStrike).getTime()) / 3600000;
        if (hoursSinceLastStrike >= 24) {
            counter.strikes = 0;
            counter.lastStrike = null;
        }
    }

    const remaining = DAILY_LIMIT - counter.count;

    res.set('X-RateLimit-Daily-Limit', String(DAILY_LIMIT));
    res.set('X-RateLimit-Daily-Remaining', String(Math.max(0, remaining)));

    if (remaining <= 0) {
        counter.strikes += 1;
        counter.lastStrike = new Date().toISOString();
        data.counters[ip] = counter;
        saveData();

        if (counter.strikes >= BAN_MAX_STRIKES) {
            data.banned[ip] = {
                permanent: true,
                reason: `${BAN_MAX_STRIKES} strikes alcanzados`,
                bannedAt: new Date().toISOString(),
            };
            delete data.counters[ip];
            saveData();

            return res.status(403).json({
                ok: false,
                error: `IP bloqueada permanentemente tras ${BAN_MAX_STRIKES} infracciones del límite diario`,
            });
        }

        return res.status(429).json({
            ok: false,
            error: 'Límite diario excedido. Intenta de nuevo mañana.',
            strikes: counter.strikes,
            maxStrikes: BAN_MAX_STRIKES,
        });
    }

    counter.count += 1;
    data.counters[ip] = counter;
    saveData();

    next();
}

function getDailyLimit() {
    return DAILY_LIMIT;
}

function getBanMaxStrikes() {
    return BAN_MAX_STRIKES;
}

loadData();

module.exports = { middleware, getDailyLimit, getBanMaxStrikes };
