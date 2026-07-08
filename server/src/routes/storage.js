// File storage, replacing the 3 Supabase Storage buckets actually used by the
// app (see server/AUTHZ_REFERENCE.md "Storage Buckets"): job-photos,
// site-images, expense-receipts. Files live on local disk under
// server/uploads/<bucket>/... - see the Phase 4 note in the migration plan
// about enabling Render's persistent disk add-on, or swapping this for an
// object-storage client later (the interface below is intentionally small).

const express = require('express');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const crypto = require('crypto');
const multer = require('multer');

const { requireAuth, optionalAuth, hasRole } = require('../middleware/auth');

const router = express.Router();

const BUCKETS = ['job-photos', 'site-images', 'expense-receipts'];
const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');

function bucketRoot(bucket) {
  return path.join(UPLOAD_ROOT, bucket);
}

// Resolves a client-supplied relative path safely under a bucket's root,
// rejecting any attempt to escape it (`..`, absolute paths, etc). Throws
// rather than silently clamping, since a rejected upload/read is always safer
// than one written somewhere unexpected.
function safeResolve(bucket, relPath) {
  const root = bucketRoot(bucket);
  const normalized = path.normalize(relPath || '').replace(/^([/\\])+/, '');
  const resolved = path.resolve(root, normalized);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw Object.assign(new Error('Invalid path'), { status: 400 });
  }
  return { resolved, normalized: normalized.split(path.sep).join('/') };
}

function firstSegment(relPath) {
  return String(relPath || '').split('/').filter(Boolean)[0] || '';
}

function assertValidBucket(bucket) {
  if (!BUCKETS.includes(bucket)) {
    const err = new Error('Unknown storage bucket');
    err.status = 400;
    throw err;
  }
}

function canManageBucket(user, bucket) {
  if (bucket === 'site-images') return hasRole(user, 'admin');
  if (bucket === 'job-photos') return hasRole(user, 'admin') || hasRole(user, 'mechanic');
  if (bucket === 'expense-receipts') return hasRole(user, 'admin');
  return false;
}

// Upload authorization: admins/mechanics (job-photos) or admins (site-images)
// may write to any folder; everyone else may only write under a folder named
// after their own user id (mirrors the `(storage.foldername(name))[1] =
// auth.uid()` checks in the original storage policies).
function canUpload(user, bucket, relPath) {
  if (!user) return false;
  if (canManageBucket(user, bucket)) return true;
  return firstSegment(relPath) === user.id;
}

function canDelete(user, bucket, relPath) {
  return canUpload(user, bucket, relPath);
}

// Read authorization. site-images is a genuinely public bucket (logos, hero
// images shown to anonymous visitors). job-photos/expense-receipts require a
// logged-in user; expense-receipts additionally requires admin or ownership
// (enforced again at the signed-URL layer, since that's the only way this
// bucket is ever read).
function canRead(user, bucket, relPath) {
  if (bucket === 'site-images') return true;
  if (bucket === 'job-photos') return Boolean(user);
  if (bucket === 'expense-receipts') return canManageBucket(user, bucket) || firstSegment(relPath) === user?.id;
  return false;
}

for (const bucket of BUCKETS) {
  fs.mkdirSync(bucketRoot(bucket), { recursive: true });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

// POST /api/storage/:bucket/upload  (multipart: file, path)
router.post('/:bucket/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const { bucket } = req.params;
    assertValidBucket(bucket);
    if (!req.file) return res.status(400).json({ data: null, error: 'No file provided' });
    const requestedPath = req.body.path || `${req.user.id}/${Date.now()}-${req.file.originalname}`;
    if (!canUpload(req.user, bucket, requestedPath)) {
      return res.status(403).json({ data: null, error: 'Not allowed to upload to this path' });
    }
    const { resolved, normalized } = safeResolve(bucket, requestedPath);
    await fsp.mkdir(path.dirname(resolved), { recursive: true });
    await fsp.writeFile(resolved, req.file.buffer);
    res.json({ data: { path: normalized }, error: null });
  } catch (err) {
    res.status(err.status || 500).json({ data: null, error: err.message });
  }
});

// GET /api/storage/:bucket/public/*filePath - direct read (site-images: public;
// job-photos: any logged-in user). expense-receipts never exposes this route.
router.get('/:bucket/public/*filePath', optionalAuth, async (req, res) => {
  try {
    const { bucket } = req.params;
    assertValidBucket(bucket);
    if (bucket === 'expense-receipts') {
      return res.status(403).json({ data: null, error: 'Use a signed URL for this bucket' });
    }
    const relPath = Array.isArray(req.params.filePath) ? req.params.filePath.join('/') : req.params.filePath;
    if (!canRead(req.user, bucket, relPath)) {
      return res.status(401).json({ data: null, error: 'Authentication required' });
    }
    const { resolved } = safeResolve(bucket, relPath);
    res.sendFile(resolved, (err) => {
      if (err && !res.headersSent) res.status(404).json({ data: null, error: 'File not found' });
    });
  } catch (err) {
    res.status(err.status || 500).json({ data: null, error: err.message });
  }
});

// POST /api/storage/:bucket/sign  { path, expiresIn }
// Issues a short-lived HMAC-signed URL, since expense-receipts (the only
// bucket this is used for today) is never served through the public route.
router.post('/:bucket/sign', requireAuth, async (req, res) => {
  try {
    const { bucket } = req.params;
    assertValidBucket(bucket);
    const { path: relPath, expiresIn } = req.body || {};
    if (!relPath) return res.status(400).json({ data: null, error: 'path is required' });
    if (!canRead(req.user, bucket, relPath)) {
      return res.status(403).json({ data: null, error: 'Not allowed to access this file' });
    }
    const { normalized } = safeResolve(bucket, relPath);
    const ttlSeconds = Number(expiresIn) > 0 ? Number(expiresIn) : 60;
    const expiresAt = Date.now() + ttlSeconds * 1000;
    const token = signToken(bucket, normalized, expiresAt);
    const signedUrl = `${req.protocol}://${req.get('host')}/api/storage/${bucket}/signed/${token}`;
    res.json({ data: { signedUrl }, error: null });
  } catch (err) {
    res.status(err.status || 500).json({ data: null, error: err.message });
  }
});

// GET /api/storage/:bucket/signed/:token - no auth header needed (used in
// <img src>), authorization is embedded in the signed token itself.
router.get('/:bucket/signed/:token', async (req, res) => {
  try {
    const { bucket, token } = req.params;
    assertValidBucket(bucket);
    const payload = verifyToken(token);
    if (!payload || payload.bucket !== bucket) {
      return res.status(403).json({ data: null, error: 'Invalid or expired link' });
    }
    const { resolved } = safeResolve(bucket, payload.path);
    res.sendFile(resolved, (err) => {
      if (err && !res.headersSent) res.status(404).json({ data: null, error: 'File not found' });
    });
  } catch (err) {
    res.status(err.status || 500).json({ data: null, error: err.message });
  }
});

// GET /api/storage/:bucket/list?path=...
router.get('/:bucket/list', optionalAuth, async (req, res) => {
  try {
    const { bucket } = req.params;
    assertValidBucket(bucket);
    const relPath = req.query.path || '';
    if (!canRead(req.user, bucket, relPath)) {
      return res.status(403).json({ data: null, error: 'Not allowed to list this path' });
    }
    const { resolved } = safeResolve(bucket, relPath);
    let entries = [];
    try {
      entries = await fsp.readdir(resolved, { withFileTypes: true });
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
    const data = entries.map((entry) => ({ name: entry.name, id: entry.name }));
    res.json({ data, error: null });
  } catch (err) {
    res.status(err.status || 500).json({ data: null, error: err.message });
  }
});

// POST /api/storage/:bucket/remove  { paths: string[] }
router.post('/:bucket/remove', requireAuth, async (req, res) => {
  try {
    const { bucket } = req.params;
    assertValidBucket(bucket);
    const paths = Array.isArray(req.body?.paths) ? req.body.paths : [];
    for (const p of paths) {
      if (!canDelete(req.user, bucket, p)) {
        return res.status(403).json({ data: null, error: `Not allowed to delete ${p}` });
      }
    }
    for (const p of paths) {
      const { resolved } = safeResolve(bucket, p);
      await fsp.rm(resolved, { force: true });
    }
    res.json({ data: { success: true }, error: null });
  } catch (err) {
    res.status(err.status || 500).json({ data: null, error: err.message });
  }
});

// --- signed-token helpers ---------------------------------------------------

function requireSignSecret() {
  const secret = process.env.STORAGE_SIGN_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('STORAGE_SIGN_SECRET (or JWT_SECRET) is not set');
  return secret;
}

function signToken(bucket, filePath, expiresAt) {
  const payload = Buffer.from(JSON.stringify({ bucket, path: filePath, expiresAt })).toString('base64url');
  const hmac = crypto.createHmac('sha256', requireSignSecret()).update(payload).digest('base64url');
  return `${payload}.${hmac}`;
}

function verifyToken(token) {
  try {
    const [payload, hmac] = String(token).split('.');
    if (!payload || !hmac) return null;
    const expected = crypto.createHmac('sha256', requireSignSecret()).update(payload).digest('base64url');
    const hmacBuf = Buffer.from(hmac);
    const expectedBuf = Buffer.from(expected);
    if (hmacBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(hmacBuf, expectedBuf)) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (Date.now() > data.expiresAt) return null;
    return data;
  } catch {
    return null;
  }
}

module.exports = router;
