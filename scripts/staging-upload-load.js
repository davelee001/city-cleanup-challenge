#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { appendEvidenceImages } = require('./lib/staging-images');

const confirmation = 'CREATE_STAGING_LOAD_EVIDENCE';
const apiUrl = process.env.STAGING_API_URL;
const username = process.env.STAGING_TEST_USERNAME;
const password = process.env.STAGING_TEST_PASSWORD;
const fixtureManifestPath = process.env.STAGING_UPLOAD_FIXTURE_MANIFEST;
const concurrency = Number(process.env.STAGING_UPLOAD_CONCURRENCY || 2);
const timeoutMs = Number(process.env.STAGING_UPLOAD_TIMEOUT_MS || 60_000);
const maxErrorRate = Number(process.env.STAGING_UPLOAD_MAX_ERROR_RATE || 0);
const maxP95Ms = Number(process.env.STAGING_UPLOAD_MAX_P95_MS || 15_000);

if (process.env.STAGING_UPLOAD_LOAD_CONFIRM !== confirmation) {
  console.error(`Set STAGING_UPLOAD_LOAD_CONFIRM=${confirmation} to create load-test records.`);
  process.exit(2);
}
for (const [name, value] of Object.entries({
  STAGING_API_URL: apiUrl,
  STAGING_TEST_USERNAME: username,
  STAGING_TEST_PASSWORD: password,
  STAGING_UPLOAD_FIXTURE_MANIFEST: fixtureManifestPath,
})) {
  if (!value) {
    console.error(`${name} is required.`);
    process.exit(2);
  }
}
const fixtureManifest = JSON.parse(
  fs.readFileSync(path.resolve(fixtureManifestPath), 'utf8'),
);
if (!Array.isArray(fixtureManifest) || fixtureManifest.length === 0) {
  throw new Error('The upload fixture manifest must be a non-empty JSON array.');
}
const submissions = Number(
  process.env.STAGING_UPLOAD_SUBMISSIONS || fixtureManifest.length,
);
const target = new URL(apiUrl);
if (target.protocol !== 'https:') throw new Error('STAGING_API_URL must use HTTPS.');
if (
  !target.hostname.toLowerCase().includes('staging')
  && process.env.ALLOW_NON_STAGING_UPLOAD_LOAD !== 'true'
) {
  throw new Error('Upload load is restricted to a hostname containing "staging".');
}
if (
  !Number.isInteger(concurrency) || concurrency < 1 || concurrency > 10
  || !Number.isInteger(submissions) || submissions < 1 || submissions > 100
  || !Number.isFinite(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 120_000
) {
  throw new Error('Use 1-10 workers, 1-100 submissions, and a 1-120 second timeout.');
}
if (fixtureManifest.length < submissions) {
  throw new Error('Provide one unique before/after fixture pair for every submission.');
}
for (const [index, fixture] of fixtureManifest.slice(0, submissions).entries()) {
  if (!fixture?.before || !fixture?.after) {
    throw new Error(`Fixture ${index + 1} must provide before and after image paths.`);
  }
}

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success === false) {
    throw new Error(`${response.status}: ${body.message || 'request failed'}`);
  }
  return body;
}

function createForm(index) {
  const form = new FormData();
  appendEvidenceImages(
    form,
    fixtureManifest[index].before,
    fixtureManifest[index].after,
  );
  form.append('wasteCategory', process.env.STAGING_WASTE_CATEGORY || 'mixed');
  form.append('itemCount', process.env.STAGING_ITEM_COUNT || '5');
  form.append('latitude', process.env.STAGING_LATITUDE || '0.3476');
  form.append('longitude', process.env.STAGING_LONGITUDE || '32.5825');
  form.append('locationAccuracy', process.env.STAGING_LOCATION_ACCURACY || '10');
  const capturedAt = Date.now() - ((index + 20) * 60 * 1000);
  form.append('capturedBeforeAt', new Date(capturedAt).toISOString());
  form.append('capturedAfterAt', new Date(capturedAt + 5 * 60 * 1000).toISOString());
  form.append('notes', `Approved staging upload load record ${index + 1}`);
  return form;
}

async function main() {
  const login = await jsonRequest(new URL('/api/v1/login', apiUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const token = login.tokens.accessToken;
  const queue = Array.from({ length: submissions }, (_, index) => index);
  const latencies = [];
  const createdIds = [];
  const errors = [];

  async function worker() {
    while (queue.length) {
      const index = queue.shift();
      const startedAt = performance.now();
      try {
        const result = await jsonRequest(new URL('/api/v1/evidence/submissions', apiUrl), {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: createForm(index),
        });
        createdIds.push(result.submission.id);
      } catch (error) {
        errors.push(error.message);
      } finally {
        latencies.push(performance.now() - startedAt);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  latencies.sort((a, b) => a - b);
  const p95Index = Math.max(0, Math.ceil(latencies.length * 0.95) - 1);
  const errorRate = errors.length / submissions;
  const result = {
    status: errorRate <= maxErrorRate && latencies[p95Index] <= maxP95Ms ? 'passed' : 'failed',
    submissions,
    created: createdIds.length,
    failed: errors.length,
    errorRate: Number(errorRate.toFixed(4)),
    p95Ms: Number(latencies[p95Index].toFixed(2)),
    thresholds: { maxErrorRate, maxP95Ms },
    createdIds,
    sampleErrors: errors.slice(0, 5),
  };
  console.log(JSON.stringify(result, null, 2));
  if (result.status !== 'passed') process.exit(1);
}

main().catch((error) => {
  console.error(`Staging upload load failed: ${error.message}`);
  process.exit(1);
});
