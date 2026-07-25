const sqlite3 = require('sqlite3').verbose();
const { parseEther } = require('viem');
const {
  ensureRewardClaim,
  processRewardPayment,
  reactivateWalletBlockedClaims,
} = require('../../src/services/rewardService');
const { reconcileRewardPayment } = require('../../src/services/rewardOperations');

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function completed(error) {
      if (error) reject(error);
      else resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) reject(error);
      else resolve(row);
    });
  });
}

function close(db) {
  return new Promise((resolve, reject) => {
    db.close((error) => (error ? reject(error) : resolve()));
  });
}

function testPolicy(overrides = {}) {
  return {
    version: 'test-policy',
    baseRewardWei: parseEther('0.01'),
    perSubmissionCapWei: parseEther('0.05'),
    dailyAccountCapWei: parseEther('0.1'),
    weeklyAccountCapWei: parseEther('0.35'),
    dailyWalletCapWei: parseEther('0.1'),
    weeklyWalletCapWei: parseEther('0.35'),
    manualApprovalThresholdWei: parseEther('0.03'),
    categoryMultipliersBps: {
      plastic: 10_000,
      glass: 12_000,
      metal: 15_000,
      paper: 8_000,
      mixed: 10_000,
    },
    ...overrides,
  };
}

function testGateway(overrides = {}) {
  return {
    chainId: 11_142_220,
    contractAddress: '0x0000000000000000000000000000000000000002',
    isClaimPaid: jest.fn().mockResolvedValue(false),
    broadcastPayment: jest.fn().mockResolvedValue({
      hash: `0x${'a'.repeat(64)}`,
      simulated: false,
    }),
    waitForPayment: jest.fn().mockResolvedValue({
      status: 'success',
      blockNumber: 123n,
    }),
    getPaymentStatus: jest.fn().mockResolvedValue(null),
    requiredConfirmations: 2,
    ...overrides,
  };
}

describe('idempotent CELO reward payments', () => {
  let db;

  beforeEach(async () => {
    db = new sqlite3.Database(':memory:');
    await run(db, `CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      username TEXT,
      celo_wallet_address TEXT,
      celo_wallet_verified_at TEXT
    )`);
    await run(db, `CREATE TABLE cleanup_submissions (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      waste_category TEXT,
      item_count INTEGER,
      estimated_weight REAL
    )`);
    await run(db, `CREATE TABLE reward_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      claim_id TEXT NOT NULL UNIQUE,
      submission_id INTEGER NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      wallet_address TEXT,
      policy_version TEXT NOT NULL,
      calculation TEXT NOT NULL,
      amount_wei TEXT NOT NULL,
      status TEXT NOT NULL,
      chain_id INTEGER NOT NULL,
      contract_address TEXT,
      transaction_hash TEXT UNIQUE,
      block_number TEXT,
      attempts INTEGER NOT NULL DEFAULT 0,
      failure_code TEXT,
      failure_reason TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      broadcast_at TEXT,
      confirmed_at TEXT
    )`);
    await run(db, `CREATE TABLE reward_controls (
      id INTEGER PRIMARY KEY,
      paused INTEGER NOT NULL,
      pause_reason TEXT,
      updated_by INTEGER,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
    await run(db, `INSERT INTO reward_controls (id, paused) VALUES (1, 0)`);
    await run(db, `CREATE TABLE reward_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_id INTEGER,
      actor_user_id INTEGER,
      action TEXT NOT NULL,
      from_status TEXT,
      to_status TEXT,
      details TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
    await run(
      db,
      `INSERT INTO users (id, username, celo_wallet_address, celo_wallet_verified_at)
       VALUES (
         1, 'reward-test-user',
         '0x0000000000000000000000000000000000000001',
         CURRENT_TIMESTAMP
       )`
    );
    await run(
      db,
      `INSERT INTO cleanup_submissions
       (id, user_id, status, waste_category, item_count, estimated_weight)
       VALUES (10, 1, 'approved', 'plastic', 4, 1)`
    );
  });

  afterEach(async () => {
    await close(db);
  });

  it('creates one claim when the same submission is claimed repeatedly', async () => {
    const gateway = testGateway();
    const first = await ensureRewardClaim(db, 10, {
      gateway,
      policy: testPolicy(),
    });
    const second = await ensureRewardClaim(db, 10, {
      gateway,
      policy: testPolicy(),
    });
    const count = await get(db, 'SELECT COUNT(*) AS total FROM reward_payments');

    expect(second.id).toBe(first.id);
    expect(second.claimId).toBe(first.claimId);
    expect(count.total).toBe(1);
  });

  it('broadcasts and confirms a payout only once', async () => {
    const gateway = testGateway();
    const options = { gateway, policy: testPolicy(), approvedByAdmin: true };

    const first = await processRewardPayment(db, 10, options);
    const second = await processRewardPayment(db, 10, options);

    expect(first.payment.status).toBe('confirmed');
    expect(first.idempotent).toBe(false);
    expect(second.idempotent).toBe(true);
    expect(gateway.broadcastPayment).toHaveBeenCalledTimes(1);
  });

  it('blocks a payout while the operational reward switch is paused', async () => {
    await run(
      db,
      `UPDATE reward_controls
       SET paused = 1, pause_reason = 'Treasury maintenance'
       WHERE id = 1`
    );
    const gateway = testGateway();

    await expect(processRewardPayment(db, 10, {
      gateway,
      policy: testPolicy(),
      approvedByAdmin: true,
    })).rejects.toMatchObject({
      code: 'REWARDS_PAUSED',
      status: 423,
      message: 'Treasury maintenance',
    });
    expect(gateway.broadcastPayment).not.toHaveBeenCalled();
  });

  it('allows only one broadcast under concurrent payout requests', async () => {
    let releaseBroadcast;
    const gate = new Promise((resolve) => {
      releaseBroadcast = resolve;
    });
    const gateway = testGateway({
      broadcastPayment: jest.fn().mockImplementation(async () => {
        await gate;
        return { hash: `0x${'b'.repeat(64)}`, simulated: false };
      }),
    });
    const options = { gateway, policy: testPolicy(), approvedByAdmin: true };

    const firstRequest = processRewardPayment(db, 10, options);
    const secondRequest = processRewardPayment(db, 10, options);
    await new Promise((resolve) => setImmediate(resolve));
    releaseBroadcast();
    const results = await Promise.all([firstRequest, secondRequest]);

    expect(gateway.broadcastPayment).toHaveBeenCalledTimes(1);
    expect(results.some((result) => result.idempotent)).toBe(true);
  });

  it('blocks a payout already recorded by the on-chain contract', async () => {
    const gateway = testGateway({
      isClaimPaid: jest.fn().mockResolvedValue(true),
    });

    await expect(processRewardPayment(db, 10, {
      gateway,
      policy: testPolicy(),
      approvedByAdmin: true,
    })).rejects.toMatchObject({ code: 'CLAIM_ALREADY_PAID_ONCHAIN', status: 409 });
    expect(gateway.broadcastPayment).not.toHaveBeenCalled();
    const row = await get(db, 'SELECT status FROM reward_payments WHERE submission_id = 10');
    expect(row.status).toBe('duplicate_prevented');
  });

  it('reconciles a previously broadcast payment after confirmation waiting fails', async () => {
    const gateway = testGateway({
      waitForPayment: jest.fn().mockRejectedValue(new Error('RPC timeout')),
      getPaymentStatus: jest.fn().mockResolvedValue({
        status: 'success',
        blockNumber: 456n,
        confirmations: 3,
      }),
    });
    await expect(processRewardPayment(db, 10, {
      gateway,
      policy: testPolicy(),
      approvedByAdmin: true,
    })).rejects.toMatchObject({ code: 'CONFIRMATION_PENDING', status: 202 });

    const broadcast = await get(
      db,
      'SELECT id, status FROM reward_payments WHERE submission_id = 10'
    );
    expect(broadcast.status).toBe('broadcast');
    const reconciled = await reconcileRewardPayment(db, broadcast.id, {
      gateway,
      actorUserId: 99,
    });

    expect(reconciled.outcome).toBe('confirmed');
    expect(reconciled.payment.status).toBe('confirmed');
    expect(reconciled.payment.blockNumber).toBe('456');
  });

  it('blocks payment until the user has a verified wallet', async () => {
    await run(db, 'UPDATE users SET celo_wallet_verified_at = NULL WHERE id = 1');

    const payment = await ensureRewardClaim(db, 10, {
      gateway: testGateway(),
      policy: testPolicy(),
    });

    expect(payment.status).toBe('blocked');
    expect(payment.failureCode).toBe('WALLET_NOT_VERIFIED');
  });

  it('reactivates a wallet-blocked claim after ownership verification', async () => {
    await run(db, 'UPDATE users SET celo_wallet_verified_at = NULL WHERE id = 1');
    await ensureRewardClaim(db, 10, {
      gateway: testGateway(),
      policy: testPolicy(),
    });
    await run(
      db,
      'UPDATE users SET celo_wallet_verified_at = CURRENT_TIMESTAMP WHERE id = 1'
    );

    const result = await reactivateWalletBlockedClaims(
      db,
      1,
      '0x0000000000000000000000000000000000000001',
      { policy: testPolicy() }
    );
    const payment = await get(
      db,
      'SELECT status, failure_code, wallet_address FROM reward_payments WHERE submission_id = 10'
    );

    expect(result).toEqual({ reactivated: 1, examined: 1 });
    expect(payment.status).toBe('pending');
    expect(payment.failure_code).toBeNull();
    expect(payment.wallet_address).toBe(
      '0x0000000000000000000000000000000000000001'
    );
  });
});
