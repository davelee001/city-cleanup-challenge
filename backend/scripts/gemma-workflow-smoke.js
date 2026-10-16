// Real local model + real application routes in a fresh, isolated synthetic demo DB.
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const assert = require('assert/strict');
const request = require('supertest');
const { performance } = require('perf_hooks');
const transport = require('../src/services/gemmaTransport');
const root = path.resolve(__dirname, '../..');
const session = `workflow-${Date.now()}`;
const directory = path.join(root, '.local-inference', session);
Object.assign(process.env, {
  NODE_ENV: 'test', DATABASE_CLIENT: 'sqlite', DATABASE_PATH: path.join(directory, 'demo.sqlite'),
  EVIDENCE_STORAGE_PATH: path.join(directory, 'evidence'),
  JWT_ACCESS_SECRET: crypto.randomBytes(32).toString('hex'), JWT_REFRESH_SECRET: crypto.randomBytes(32).toString('hex'),
  CELO_REWARDS_ENABLED: 'false', CELO_REWARD_DRY_RUN: 'true',
  USE_CLOUD_STORAGE: 'false', SENTRY_DSN: '', ENABLE_ANALYTICS: 'false', ENABLE_NOTIFICATIONS: 'false',
  GEMMA_VERIFICATION_ENABLED: 'true', GEMMA_PROVIDER: 'ollama',
  GEMMA_ENDPOINT: 'http://127.0.0.1:11434/api/chat', GEMMA_MODEL: 'gemma3:4b', GEMMA_TIMEOUT_MS: '600000',
  GEMMA_IMAGE_MAX_SIZE: '1024', GEMMA_MAX_OUTPUT_TOKENS: '384', GEMMA_CONTEXT_LENGTH: '2048', GEMMA_NUM_THREADS: '4',
});
delete process.env.GEMMA_API_KEY;

async function main() {
  await fs.mkdir(directory, { recursive: true });
  const nativeFetch = transport.fetch;
  const cold = process.argv.includes('--cold');
  if (cold) {
    const unloaded = await nativeFetch('http://127.0.0.1:11434/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gemma3:4b', stream: false, keep_alive: 0 }), signal: AbortSignal.timeout(30000) });
    assert.equal(unloaded.status, 200);
    await unloaded.json();
  }
  const modelStateBefore = await (await nativeFetch('http://127.0.0.1:11434/api/ps')).json();
  if (cold) assert.equal(modelStateBefore.models.length, 0);
  const db = require('../src/db');
  const { createApp } = require('../src/app');
  const app = createApp();
  const report = { label: 'ISOLATED SYNTHETIC WORKFLOW TEST; NOT REAL CLEANUP OR IMPACT', session,
    coldRequested: cold, modelStateBefore, checks: {} };
  let recording;
  let inferenceFinished;
  let submissionId;
  const cleanupController = new AbortController();
  transport.fetch = async (...args) => {
    const body = JSON.parse(args[1].body);
    report.inferenceRequest = { model: body.model, prompt: body.messages[0].content, schema: body.format, options: body.options };
    const pending = nativeFetch(args[0], { ...args[1], signal: AbortSignal.any([args[1].signal, cleanupController.signal]) });
    inferenceFinished = pending.then(() => {}, () => {});
    const response = await pending;
    recording = response.clone().text().then((text) => {
      if (body.stream) {
        const events = text.trim().split('\n').map((line) => JSON.parse(line));
        report.providerResponse = { ...events.at(-1), message: { content: events.map((event) => event.message?.content || '').join('') } };
      } else report.providerResponse = JSON.parse(text);
    }).catch(() => {});
    return response;
  };
  try {
    await db.ready;
    const users = {};
    for (const role of ['owner', 'other', 'reviewer']) {
      const username = `${role}-${Date.now()}`;
      const password = crypto.randomBytes(18).toString('hex');
      const signup = await request(app).post('/api/v1/signup').send({ username, password,
        email: `${username}@example.com`, phone: '+254700000000', location: 'Synthetic demo, Nairobi' });
      assert.equal(signup.statusCode, 200);
      if (role === 'reviewer') await new Promise((resolve, reject) => db.run('UPDATE users SET role=? WHERE username=?', ['admin', username], (error) => error ? reject(error) : resolve()));
      const login = await request(app).post('/api/v1/login').send({ username, password });
      assert.equal(login.statusCode, 200);
      users[role] = login.body.tokens.accessToken;
    }
    const buffers = await Promise.all(['before', 'after'].map((kind) => fs.readFile(path.join(root, `docs/demo/gemma/${kind}.png`))));
    report.inputHashes = buffers.map((buffer) => crypto.createHash('sha256').update(buffer).digest('hex'));
    const submit = () => {
      let outgoing = request(app).post('/api/v1/evidence/submissions').set('Authorization', `Bearer ${users.owner}`);
      for (const [key, value] of Object.entries({ wasteCategory: 'mixed', itemCount: '3', latitude: '-1.2864', longitude: '36.8172',
        locationAccuracy: '10', capturedBeforeAt: new Date(Date.now() - 60000).toISOString(), capturedAfterAt: new Date().toISOString(),
        notes: 'ILLUSTRATIVE TEST ONLY: synthetic images, counts, coordinates and timestamps. No actual cleanup or reward payout.' })) outgoing = outgoing.field(key, value);
      return outgoing.attach('beforePhoto', buffers[0], { filename: 'before.png', contentType: 'image/png' })
        .attach('afterPhoto', buffers[1], { filename: 'after.png', contentType: 'image/png' });
    };
    const began = performance.now();
    const submission = await submit();
    report.submissionResponseMs = performance.now() - began;
    assert.equal(submission.statusCode, 201);
    const id = submission.body.submission.id;
    submissionId = id;
    assert.equal(submission.body.submission.verification.smartVerification.status, 'pending');
    report.checks.savedBeforeInference = true;
    report.checks.anonymousDenied = (await request(app).get(`/api/v1/evidence/submissions/${id}`)).statusCode;
    report.checks.otherUserImageDenied = (await request(app).get(`/api/v1/evidence/submissions/${id}/images/before`).set('Authorization', `Bearer ${users.other}`)).statusCode;
    assert.equal(report.checks.anonymousDenied, 401);
    assert.equal(report.checks.otherUserImageDenied, 403);
    const privateImage = await request(app).get(`/api/v1/evidence/submissions/${id}/images/before`).set('Authorization', `Bearer ${users.owner}`);
    assert.equal(privateImage.statusCode, 200);
    assert.equal(privateImage.headers['cache-control'], 'private, no-store');
    report.checks.ownerImageAccessiblePrivately = true;
    const duplicate = await submit();
    assert.equal(duplicate.body.submission.status, 'rejected');
    assert.equal(duplicate.body.submission.verification.smartVerification.status, 'skipped');
    report.checks.duplicateRejectedWithoutAi = true;
    const live = request(app).post(`/api/v1/evidence/submissions/${id}/analyze`)
      .set('Authorization', `Bearer ${users.owner}`).then((response) => {
        assert.equal(response.statusCode, 200);
        report.liveEvents = response.text.trim().split('\n').map((line) => JSON.parse(line));
      });
    let detail;
    while (performance.now() - began < 630000) {
      detail = await request(app).get(`/api/v1/evidence/submissions/${id}`).set('Authorization', `Bearer ${users.owner}`);
      if (detail.body.submission.verification.smartVerification.status !== 'pending') break;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    report.aiCompletionObservedMs = performance.now() - began;
    await live;
    report.analysis = detail.body.submission.verification.smartVerification;
    assert.ok(['completed', 'unavailable'].includes(report.analysis.status), 'Real background inference must reach a terminal reviewable outcome');
    assert.equal(report.analysis.findings?.needsHumanReview ?? report.analysis.needsHumanReview, true);
    report.checks.modelOutputPassedQualityValidation = report.analysis.status === 'completed';
    assert.equal(detail.body.submission.status, 'manual_review');
    report.checks.noAutomaticApproval = true;
    const review = (decision) => request(app).patch(`/api/v1/evidence/submissions/${id}/review`)
      .set('Authorization', `Bearer ${users.reviewer}`).send({ decision, reason: 'ISOLATED SYNTHETIC TEST ONLY; not verification of actual cleanup. Rewards disabled.' });
    assert.equal((await request(app).patch(`/api/v1/evidence/submissions/${id}/review`).set('Authorization', `Bearer ${users.owner}`)
      .send({ decision: 'approved', reason: 'Attempt unauthorized self review.' })).statusCode, 403);
    assert.equal((await review('rejected')).body.submission.status, 'rejected');
    const appeal = () => request(app).post(`/api/v1/evidence/submissions/${id}/appeal`).set('Authorization', `Bearer ${users.owner}`)
      .send({ reason: 'ISOLATED DEMO: test existing human appeal workflow; images remain synthetic.' });
    assert.equal((await appeal()).body.submission.status, 'manual_review');
    assert.equal((await appeal()).statusCode, 409);
    assert.equal((await review('approved')).body.submission.status, 'approved');
    report.checks.authorizedReviewAndOneTimeAppeal = true;
    const paid = await new Promise((resolve, reject) => db.get("SELECT COUNT(*) AS count FROM reward_payments WHERE status='paid'", (error, row) => error ? reject(error) : resolve(row.count)));
    assert.equal(paid, 0);
    report.checks.noPaidRewards = true;
    report.passed = true;
  } catch (error) {
    report.passed = false;
    report.error = error.message;
    process.exitCode = 1;
  } finally {
    if (!report.passed) cleanupController.abort();
    await inferenceFinished;
    if (!report.passed && submissionId) {
      for (let attempt = 0; attempt < 100; attempt += 1) {
        const row = await new Promise((resolve) => db.get('SELECT verification_summary FROM cleanup_submissions WHERE id=?', [submissionId], (error, value) => resolve(value)));
        if (row && JSON.parse(row.verification_summary).smartVerification.status !== 'pending') break;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }
    await recording;
    transport.fetch = nativeFetch;
    await fs.writeFile(path.join(root, 'docs/demo/gemma/workflow-live.json'), `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report, null, 2));
    await new Promise((resolve) => db.close(resolve));
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
