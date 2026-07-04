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

module.exports = { CryptoXoshiroNGSource };
