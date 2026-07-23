const db = require('../db');
const { TokenError, verifyAccessToken } = require('../services/tokenService');

const getBearerToken = (req) => {
  const header = req.headers.authorization;
  if (!header) return null;

  const [scheme, token, extra] = header.trim().split(/\s+/);
  if (scheme !== 'Bearer' || !token || extra) return null;
  return token;
};

const loadAuthenticatedUser = (req, res, next, required) => {
  const token = getBearerToken(req);
  if (!token) {
    if (!required) {
      req.user = null;
      return next();
    }
    return res.status(401).json({
      success: false,
      code: 'AUTHENTICATION_REQUIRED',
      message: 'A valid Bearer access token is required',
    });
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (error) {
    const code = error instanceof TokenError ? error.code : 'INVALID_TOKEN';
    return res.status(401).json({ success: false, code, message: error.message });
  }

  return db.get(
    'SELECT id, username, email, phone, location, role, created_at FROM users WHERE id = ?',
    [payload.sub],
    (error, user) => {
      if (error) {
        console.error('Authentication database error:', error);
        return res.status(500).json({ success: false, message: 'Authentication service error' });
      }
      if (!user) {
        return res.status(401).json({
          success: false,
          code: 'INVALID_TOKEN_SUBJECT',
          message: 'The token user no longer exists',
        });
      }

      req.auth = payload;
      req.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        location: user.location,
        role: user.role || 'user',
        createdAt: user.created_at,
        isAuthenticated: true,
      };
      return next();
    }
  );
};

const authenticateUser = (req, res, next) => loadAuthenticatedUser(req, res, next, true);
const optionalAuth = (req, res, next) => loadAuthenticatedUser(req, res, next, false);

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `${roles.join(' or ')} role required`,
    });
  }
  return next();
};

const requireAdmin = requireRole('admin');

const requireOwnershipOrAdmin = (usernameParam = 'username') => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  const targetUsername = req.params[usernameParam] || req.body?.[usernameParam];
  if (!targetUsername) {
    return res.status(400).json({
      success: false,
      message: `${usernameParam} parameter required`,
    });
  }
  if (req.user.role === 'admin' || req.user.username === targetUsername) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Access denied: you can only access your own resources',
  });
};

const createRateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
  const requests = new Map();
  return (req, res, next) => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;
    const recent = (requests.get(clientId) || []).filter((timestamp) => timestamp > windowStart);
    if (recent.length >= max) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later',
        retryAfter: Math.ceil(windowMs / 1000),
      });
    }
    recent.push(now);
    requests.set(clientId, recent);
    return next();
  };
};

module.exports = {
  authenticateUser,
  createRateLimit,
  getBearerToken,
  optionalAuth,
  requireAdmin,
  requireOwnershipOrAdmin,
  requireRole,
};
