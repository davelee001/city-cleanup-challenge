const express = require('express');
const request = require('supertest');
const {
  createRateLimiter,
  createSecurityHeaders,
} = require('../../src/middleware/security');

describe('HTTP security middleware', () => {
  it('returns security headers without exposing Express', async () => {
    const app = express();
    app.disable('x-powered-by');
    app.use(createSecurityHeaders());
    app.get('/health', (req, res) => res.json({ status: 'ok' }));

    const response = await request(app).get('/health');

    expect(response.statusCode).toBe(200);
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('returns a stable JSON error after the configured request limit', async () => {
    const app = express();
    app.use(createRateLimiter({ windowMs: 60_000, limit: 2 }));
    app.get('/limited', (req, res) => res.json({ success: true }));

    await request(app).get('/limited').expect(200);
    await request(app).get('/limited').expect(200);
    const response = await request(app).get('/limited');

    expect(response.statusCode).toBe(429);
    expect(response.body).toMatchObject({
      success: false,
      code: 'RATE_LIMIT_EXCEEDED',
    });
    expect(response.headers['ratelimit-policy']).toBeDefined();
  });
});
