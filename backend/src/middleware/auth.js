/**
 * Authentication middleware for City Cleanup Challenge
 * Handles user authentication and authorization for API endpoints
 */

/**
 * Authenticate user from request body or Authorization header
 * Adds user object to req.user for downstream middleware
 */
const authenticateUser = (req, res, next) => {
    let username = null;
    let token = null;

    // Try to get username from request body (existing pattern)
    if (req.body && req.body.username) {
        username = req.body.username;
    }

    // Try to get from Authorization header if not in body
    if (!username && req.headers.authorization) {
        const authHeader = req.headers.authorization;
        
        // Handle Bearer token format
        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
            // For now, use the token as username (simplified approach)
            // In production, this should decode/verify JWT tokens
            username = token;
        } else {
            // Handle Basic auth or direct username
            username = authHeader;
        }
    }

    // Try to get from URL params if still not found 
    if (!username && req.params.username) {
        username = req.params.username;
    }

    // If no username found, return unauthorized
    if (!username) {
        return res.status(401).json({ 
            success: false, 
            message: 'Authentication required. Provide username in body, header, or URL.' 
        });
    }

    // Get database instance from app (passed to routes)
    const db = req.app.get('db') || require('../db');

    // Verify user exists and get their role
    db.get(
        'SELECT id, username, email, role, created_at FROM users WHERE username = ?',
        [username],
        (err, user) => {
            if (err) {
                console.error('Authentication database error:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Authentication service error' 
                });
            }

            if (!user) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Invalid user credentials' 
                });
            }

            // Add user to request object for downstream middleware
            req.user = {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role || 'user',
                createdAt: user.created_at,
                isAuthenticated: true
            };

            // Continue to next middleware
            next();
        }
    );
};

/**
 * Require admin role for endpoint access
 */
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            success: false, 
            message: 'Authentication required' 
        });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({ 
            success: false, 
            message: 'Admin access required' 
        });
    }

    next();
};

/**
 * Verify user can access their own resources or is admin
 */
const requireOwnershipOrAdmin = (usernameParam = 'username') => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Authentication required' 
            });
        }

        const targetUsername = req.params[usernameParam] || req.body[usernameParam];
        
        if (!targetUsername) {
            return res.status(400).json({ 
                success: false, 
                message: `${usernameParam} parameter required` 
            });
        }

        // Allow if accessing own resources or is admin
        if (req.user.username === targetUsername || req.user.role === 'admin') {
            next();
        } else {
            res.status(403).json({ 
                success: false, 
                message: 'Access denied: can only access your own resources' 
            });
        }
    };
};

/**
 * Optional authentication - adds user if present but doesn't require it
 */
const optionalAuth = (req, res, next) => {
    let username = null;

    // Try to get username from various sources
    if (req.body && req.body.username) {
        username = req.body.username;
    } else if (req.headers.authorization) {
        const authHeader = req.headers.authorization;
        if (authHeader.startsWith('Bearer ')) {
            username = authHeader.substring(7);
        } else {
            username = authHeader;
        }
    } else if (req.params.username) {
        username = req.params.username;
    }

    // If no username, continue without authentication
    if (!username) {
        req.user = null;
        return next();
    }

    // If username provided, verify it
    const db = req.app.get('db') || require('../db');

    db.get(
        'SELECT id, username, email, role, created_at FROM users WHERE username = ?',
        [username],
        (err, user) => {
            if (err || !user) {
                req.user = null;
            } else {
                req.user = {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role || 'user',
                    createdAt: user.created_at,
                    isAuthenticated: true
                };
            }
            next();
        }
    );
};

/**
 * Rate limiting middleware (simple in-memory implementation)
 */
const createRateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
    const requests = new Map();

    return (req, res, next) => {
        const clientId = req.ip || 'unknown';
        const now = Date.now();
        const windowStart = now - windowMs;

        // Clean old requests
        if (requests.has(clientId)) {
            const clientRequests = requests.get(clientId);
            const validRequests = clientRequests.filter(timestamp => timestamp > windowStart);
            requests.set(clientId, validRequests);
        } else {
            requests.set(clientId, []);
        }

        const clientRequestCount = requests.get(clientId).length;

        if (clientRequestCount >= max) {
            return res.status(429).json({
                success: false,
                message: 'Too many requests, please try again later',
                retryAfter: Math.ceil(windowMs / 1000)
            });
        }

        // Add current request
        requests.get(clientId).push(now);
        next();
    };
};

module.exports = {
    authenticateUser,
    requireAdmin,
    requireOwnershipOrAdmin,
    optionalAuth,
    createRateLimit
};