const request = require('supertest');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { generatePrivateKey, privateKeyToAccount } = require('viem/accounts');
const { createApp } = require('../src/app');
const db = require('../src/db');
const { EVIDENCE_ROOT } = require('../src/routes/evidence');

jest.setTimeout(30_000);

const app = createApp();
const suffix = `${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 7)}`;
const signupData = (username, overrides = {}) => ({
  username,
  password: 'test-password',
  email: `${username}@example.com`,
  phone: '+256 700 123 456',
  location: 'Kampala, Uganda',
  ...overrides,
});

describe('API Endpoints', () => {
  it('should return 200 for health check', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('rejects oversized JSON bodies with a stable API error', async () => {
    const response = await request(app)
      .post('/api/v1/signup')
      .send({ payload: 'x'.repeat((1024 * 1024) + 1) });

    expect(response.statusCode).toBe(413);
    expect(response.body.code).toBe('REQUEST_BODY_TOO_LARGE');
  });

  it('should signup a new user', async () => {
    const res = await request(app)
      .post('/api/v1/signup')
      .send(signupData(`testuser-${suffix}`));
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.username).toBe(`testuser-${suffix}`);
    expect(res.body.user.email).toBe(`testuser-${suffix}@example.com`);
    expect(res.body.user.phone).toBe('+256 700 123 456');
    expect(res.body.user.location).toBe('Kampala, Uganda');
  });

  it('exposes application and reward metrics for the internal monitoring stack', async () => {
    const response = await request(app).get('/api/metrics');
    expect(response.statusCode).toBe(200);
    expect(response.text).toContain('city_cleanup_http_requests_total');
    expect(response.text).toContain('city_cleanup_reward_payouts_paused');
    expect(response.headers['content-type']).toContain('text/plain');
  });

  it('should not signup with existing username', async () => {
    const username = `dupeuser-${suffix}`;
    await request(app).post('/api/v1/signup').send(signupData(username, { password: 'first-password' }));
    const res = await request(app)
      .post('/api/v1/signup')
      .send(signupData(username, {
        password: 'second-password',
        email: `other-${suffix}@example.com`,
      }));
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should login with correct credentials', async () => {
    const username = `loginuser-${suffix}`;
    await request(app).post('/api/v1/signup').send(signupData(username, { password: 'login-password' }));
    const res = await request(app).post('/api/v1/login').send({ username, password: 'login-password' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.tokens.accessToken).toBeTruthy();
    expect(res.body.tokens.refreshToken).toBeTruthy();
    expect(res.body.tokens.tokenType).toBe('Bearer');
  });

  it('should reject signup when contact details are missing', async () => {
    const res = await request(app)
      .post('/api/v1/signup')
      .send({ username: `missing-${suffix}`, password: 'test-password' });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should not login with wrong credentials', async () => {
    const res = await request(app).post('/api/v1/login').send({ username: `nouser-${suffix}`, password: 'wrong-password' });
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe('JWT authentication and authorization', () => {
  const owner = `owner-${suffix}`;
  const otherUser = `other-${suffix}`;
  const adminUser = `admin-${suffix}`;
  let ownerTokens;
  let otherTokens;
  let adminTokens;
  let postId;
  const walletAccount = privateKeyToAccount(generatePrivateKey());
  const wrongWalletAccount = privateKeyToAccount(generatePrivateKey());

  beforeAll(async () => {
    await request(app).post('/api/v1/signup').send(signupData(owner));
    await request(app).post('/api/v1/signup').send(signupData(otherUser));
    await request(app).post('/api/v1/signup').send(signupData(adminUser));
    await new Promise((resolve, reject) => {
      db.run('UPDATE users SET role = ? WHERE username = ?', ['admin', adminUser], (error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    const ownerLogin = await request(app)
      .post('/api/v1/login')
      .send({ username: owner, password: 'test-password' });
    const otherLogin = await request(app)
      .post('/api/v1/login')
      .send({ username: otherUser, password: 'test-password' });
    const adminLogin = await request(app)
      .post('/api/v1/login')
      .send({ username: adminUser, password: 'test-password' });
    ownerTokens = ownerLogin.body.tokens;
    otherTokens = otherLogin.body.tokens;
    adminTokens = adminLogin.body.tokens;
  });

  it('rejects private endpoints without an access token', async () => {
    const response = await request(app).get('/api/v1/posts');
    expect(response.statusCode).toBe(401);
    expect(response.body.code).toBe('AUTHENTICATION_REQUIRED');
  });

  it('rejects invalid access tokens', async () => {
    const response = await request(app)
      .get('/api/v1/posts')
      .set('Authorization', 'Bearer not-a-valid-jwt');
    expect(response.statusCode).toBe(401);
    expect(response.body.code).toBe('INVALID_TOKEN');
  });

  it('accepts a signed access token and derives resource ownership from it', async () => {
    const response = await request(app)
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${ownerTokens.accessToken}`)
      .send({ username: otherUser, content: 'Owned by the access-token user' });
    expect(response.statusCode).toBe(200);
    expect(response.body.post.username).toBe(owner);
    postId = response.body.post.id;
  });

  it('prevents another user from changing an owned resource', async () => {
    const response = await request(app)
      .put(`/api/v1/posts/${postId}`)
      .set('Authorization', `Bearer ${otherTokens.accessToken}`)
      .send({ content: 'Unauthorized update' });
    expect(response.statusCode).toBe(403);
  });

  it('prevents a standard user from accessing admin routes', async () => {
    const response = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${ownerTokens.accessToken}`);
    expect(response.statusCode).toBe(403);
  });

  it('allows a current administrator to access role-protected routes', async () => {
    const response = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminTokens.accessToken}`);
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('records authentication and administrative activity in the system audit log', async () => {
    const forbidden = await request(app)
      .get('/api/v1/admin/audit-events')
      .set('Authorization', `Bearer ${ownerTokens.accessToken}`);
    expect(forbidden.statusCode).toBe(403);

    const response = await request(app)
      .get('/api/v1/admin/audit-events?category=authentication&limit=100')
      .set('Authorization', `Bearer ${adminTokens.accessToken}`);
    expect(response.statusCode).toBe(200);
    expect(response.body.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        actor_username: adminUser,
        category: 'authentication',
        outcome: 'success',
      }),
    ]));
    expect(JSON.stringify(response.body.events)).not.toContain('test-password');
  });

  it('protects the reward policy and exposes it to authenticated users', async () => {
    const unauthenticated = await request(app).get('/api/v1/rewards/policy');
    expect(unauthenticated.statusCode).toBe(401);

    const authenticated = await request(app)
      .get('/api/v1/rewards/policy')
      .set('Authorization', `Bearer ${ownerTokens.accessToken}`);
    expect(authenticated.statusCode).toBe(200);
    expect(authenticated.body.policy).toMatchObject({
      version: 'celo-testnet-v1',
      network: 'Celo Sepolia',
      baseRewardCelo: '0.01',
    });
  });

  it('restricts reward creation and payout to administrators', async () => {
    const response = await request(app)
      .post('/api/v1/rewards/submissions/999999/claim')
      .set('Authorization', `Bearer ${ownerTokens.accessToken}`);
    expect(response.statusCode).toBe(403);
  });

  it('provides administrator-only reward pause controls and an audit trail', async () => {
    const forbidden = await request(app)
      .get('/api/v1/rewards/admin/summary')
      .set('Authorization', `Bearer ${ownerTokens.accessToken}`);
    expect(forbidden.statusCode).toBe(403);

    const initial = await request(app)
      .get('/api/v1/rewards/admin/summary')
      .set('Authorization', `Bearer ${adminTokens.accessToken}`);
    expect(initial.statusCode).toBe(200);
    expect(initial.body.summary.controls.paused).toBe(true);

    const resumed = await request(app)
      .put('/api/v1/rewards/admin/controls')
      .set('Authorization', `Bearer ${adminTokens.accessToken}`)
      .send({ paused: false, reason: 'Controlled testnet operations test' });
    expect(resumed.statusCode).toBe(200);
    expect(resumed.body.controls.paused).toBe(false);

    const invalidPause = await request(app)
      .put('/api/v1/rewards/admin/controls')
      .set('Authorization', `Bearer ${adminTokens.accessToken}`)
      .send({ paused: true });
    expect(invalidPause.statusCode).toBe(400);
    expect(invalidPause.body.code).toBe('PAUSE_REASON_REQUIRED');

    const paused = await request(app)
      .put('/api/v1/rewards/admin/controls')
      .set('Authorization', `Bearer ${adminTokens.accessToken}`)
      .send({ paused: true, reason: 'End of automated operations test' });
    expect(paused.statusCode).toBe(200);
    expect(paused.body.controls.paused).toBe(true);

    const audited = await request(app)
      .get('/api/v1/rewards/admin/summary')
      .set('Authorization', `Bearer ${adminTokens.accessToken}`);
    expect(audited.body.summary.recentAudit.map((entry) => entry.action)).toEqual(
      expect.arrayContaining(['rewards_resumed', 'rewards_paused'])
    );
  });

  it('verifies wallet ownership with a one-time signed challenge', async () => {
    const unverified = await request(app)
      .get('/api/v1/wallet')
      .set('Authorization', `Bearer ${ownerTokens.accessToken}`);
    expect(unverified.statusCode).toBe(200);
    expect(unverified.body.wallet.verified).toBe(false);

    const challengeResponse = await request(app)
      .post('/api/v1/wallet/challenge')
      .set('Authorization', `Bearer ${ownerTokens.accessToken}`)
      .send({ address: walletAccount.address });
    expect(challengeResponse.statusCode).toBe(201);
    expect(challengeResponse.body.challenge.chainId).toBe(11_142_220);
    const { challengeId, message } = challengeResponse.body.challenge;

    const wrongSignature = await wrongWalletAccount.signMessage({ message });
    const rejected = await request(app)
      .post('/api/v1/wallet/verify')
      .set('Authorization', `Bearer ${ownerTokens.accessToken}`)
      .send({ challengeId, signature: wrongSignature });
    expect(rejected.statusCode).toBe(401);
    expect(rejected.body.code).toBe('SIGNATURE_MISMATCH');

    const signature = await walletAccount.signMessage({ message });
    const [firstAttempt, secondAttempt] = await Promise.all([
      request(app)
        .post('/api/v1/wallet/verify')
        .set('Authorization', `Bearer ${ownerTokens.accessToken}`)
        .send({ challengeId, signature }),
      request(app)
        .post('/api/v1/wallet/verify')
        .set('Authorization', `Bearer ${ownerTokens.accessToken}`)
        .send({ challengeId, signature }),
    ]);
    expect([firstAttempt.statusCode, secondAttempt.statusCode].sort()).toEqual([200, 409]);
    const verified = firstAttempt.statusCode === 200 ? firstAttempt : secondAttempt;
    expect(verified.statusCode).toBe(200);
    expect(verified.body.wallet).toMatchObject({
      address: walletAccount.address,
      verified: true,
      chainId: 11_142_220,
    });

    const replay = await request(app)
      .post('/api/v1/wallet/verify')
      .set('Authorization', `Bearer ${ownerTokens.accessToken}`)
      .send({ challengeId, signature });
    expect(replay.statusCode).toBe(409);
    expect(replay.body.code).toBe('CHALLENGE_USED');
  });

  it('prevents a verified wallet from being shared across accounts', async () => {
    const response = await request(app)
      .post('/api/v1/wallet/challenge')
      .set('Authorization', `Bearer ${otherTokens.accessToken}`)
      .send({ address: walletAccount.address });
    expect(response.statusCode).toBe(409);
    expect(response.body.code).toBe('WALLET_ALREADY_LINKED');
  });

  it('returns member reward history and safely removes an idle wallet', async () => {
    const rewards = await request(app)
      .get('/api/v1/rewards/mine')
      .set('Authorization', `Bearer ${ownerTokens.accessToken}`);
    expect(rewards.statusCode).toBe(200);
    expect(rewards.body.payments).toEqual([]);

    const ownerRecord = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM users WHERE username = ?', [owner], (error, row) => {
        if (error) reject(error);
        else resolve(row);
      });
    });
    const temporarySubmissionId = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO cleanup_submissions (
          user_id, waste_category, latitude, longitude, location_accuracy,
          captured_before_at, captured_after_at, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ownerRecord.id,
          'plastic',
          0.3476,
          32.5825,
          8,
          new Date(Date.now() - 60_000).toISOString(),
          new Date().toISOString(),
          'approved',
        ],
        function inserted(error) {
          if (error) reject(error);
          else resolve(this.lastID);
        }
      );
    });
    const temporaryPaymentId = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO reward_payments (
          claim_id, submission_id, user_id, wallet_address, policy_version,
          calculation, amount_wei, status, chain_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `0x${'f'.repeat(63)}1`,
          temporarySubmissionId,
          ownerRecord.id,
          walletAccount.address,
          'wallet-unlink-test',
          '{}',
          '10000000000000000',
          'pending',
          11_142_220,
        ],
        function inserted(error) {
          if (error) reject(error);
          else resolve(this.lastID);
        }
      );
    });
    const blocked = await request(app)
      .delete('/api/v1/wallet')
      .set('Authorization', `Bearer ${ownerTokens.accessToken}`);
    expect(blocked.statusCode).toBe(409);
    expect(blocked.body.code).toBe('WALLET_UNLINK_BLOCKED');
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM reward_payments WHERE id = ?', [temporaryPaymentId], (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM cleanup_submissions WHERE id = ?',
        [temporarySubmissionId],
        (error) => {
          if (error) reject(error);
          else resolve();
        }
      );
    });

    const removed = await request(app)
      .delete('/api/v1/wallet')
      .set('Authorization', `Bearer ${ownerTokens.accessToken}`);
    expect(removed.statusCode).toBe(200);
    expect(removed.body.wallet.verified).toBe(false);
  });

  it('rotates refresh tokens and rejects reuse of the old token', async () => {
    const rotated = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: ownerTokens.refreshToken });
    expect(rotated.statusCode).toBe(200);
    expect(rotated.body.tokens.refreshToken).not.toBe(ownerTokens.refreshToken);

    const reused = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: ownerTokens.refreshToken });
    expect(reused.statusCode).toBe(401);
    expect(reused.body.code).toBe('REFRESH_TOKEN_REUSED');
  });

  it('revokes a refresh token on logout', async () => {
    const login = await request(app)
      .post('/api/v1/login')
      .send({ username: otherUser, password: 'test-password' });
    const refreshToken = login.body.tokens.refreshToken;

    await request(app)
      .post('/api/v1/auth/logout')
      .send({ refreshToken })
      .expect(200);

    await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(401);
  });
});

describe('Phase 3 cleanup evidence workflow', () => {
  const owner = `evown-${suffix}`;
  const otherUser = `evoth-${suffix}`;
  const reviewer = `evadm-${suffix}`;
  const createdSubmissionIds = [];
  let ownerToken;
  let otherToken;
  let reviewerToken;
  let beforePhoto;
  let afterPhoto;
  let alternatePhoto;

  const authenticated = (requestBuilder, token) => (
    requestBuilder.set('Authorization', `Bearer ${token}`)
  );

  const submitEvidence = (token, before, after) => (
    authenticated(request(app).post('/api/v1/evidence/submissions'), token)
      .field('wasteCategory', 'plastic')
      .field('itemCount', '12')
      .field('estimatedWeight', '2.5')
      .field('notes', 'Bottles collected beside the community road.')
      .field('latitude', '0.3476')
      .field('longitude', '32.5825')
      .field('locationAccuracy', '8')
      .field('capturedBeforeAt', new Date(Date.now() - 60_000).toISOString())
      .field('capturedAfterAt', new Date().toISOString())
      .attach('beforePhoto', before, { filename: 'before.png', contentType: 'image/png' })
      .attach('afterPhoto', after, { filename: 'after.png', contentType: 'image/png' })
  );

  beforeAll(async () => {
    beforePhoto = await sharp({
      create: { width: 8, height: 8, channels: 3, background: '#1f4f7a' },
    }).png().toBuffer();
    afterPhoto = await sharp({
      create: { width: 8, height: 8, channels: 3, background: '#2f8f68' },
    }).png().toBuffer();
    alternatePhoto = await sharp({
      create: { width: 8, height: 8, channels: 3, background: '#8f6a2f' },
    }).png().toBuffer();

    for (const username of [owner, otherUser, reviewer]) {
      await request(app).post('/api/v1/signup').send(signupData(username));
    }
    await new Promise((resolve, reject) => {
      db.run('UPDATE users SET role = ? WHERE username = ?', ['admin', reviewer], (error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    const [ownerLogin, otherLogin, reviewerLogin] = await Promise.all([
      request(app).post('/api/v1/login').send({ username: owner, password: 'test-password' }),
      request(app).post('/api/v1/login').send({ username: otherUser, password: 'test-password' }),
      request(app).post('/api/v1/login').send({ username: reviewer, password: 'test-password' }),
    ]);
    ownerToken = ownerLogin.body.tokens.accessToken;
    otherToken = otherLogin.body.tokens.accessToken;
    reviewerToken = reviewerLogin.body.tokens.accessToken;
  });

  afterAll(async () => {
    for (const id of createdSubmissionIds) {
      const evidenceDirectory = path.join(EVIDENCE_ROOT, String(id));
      if (evidenceDirectory.startsWith(`${EVIDENCE_ROOT}${path.sep}`)) {
        fs.rmSync(evidenceDirectory, { recursive: true, force: true });
      }
    }
    await new Promise((resolve) => {
      if (!createdSubmissionIds.length) return resolve();
      const placeholders = createdSubmissionIds.map(() => '?').join(', ');
      db.serialize(() => {
        db.run(
          `DELETE FROM submission_transitions WHERE submission_id IN (${placeholders})`,
          createdSubmissionIds
        );
        db.run(
          `DELETE FROM cleanup_evidence_files WHERE submission_id IN (${placeholders})`,
          createdSubmissionIds
        );
        db.run(
          `DELETE FROM cleanup_submissions WHERE id IN (${placeholders})`,
          createdSubmissionIds,
          resolve
        );
      });
    });
  });

  it('requires authentication and both evidence photos', async () => {
    await request(app).get('/api/v1/evidence/submissions').expect(401);
    const response = await authenticated(
      request(app)
        .post('/api/v1/evidence/submissions')
        .field('wasteCategory', 'plastic'),
      ownerToken
    );
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/before photo/i);
  });

  it('creates a private submission and queues it for manual review', async () => {
    const response = await submitEvidence(ownerToken, beforePhoto, afterPhoto);
    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.submission.status).toBe('manual_review');
    expect(response.body.submission.verification.exactDuplicate.matched).toBe(false);
    expect(response.body.submission.verification.version).toBe('phase9-v2');
    expect(['low', 'medium', 'high']).toContain(response.body.submission.riskLevel);
    createdSubmissionIds.push(response.body.submission.id);

    const detail = await authenticated(
      request(app).get(`/api/v1/evidence/submissions/${response.body.submission.id}`),
      ownerToken
    );
    expect(detail.statusCode).toBe(200);
    expect(detail.body.submission.transitions.map((item) => item.toStatus)).toEqual([
      'submitted',
      'automated_review',
      'manual_review',
    ]);
  });

  it('prevents other users from accessing private submission evidence', async () => {
    const submissionId = createdSubmissionIds[0];
    await authenticated(
      request(app).get(`/api/v1/evidence/submissions/${submissionId}`),
      otherToken
    ).expect(403);
    await authenticated(
      request(app).get(`/api/v1/evidence/submissions/${submissionId}/images/before`),
      otherToken
    ).expect(403);
    await authenticated(
      request(app).get(`/api/v1/evidence/submissions/${submissionId}/images/before`),
      ownerToken
    ).expect(200).expect('Content-Type', /image\/png/);
  });

  it('automatically rejects an exact duplicate and permits one appeal', async () => {
    const response = await submitEvidence(otherToken, beforePhoto, alternatePhoto);
    expect(response.statusCode).toBe(201);
    expect(response.body.submission.status).toBe('rejected');
    expect(response.body.submission.duplicateOf).toBe(createdSubmissionIds[0]);
    createdSubmissionIds.push(response.body.submission.id);

    const appealed = await authenticated(
      request(app)
        .post(`/api/v1/evidence/submissions/${response.body.submission.id}/appeal`)
        .send({ reason: 'This was a separate cleanup at the same public location.' }),
      otherToken
    );
    expect(appealed.statusCode).toBe(200);
    expect(appealed.body.submission.status).toBe('manual_review');

    await authenticated(
      request(app)
        .post(`/api/v1/evidence/submissions/${response.body.submission.id}/appeal`)
        .send({ reason: 'A second appeal must not be accepted by the API.' }),
      otherToken
    ).expect(409);
  });

  it('restricts review decisions to admins and prevents self-review', async () => {
    const submissionId = createdSubmissionIds[0];
    await authenticated(
      request(app)
        .patch(`/api/v1/evidence/submissions/${submissionId}/review`)
        .send({ decision: 'approved', reason: 'Evidence is consistent.' }),
      ownerToken
    ).expect(403);

    const reviewed = await authenticated(
      request(app)
        .patch(`/api/v1/evidence/submissions/${submissionId}/review`)
        .send({ decision: 'approved', reason: 'Evidence and location are consistent.' }),
      reviewerToken
    );
    expect(reviewed.statusCode).toBe(200);
    expect(reviewed.body.submission.status).toBe('approved');
  });
});
