const crypto = require('crypto');

class CryptoPureSource {
    roll(sides) {
        return crypto.randomInt(1, sides + 1);
    }
}

module.exports = { CryptoPureSource };
