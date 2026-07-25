const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');

function createSecurityHeaders() {
  return helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'no-referrer' },
  });
}

function createRateLimiter(options = {}) {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: options.skip,
    handler: (req, res) => res.status(429).json({
      success: false,
      code: 'RATE_LIMIT_EXCEEDED',
      message: options.message || 'Too many requests. Please try again later.',
    }),
  });
}

function createApiRateLimiter(config) {
  return createRateLimiter({
    windowMs: config.api.rateLimitWindowMs,
    limit: config.api.rateLimit,
    skip: () => config.env === 'test',
  });
}

function createAuthRateLimiter(config) {
  return createRateLimiter({
    windowMs: config.api.rateLimitWindowMs,
    limit: config.api.authRateLimit,
    message: 'Too many authentication attempts. Please try again later.',
    skip: (req) => config.env === 'test' || req.method === 'OPTIONS',
  });
}

module.exports = {
  createApiRateLimiter,
  createAuthRateLimiter,
  createRateLimiter,
  createSecurityHeaders,
};
