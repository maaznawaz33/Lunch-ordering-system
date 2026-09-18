const { verifyAccessToken } = require('../utils/tokens');

/**
 * Requires a valid access token. Reads from Authorization: Bearer <token>
 * or from an httpOnly cookie named "accessToken" if present.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const bearerToken = header && header.startsWith('Bearer ') ? header.split(' ')[1] : null;
  const token = bearerToken || req.cookies?.accessToken;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }
}

/**
 * Restricts access to one or more roles. Must run after requireAuth.
 * Enforced server-side - never rely on the frontend hiding UI elements alone.
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
