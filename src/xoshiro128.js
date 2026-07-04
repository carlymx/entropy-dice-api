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

module.exports = { Xoshiro128, splitmix32 };
