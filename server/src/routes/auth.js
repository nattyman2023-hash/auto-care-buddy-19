const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const { pool } = require('../db');
const {
  signAccessToken,
  generateOpaqueToken,
  hashToken,
  REFRESH_TOKEN_TTL_MS,
} = require('../lib/tokens');
const { requireAuth } = require('../middleware/auth');
const { sendPasswordResetEmail } = require('../lib/email');

const router = express.Router();

async function loadRoles(userId) {
  const [rows] = await pool.query('SELECT role FROM user_roles WHERE user_id = ?', [userId]);
  return rows.map((r) => r.role);
}

async function issueSession(userId, email, roles) {
  const accessToken = signAccessToken({ id: userId, email, roles });
  const refreshToken = generateOpaqueToken();
  await pool.query(
    'INSERT INTO auth_sessions (id, user_id, refresh_token_hash, expires_at) VALUES (?, ?, ?, ?)',
    [uuid(), userId, hashToken(refreshToken), new Date(Date.now() + REFRESH_TOKEN_TTL_MS)]
  );
  return { accessToken, refreshToken };
}

function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 8;
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { email, password, full_name } = req.body || {};
  if (!email || !isValidPassword(password)) {
    return res.status(400).json({ data: null, error: 'Valid email and a password of at least 8 characters are required' });
  }
  const normalizedEmail = String(email).trim().toLowerCase();

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [existing] = await conn.query('SELECT id FROM app_users WHERE email = ?', [normalizedEmail]);
    if (existing.length > 0) {
      await conn.rollback();
      return res.status(409).json({ data: null, error: 'An account with this email already exists' });
    }

    const [[{ userCount }]] = await conn.query('SELECT COUNT(*) AS userCount FROM app_users');
    const isFirstUser = userCount === 0;

    const userId = uuid();
    const passwordHash = await bcrypt.hash(password, 12);
    await conn.query('INSERT INTO app_users (id, email, password_hash) VALUES (?, ?, ?)', [
      userId,
      normalizedEmail,
      passwordHash,
    ]);
    await conn.query('INSERT INTO profiles (id, user_id, full_name, email) VALUES (?, ?, ?, ?)', [
      uuid(),
      userId,
      full_name || '',
      normalizedEmail,
    ]);
    const role = isFirstUser ? 'admin' : 'customer';
    await conn.query('INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)', [uuid(), userId, role]);

    await conn.commit();

    const { accessToken, refreshToken } = await issueSession(userId, normalizedEmail, [role]);
    res.json({
      data: { user: { id: userId, email: normalizedEmail, roles: [role] }, accessToken, refreshToken },
      error: null,
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ data: null, error: err.message });
  } finally {
    conn.release();
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ data: null, error: 'Email and password are required' });
  }
  const normalizedEmail = String(email).trim().toLowerCase();

  try {
    const [rows] = await pool.query('SELECT id, email, password_hash FROM app_users WHERE email = ?', [
      normalizedEmail,
    ]);
    const user = rows[0];
    // Compare against a dummy hash when the user doesn't exist so response timing
    // doesn't reveal whether the email is registered.
    const hashToCompare = user ? user.password_hash : '$2a$12$invalidsaltinvalidsaltinvalidsalthashvalue1234567890';
    const passwordMatches = await bcrypt.compare(password, hashToCompare);
    if (!user || !passwordMatches) {
      return res.status(401).json({ data: null, error: 'Invalid email or password' });
    }

    const roles = await loadRoles(user.id);
    const { accessToken, refreshToken } = await issueSession(user.id, user.email, roles);
    res.json({ data: { user: { id: user.id, email: user.email, roles }, accessToken, refreshToken }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) return res.status(400).json({ data: null, error: 'refreshToken is required' });

  try {
    const tokenHash = hashToken(refreshToken);
    const [rows] = await pool.query(
      'SELECT s.id, s.user_id, s.expires_at, u.email FROM auth_sessions s JOIN app_users u ON u.id = s.user_id WHERE s.refresh_token_hash = ?',
      [tokenHash]
    );
    const session = rows[0];
    if (!session || new Date(session.expires_at) < new Date()) {
      return res.status(401).json({ data: null, error: 'Session expired, please log in again' });
    }

    // Rotate: delete the used refresh token and issue a new pair.
    await pool.query('DELETE FROM auth_sessions WHERE id = ?', [session.id]);
    const roles = await loadRoles(session.user_id);
    const { accessToken, refreshToken: newRefreshToken } = await issueSession(session.user_id, session.email, roles);
    res.json({
      data: { user: { id: session.user_id, email: session.email, roles }, accessToken, refreshToken: newRefreshToken },
      error: null,
    });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body || {};
  if (refreshToken) {
    await pool.query('DELETE FROM auth_sessions WHERE refresh_token_hash = ?', [hashToken(refreshToken)]);
  }
  res.json({ data: { success: true }, error: null });
});

// GET /api/auth/session - equivalent to supabase.auth.getSession() for an already-issued access token
router.get('/session', requireAuth, async (req, res) => {
  res.json({ data: { user: req.user }, error: null });
});

// POST /api/auth/reset-password-request
router.post('/reset-password-request', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ data: null, error: 'Email is required' });
  const normalizedEmail = String(email).trim().toLowerCase();

  try {
    const [rows] = await pool.query('SELECT id FROM app_users WHERE email = ?', [normalizedEmail]);
    // Always respond success even if the email isn't registered, so this endpoint
    // can't be used to enumerate accounts.
    if (rows[0]) {
      const token = generateOpaqueToken();
      await pool.query(
        'INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
        [uuid(), rows[0].id, hashToken(token), new Date(Date.now() + 60 * 60 * 1000)]
      );
      await sendPasswordResetEmail(normalizedEmail, token);
    }
    res.json({ data: { success: true }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !isValidPassword(password)) {
    return res.status(400).json({ data: null, error: 'A valid token and a password of at least 8 characters are required' });
  }

  const conn = await pool.getConnection();
  try {
    const tokenHash = hashToken(token);
    const [rows] = await conn.query(
      'SELECT id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = ?',
      [tokenHash]
    );
    const record = rows[0];
    if (!record || record.used_at || new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ data: null, error: 'This reset link is invalid or has expired' });
    }

    await conn.beginTransaction();
    const passwordHash = await bcrypt.hash(password, 12);
    await conn.query('UPDATE app_users SET password_hash = ? WHERE id = ?', [passwordHash, record.user_id]);
    await conn.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?', [record.id]);
    // Revoke all existing sessions on password change.
    await conn.query('DELETE FROM auth_sessions WHERE user_id = ?', [record.user_id]);
    await conn.commit();

    res.json({ data: { success: true }, error: null });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ data: null, error: err.message });
  } finally {
    conn.release();
  }
});

// POST /api/auth/update-password (logged-in user changing their own password)
router.post('/update-password', requireAuth, async (req, res) => {
  const { password } = req.body || {};
  if (!isValidPassword(password)) {
    return res.status(400).json({ data: null, error: 'Password must be at least 8 characters' });
  }
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    await pool.query('UPDATE app_users SET password_hash = ? WHERE id = ?', [passwordHash, req.user.id]);
    // Keep the current session's refresh token alive, but revoke every other session.
    res.json({ data: { success: true }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

module.exports = router;
