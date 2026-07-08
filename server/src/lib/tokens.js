const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function requireSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return secret;
}

function signAccessToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, roles: user.roles }, requireSecret(), {
    expiresIn: ACCESS_TOKEN_TTL,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, requireSecret());
}

function generateOpaqueToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = {
  ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_TTL_MS,
  signAccessToken,
  verifyAccessToken,
  generateOpaqueToken,
  hashToken,
};
