#!/usr/bin/env node

const assert = require('node:assert/strict');
const tls = require('node:tls');

const baseUrl = process.env.SMOKE_BASE_URL;
const apiUrl = process.env.SMOKE_API_URL;
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 10_000);
const allowedOrigin = process.env.SMOKE_ORIGIN || baseUrl;

if (!baseUrl || !apiUrl) {
  console.error('SMOKE_BASE_URL and SMOKE_API_URL are required.');
  process.exit(2);
}

for (const [name, value] of [['SMOKE_BASE_URL', baseUrl], ['SMOKE_API_URL', apiUrl]]) {
  const url = new URL(value);
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw new Error(`${name} must use HTTPS outside local testing.`);
  }
}

async function request(name, url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(timeoutMs),
    redirect: 'error',
  });
  return { name, response, body: await response.text() };
}

function checkTlsCertificate(url) {
  const target = new URL(url);
  if (target.protocol !== 'https:') return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const socket = tls.connect({
      host: target.hostname,
      port: Number(target.port || 443),
      servername: target.hostname,
      rejectUnauthorized: true,
      timeout: timeoutMs,
    });
    socket.once('secureConnect', () => {
      const certificate = socket.getPeerCertificate();
      const validTo = Date.parse(certificate.valid_to);
      socket.end();
      if (!certificate.subjectaltname || !Number.isFinite(validTo)) {
        reject(new Error(`TLS certificate metadata is incomplete for ${target.hostname}`));
        return;
      }
      const daysRemaining = (validTo - Date.now()) / (24 * 60 * 60 * 1000);
      if (daysRemaining < 7) {
        reject(new Error(`TLS certificate for ${target.hostname} expires in under 7 days`));
        return;
      }
      resolve({
        host: target.hostname,
        validTo: new Date(validTo).toISOString(),
        daysRemaining: Number(daysRemaining.toFixed(1)),
      });
    });
    socket.once('timeout', () => socket.destroy(new Error('TLS connection timed out')));
    socket.once('error', reject);
  });
}

async function main() {
  const certificates = await Promise.all([
    checkTlsCertificate(baseUrl),
    checkTlsCertificate(apiUrl),
  ]);
  const frontendHealth = await request('frontend health', new URL('/health', baseUrl));
  assert.equal(frontendHealth.response.status, 200, 'frontend /health must return 200');

  const health = await request('API health', new URL('/health', apiUrl));
  assert.equal(health.response.status, 200, 'API /health must return 200');
  assert.equal(JSON.parse(health.body).status, 'ok', 'API health status must be ok');

  const ready = await request('API readiness', new URL('/ready', apiUrl));
  assert.equal(ready.response.status, 200, 'API /ready must return 200');
  assert.equal(JSON.parse(ready.body).status, 'ready', 'API readiness status must be ready');

  const privateRoute = await request(
    'private endpoint protection',
    new URL('/api/v1/evidence/submissions', apiUrl)
  );
  assert.equal(privateRoute.response.status, 401, 'private endpoint must reject anonymous access');

  const metrics = await request('metrics protection', new URL('/api/metrics', apiUrl));
  assert.ok(
    [401, 404].includes(metrics.response.status),
    'metrics must require a token or be disabled'
  );

  const cors = await request('CORS allowlist', new URL('/health', apiUrl), {
    headers: { Origin: allowedOrigin },
  });
  const allowOrigin = cors.response.headers.get('access-control-allow-origin');
  assert.notEqual(allowOrigin, '*', 'wildcard CORS must never be returned');
  assert.equal(allowOrigin, allowedOrigin, 'CORS must return the requesting allowed origin');
  const deniedCors = await request('CORS denylist', new URL('/health', apiUrl), {
    headers: { Origin: 'https://untrusted.invalid' },
  });
  assert.notEqual(
    deniedCors.response.headers.get('access-control-allow-origin'),
    'https://untrusted.invalid',
    'CORS must not approve an untrusted origin',
  );

  console.log(JSON.stringify({
    status: 'passed',
    checkedAt: new Date().toISOString(),
    checks: [
      'TLS certificate validity',
      'frontend health',
      'API health',
      'API readiness',
      'private endpoint protection',
      'metrics protection',
      'CORS allowlist',
      'CORS denylist',
    ],
    certificates: certificates.filter(Boolean),
  }, null, 2));
}

main().catch((error) => {
  console.error(`Smoke test failed: ${error.message}`);
  process.exit(1);
});
