require('dotenv').config();
const fetch = require('node-fetch');

const baseUrl = String(
  process.env.CITY_CLEANUP_API_URL || 'http://localhost:3001'
).replace(/\/+$/, '');
const adminToken = process.env.CITY_CLEANUP_ADMIN_TOKEN;

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success === false) {
    throw new Error(`${path} failed (${response.status}): ${body.message || 'unknown error'}`);
  }
  return body;
}

async function main() {
  if (!adminToken) {
    throw new Error('CITY_CLEANUP_ADMIN_TOKEN is required');
  }
  const health = await request('/health');
  const readiness = await request('/ready');
  const operations = await request('/api/v1/rewards/admin/summary');
  if (!operations.summary.controls.paused) {
    throw new Error('Reward payouts must be paused before the pilot smoke test');
  }
  const preflight = await request('/api/v1/rewards/admin/preflight', {
    method: 'POST',
  });
  const result = {
    health: health.status,
    readiness: readiness.status,
    payoutsPaused: operations.summary.controls.paused,
    preflightReady: preflight.preflight.ready,
    checks: preflight.preflight.checks,
  };
  console.log(JSON.stringify(result, null, 2));
  if (!preflight.preflight.ready) process.exitCode = 1;
}

main().catch((error) => {
  console.error('Pilot smoke test failed:', error.message);
  process.exitCode = 1;
});
