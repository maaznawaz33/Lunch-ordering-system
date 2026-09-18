const crypto = require('crypto');

// Generates a random token to email to the user, and a SHA-256 hash of it to
// store in the DB. We only ever store the hash - never the raw token - so a
// database leak can't be used to verify/reset accounts directly.
function generateToken() {
  const raw = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

module.exports = { generateToken, hashToken };
