#!/usr/bin/env node

const { appendEvidenceImages } = require('./lib/staging-images');

const confirmation = 'CREATE_STAGING_EVIDENCE';
const apiUrl = process.env.STAGING_API_URL;
const username = process.env.STAGING_TEST_USERNAME;
const password = process.env.STAGING_TEST_PASSWORD;
const beforePath = process.env.STAGING_BEFORE_IMAGE;
const afterPath = process.env.STAGING_AFTER_IMAGE;

if (process.env.STAGING_UPLOAD_CONFIRM !== confirmation) {
  console.error(`Set STAGING_UPLOAD_CONFIRM=${confirmation} to create a staging submission.`);
  process.exit(2);
}
for (const [name, value] of Object.entries({
  STAGING_API_URL: apiUrl,
  STAGING_TEST_USERNAME: username,
  STAGING_TEST_PASSWORD: password,
  STAGING_BEFORE_IMAGE: beforePath,
  STAGING_AFTER_IMAGE: afterPath,
})) {
  if (!value) {
    console.error(`${name} is required.`);
    process.exit(2);
  }
}
if (new URL(apiUrl).protocol !== 'https:') {
  throw new Error('STAGING_API_URL must use HTTPS.');
}

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(60_000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success === false) {
    throw new Error(`${response.status}: ${body.message || 'request failed'}`);
  }
  return body;
}

async function main() {
  const login = await jsonRequest(new URL('/api/v1/login', apiUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const form = new FormData();
  appendEvidenceImages(form, beforePath, afterPath);
  form.append('wasteCategory', process.env.STAGING_WASTE_CATEGORY || 'mixed');
  form.append('itemCount', process.env.STAGING_ITEM_COUNT || '5');
  form.append('latitude', process.env.STAGING_LATITUDE || '0.3476');
  form.append('longitude', process.env.STAGING_LONGITUDE || '32.5825');
  form.append('locationAccuracy', process.env.STAGING_LOCATION_ACCURACY || '10');
  const beforeTime = new Date(Date.now() - 10 * 60 * 1000);
  const afterTime = new Date(Date.now() - 5 * 60 * 1000);
  form.append('capturedBeforeAt', beforeTime.toISOString());
  form.append('capturedAfterAt', afterTime.toISOString());
  form.append('notes', `Staging upload drill ${new Date().toISOString()}`);

  const created = await jsonRequest(new URL('/api/v1/evidence/submissions', apiUrl), {
    method: 'POST',
    headers: { Authorization: `Bearer ${login.tokens.accessToken}` },
    body: form,
  });
  const submissionId = created.submission.id;
  const fetched = await jsonRequest(
    new URL(`/api/v1/evidence/submissions/${submissionId}`, apiUrl),
    { headers: { Authorization: `Bearer ${login.tokens.accessToken}` } },
  );
  for (const kind of ['before', 'after']) {
    const response = await fetch(
      new URL(`/api/v1/evidence/submissions/${submissionId}/images/${kind}`, apiUrl),
      {
        headers: { Authorization: `Bearer ${login.tokens.accessToken}` },
        signal: AbortSignal.timeout(60_000),
      },
    );
    if (!response.ok || !(response.headers.get('content-type') || '').startsWith('image/')) {
      throw new Error(`Unable to retrieve private ${kind} evidence image.`);
    }
  }
  console.log(JSON.stringify({
    status: 'passed',
    submissionId,
    submissionStatus: fetched.submission.status,
    privateImagesVerified: true,
  }, null, 2));
}

main().catch((error) => {
  console.error(`Staging upload smoke test failed: ${error.message}`);
  process.exit(1);
});
