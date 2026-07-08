const { verifyAccessToken } = require('../lib/tokens');

function getUserFromHeader(req) {
  const header = req.headers.authorization || '';
  const [, token] = header.split(' ');
  if (!token) return null;
  try {
    const payload = verifyAccessToken(token);
    return { id: payload.sub, email: payload.email, roles: payload.roles || [] };
  } catch {
    return null;
  }
}

// Attaches req.user if a valid access token is present; never blocks the request.
// Use for routes that support both guest and authenticated access (e.g. booking).
function optionalAuth(req, res, next) {
  req.user = getUserFromHeader(req);
  next();
}

// Blocks the request with 401 unless a valid access token is present.
function requireAuth(req, res, next) {
  const user = getUserFromHeader(req);
  if (!user) return res.status(401).json({ data: null, error: 'Not authenticated' });
  req.user = user;
  next();
}

function hasRole(user, role) {
  if (!user) return false;
  return user.roles.includes(role) || user.roles.includes('super_admin');
}

// Blocks with 403 unless the authenticated user has one of the given roles
// (super_admin always passes, matching the has_role() SQL function's behavior).
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.some((r) => hasRole(req.user, r))) {
      return res.status(403).json({ data: null, error: 'Forbidden' });
    }
    next();
  };
}

module.exports = { optionalAuth, requireAuth, requireRole, hasRole };
