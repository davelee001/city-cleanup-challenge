const crypto = require('crypto');

const CATEGORY_ACTIONS = [
  {
    category: 'authentication',
    pattern: /^\/api\/v1\/(signup|login|auth\/(?:refresh|logout))$/,
  },
  {
    category: 'moderation',
    pattern: /^\/api\/v1\/evidence\/submissions\/[^/]+\/review$/,
  },
];

function sanitizePath(originalUrl = '') {
  return String(originalUrl).split('?')[0].slice(0, 500);
}

function classifyRequest(req) {
  const requestPath = sanitizePath(req.originalUrl || req.url);
  for (const rule of CATEGORY_ACTIONS) {
    if (rule.pattern.test(requestPath)) return rule.category;
  }
  if (req.method === 'DELETE') return 'destructive';
  if (
    requestPath.startsWith('/api/v1/admin/')
    || requestPath.includes('/admin/')
    || (
      req.user?.role === 'admin'
      && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)
    )
  ) {
    return 'administration';
  }
  return null;
}

function hashValue(value, secret) {
  if (!value || !secret) return null;
  return crypto.createHmac('sha256', secret).update(String(value)).digest('hex');
}

function run(db, sql, params) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onComplete(error) {
      if (error) reject(error);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function all(db, sql, params) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) reject(error);
      else resolve(rows);
    });
  });
}

async function recordAuditEvent(db, event) {
  const details = event.details ? JSON.stringify(event.details) : null;
  return run(
    db,
    `INSERT INTO system_audit_events (
      actor_user_id, actor_username, category, action, outcome, request_id,
      request_method, request_path, response_status, ip_hash, user_agent_hash, details
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      event.actorUserId || null,
      event.actorUsername || null,
      event.category,
      event.action,
      event.outcome,
      event.requestId,
      event.requestMethod,
      event.requestPath,
      event.responseStatus,
      event.ipHash || null,
      event.userAgentHash || null,
      details,
    ],
  );
}

function auditMiddleware(db, options = {}) {
  const ipHashSecret = options.ipHashSecret || process.env.AUDIT_IP_HASH_SECRET;
  return (req, res, next) => {
    req.auditRequestId = req.headers['x-request-id'] || crypto.randomUUID();
    res.setHeader('X-Request-ID', req.auditRequestId);

    res.once('finish', () => {
      const category = classifyRequest(req);
      if (!category) return;

      const actor = req.auditActor || req.user || {};
      const attemptedUsername = category === 'authentication'
        ? String(req.body?.username || '').trim().slice(0, 100)
        : null;
      const requestPath = sanitizePath(req.originalUrl || req.url);
      recordAuditEvent(db, {
        actorUserId: actor.id,
        actorUsername: actor.username || attemptedUsername || null,
        category,
        action: `${req.method} ${requestPath}`,
        outcome: res.statusCode < 400 ? 'success' : 'failure',
        requestId: req.auditRequestId,
        requestMethod: req.method,
        requestPath,
        responseStatus: res.statusCode,
        ipHash: hashValue(req.ip, ipHashSecret),
        userAgentHash: hashValue(req.headers['user-agent'], ipHashSecret),
        details: {
          role: actor.role || null,
        },
      }).catch((error) => {
        console.error('Unable to persist system audit event:', error.message);
      });
    });

    next();
  };
}

async function listAuditEvents(db, filters = {}) {
  const limit = Math.min(Math.max(Number(filters.limit) || 50, 1), 200);
  const offset = Math.max(Number(filters.offset) || 0, 0);
  const clauses = [];
  const params = [];

  if (filters.category) {
    clauses.push('category = ?');
    params.push(filters.category);
  }
  if (filters.actorUserId) {
    clauses.push('actor_user_id = ?');
    params.push(filters.actorUserId);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  params.push(limit, offset);

  const rows = await all(
    db,
    `SELECT id, actor_user_id, actor_username, category, action, outcome,
            request_id, request_method, request_path, response_status,
            ip_hash, user_agent_hash, details, created_at
       FROM system_audit_events
       ${where}
      ORDER BY created_at DESC, id DESC
      LIMIT ? OFFSET ?`,
    params,
  );

  return rows.map((row) => ({
    ...row,
    details: row.details ? JSON.parse(row.details) : null,
  }));
}

module.exports = {
  auditMiddleware,
  classifyRequest,
  hashValue,
  listAuditEvents,
  recordAuditEvent,
  sanitizePath,
};
