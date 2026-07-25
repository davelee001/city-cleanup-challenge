const { formatEther, getAddress, isAddress, keccak256, toHex } = require('viem');
const { createCeloGateway } = require('./celoGateway');
const {
  calculateReward,
  createRewardPolicy,
  publicPolicy,
} = require('./rewardPolicy');

class RewardError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function dbRun(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) reject(error);
      else resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
}

function dbGet(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) reject(error);
      else resolve(row);
    });
  });
}

function dbAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) reject(error);
      else resolve(rows);
    });
  });
}

function claimIdForSubmission(submissionId) {
  return keccak256(toHex(`city-cleanup:submission:${Number(submissionId)}`));
}

function parseDatabaseDate(value) {
  if (!value) return null;
  const normalized = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function sumReserved(rows, since) {
  return rows.reduce((total, row) => {
    const createdAt = parseDatabaseDate(row.created_at);
    if (!createdAt || createdAt < since) return total;
    return total + BigInt(row.amount_wei);
  }, 0n);
}

function minimum(values) {
  return values.reduce((smallest, value) => (value < smallest ? value : smallest));
}

function serializePayment(row) {
  if (!row) return null;
  let calculation = null;
  try {
    calculation = JSON.parse(row.calculation);
  } catch {}
  return {
    id: row.id,
    claimId: row.claim_id,
    submissionId: row.submission_id,
    userId: row.user_id,
    walletAddress: row.wallet_address,
    policyVersion: row.policy_version,
    calculation,
    amountWei: row.amount_wei,
    amountCelo: formatEther(BigInt(row.amount_wei)),
    status: row.status,
    chainId: row.chain_id,
    contractAddress: row.contract_address,
    transactionHash: row.transaction_hash,
    blockNumber: row.block_number,
    attempts: row.attempts,
    failureCode: row.failure_code,
    failureReason: row.failure_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    broadcastAt: row.broadcast_at,
    confirmedAt: row.confirmed_at,
  };
}

async function loadSubmission(db, submissionId) {
  return dbGet(
    db,
    `SELECT s.*, u.celo_wallet_address, u.celo_wallet_verified_at
     FROM cleanup_submissions s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = ?`,
    [submissionId]
  );
}

async function getRewardPayment(db, submissionId) {
  const row = await dbGet(
    db,
    'SELECT * FROM reward_payments WHERE submission_id = ?',
    [submissionId]
  );
  return serializePayment(row);
}

async function listUserRewardPayments(db, userId, limit = 50) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const rows = await dbAll(
    db,
    `SELECT * FROM reward_payments
     WHERE user_id = ?
     ORDER BY created_at DESC, id DESC
     LIMIT ?`,
    [userId, safeLimit]
  );
  return rows.map(serializePayment);
}

async function reserveWithinCaps(db, submission, walletAddress, requestedWei, policy, now) {
  const reservedStatuses = [
    'pending',
    'awaiting_manual_approval',
    'processing',
    'broadcast',
    'confirmed',
    'simulated',
  ];
  const placeholders = reservedStatuses.map(() => '?').join(', ');
  const userRows = await dbAll(
    db,
    `SELECT amount_wei, created_at
     FROM reward_payments
     WHERE user_id = ? AND status IN (${placeholders})`,
    [submission.user_id, ...reservedStatuses]
  );
  const walletRows = walletAddress
    ? await dbAll(
      db,
      `SELECT amount_wei, created_at
       FROM reward_payments
       WHERE lower(wallet_address) = lower(?) AND status IN (${placeholders})`,
      [walletAddress, ...reservedStatuses]
    )
    : [];

  const dayStart = new Date(now.getTime() - (24 * 60 * 60 * 1000));
  const weekStart = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
  const available = [
    requestedWei,
    policy.dailyAccountCapWei - sumReserved(userRows, dayStart),
    policy.weeklyAccountCapWei - sumReserved(userRows, weekStart),
  ];
  if (walletAddress) {
    available.push(
      policy.dailyWalletCapWei - sumReserved(walletRows, dayStart),
      policy.weeklyWalletCapWei - sumReserved(walletRows, weekStart)
    );
  }
  return minimum(available.map((value) => (value > 0n ? value : 0n)));
}

async function ensureRewardClaim(db, submissionId, options = {}) {
  const existing = await getRewardPayment(db, submissionId);
  if (existing) return existing;

  const submission = await loadSubmission(db, submissionId);
  if (!submission) {
    throw new RewardError('SUBMISSION_NOT_FOUND', 'Submission not found', 404);
  }
  if (submission.status !== 'approved') {
    throw new RewardError(
      'SUBMISSION_NOT_APPROVED',
      'Only an approved cleanup submission can receive a reward',
      409
    );
  }

  const policy = options.policy || createRewardPolicy();
  const calculation = calculateReward(submission, policy);
  const now = options.now || new Date();
  const walletAddress = submission.celo_wallet_address
    && submission.celo_wallet_verified_at
    && isAddress(submission.celo_wallet_address)
    ? getAddress(submission.celo_wallet_address)
    : null;
  const amountWei = await reserveWithinCaps(
    db,
    submission,
    walletAddress,
    calculation.amountWei,
    policy,
    now
  );
  let status = 'pending';
  let failureCode = null;
  let failureReason = null;
  if (!walletAddress) {
    status = 'blocked';
    failureCode = 'WALLET_NOT_VERIFIED';
    failureReason = 'A verified Celo wallet is required before payment';
  } else if (amountWei === 0n) {
    status = 'blocked';
    failureCode = 'PAYOUT_CAP_REACHED';
    failureReason = 'The account or wallet payout cap has been reached';
  } else if (amountWei >= policy.manualApprovalThresholdWei) {
    status = 'awaiting_manual_approval';
  }

  const calculationRecord = {
    baseRewardWei: calculation.baseRewardWei.toString(),
    category: calculation.category,
    categoryMultiplierBps: calculation.categoryMultiplierBps,
    impactMultiplierBps: calculation.impactMultiplierBps,
    combinedMultiplierBps: calculation.combinedMultiplierBps,
    calculatedWei: calculation.calculatedWei.toString(),
    requestedWei: calculation.amountWei.toString(),
    cappedBySubmissionLimit: calculation.capped,
    cappedByPeriodLimit: amountWei < calculation.amountWei,
  };
  const gateway = options.gateway || createCeloGateway();
  await dbRun(
    db,
    `INSERT OR IGNORE INTO reward_payments (
       claim_id, submission_id, user_id, wallet_address, policy_version,
       calculation, amount_wei, status, chain_id, contract_address,
       failure_code, failure_reason
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      claimIdForSubmission(submission.id),
      submission.id,
      submission.user_id,
      walletAddress,
      policy.version,
      JSON.stringify(calculationRecord),
      amountWei.toString(),
      status,
      gateway.chainId,
      gateway.contractAddress,
      failureCode,
      failureReason,
    ]
  );
  return getRewardPayment(db, submission.id);
}

async function reactivateWalletBlockedClaims(db, userId, walletAddress, options = {}) {
  if (!walletAddress || !isAddress(walletAddress)) {
    throw new RewardError(
      'WALLET_NOT_VERIFIED',
      'A valid verified wallet is required',
      409
    );
  }
  const policy = options.policy || createRewardPolicy();
  const now = options.now || new Date();
  const normalizedWallet = getAddress(walletAddress);
  const rows = await dbAll(
    db,
    `SELECT submission_id
     FROM reward_payments
     WHERE user_id = ? AND status = 'blocked'
       AND failure_code = 'WALLET_NOT_VERIFIED'
     ORDER BY created_at ASC, id ASC`,
    [userId]
  );
  let reactivated = 0;

  for (const row of rows) {
    const submission = await loadSubmission(db, row.submission_id);
    if (!submission || submission.status !== 'approved') continue;
    const calculation = calculateReward(submission, policy);
    const amountWei = await reserveWithinCaps(
      db,
      submission,
      normalizedWallet,
      calculation.amountWei,
      policy,
      now
    );
    const status = amountWei === 0n
      ? 'blocked'
      : amountWei >= policy.manualApprovalThresholdWei
        ? 'awaiting_manual_approval'
        : 'pending';
    const failureCode = amountWei === 0n ? 'PAYOUT_CAP_REACHED' : null;
    const failureReason = amountWei === 0n
      ? 'The account or wallet payout cap has been reached'
      : null;
    const calculationRecord = {
      baseRewardWei: calculation.baseRewardWei.toString(),
      category: calculation.category,
      categoryMultiplierBps: calculation.categoryMultiplierBps,
      impactMultiplierBps: calculation.impactMultiplierBps,
      combinedMultiplierBps: calculation.combinedMultiplierBps,
      calculatedWei: calculation.calculatedWei.toString(),
      requestedWei: calculation.amountWei.toString(),
      cappedBySubmissionLimit: calculation.capped,
      cappedByPeriodLimit: amountWei < calculation.amountWei,
    };
    const updated = await dbRun(
      db,
      `UPDATE reward_payments
       SET wallet_address = ?, amount_wei = ?, status = ?, calculation = ?,
           failure_code = ?, failure_reason = ?, updated_at = CURRENT_TIMESTAMP
       WHERE submission_id = ? AND status = 'blocked'
         AND failure_code = 'WALLET_NOT_VERIFIED'`,
      [
        normalizedWallet,
        amountWei.toString(),
        status,
        JSON.stringify(calculationRecord),
        failureCode,
        failureReason,
        submission.id,
      ]
    );
    if (updated.changes === 1 && amountWei > 0n) reactivated += 1;
  }

  return { reactivated, examined: rows.length };
}

async function processRewardPayment(db, submissionId, options = {}) {
  const gateway = options.gateway || createCeloGateway();
  let payment = await ensureRewardClaim(db, submissionId, {
    ...options,
    gateway,
  });
  if (['confirmed', 'simulated', 'broadcast'].includes(payment.status)) {
    return { payment, idempotent: true };
  }
  if (payment.status === 'blocked') {
    throw new RewardError(
      payment.failureCode || 'PAYMENT_BLOCKED',
      payment.failureReason || 'Reward payment is blocked',
      409
    );
  }
  if (payment.status === 'awaiting_manual_approval' && !options.approvedByAdmin) {
    throw new RewardError(
      'PAYOUT_APPROVAL_REQUIRED',
      'This reward requires administrator payout approval',
      409
    );
  }
  const {
    assertRewardsActive,
    recordRewardAudit,
  } = require('./rewardOperations');
  await assertRewardsActive(db);

  if (await gateway.isClaimPaid(payment.claimId)) {
    await dbRun(
      db,
      `UPDATE reward_payments
       SET status = 'duplicate_prevented', failure_code = 'CLAIM_ALREADY_PAID_ONCHAIN',
           failure_reason = 'The reward contract reports this claim as already paid',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [payment.id]
    );
    await recordRewardAudit(db, {
      paymentId: payment.id,
      actorUserId: options.actorUserId || null,
      action: 'duplicate_prevented',
      fromStatus: payment.status,
      toStatus: 'duplicate_prevented',
      details: { claimId: payment.claimId },
    }).catch((error) => console.error('Unable to record reward audit:', error));
    throw new RewardError(
      'CLAIM_ALREADY_PAID_ONCHAIN',
      'The reward contract already paid this claim',
      409
    );
  }

  const locked = await dbRun(
    db,
    `UPDATE reward_payments
     SET status = 'processing', attempts = attempts + 1,
         failure_code = NULL, failure_reason = NULL, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND status IN ('pending', 'failed', 'awaiting_manual_approval')`,
    [payment.id]
  );
  if (locked.changes !== 1) {
    payment = await getRewardPayment(db, submissionId);
    return { payment, idempotent: true };
  }

  let broadcast;
  try {
    broadcast = await gateway.broadcastPayment({
      claimId: payment.claimId,
      walletAddress: payment.walletAddress,
      amountWei: payment.amountWei,
    });
    await dbRun(
      db,
      `UPDATE reward_payments
       SET status = ?, transaction_hash = ?, broadcast_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [broadcast.simulated ? 'simulated' : 'broadcast', broadcast.hash, payment.id]
    );
    if (broadcast.simulated) {
      await dbRun(
        db,
        `UPDATE reward_payments
         SET confirmed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [payment.id]
      );
      await recordRewardAudit(db, {
        paymentId: payment.id,
        actorUserId: options.actorUserId || null,
        action: 'payment_simulated',
        fromStatus: payment.status,
        toStatus: 'simulated',
        details: { transactionHash: broadcast.hash },
      }).catch((error) => console.error('Unable to record reward audit:', error));
      return { payment: await getRewardPayment(db, submissionId), idempotent: false };
    }
    await recordRewardAudit(db, {
      paymentId: payment.id,
      actorUserId: options.actorUserId || null,
      action: 'payment_broadcast',
      fromStatus: payment.status,
      toStatus: 'broadcast',
      details: { transactionHash: broadcast.hash },
    }).catch((error) => console.error('Unable to record reward audit:', error));
  } catch (error) {
    await dbRun(
      db,
      `UPDATE reward_payments
       SET status = 'failed', failure_code = 'BROADCAST_FAILED', failure_reason = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND transaction_hash IS NULL`,
      [String(error.message || error).slice(0, 500), payment.id]
    );
    await recordRewardAudit(db, {
      paymentId: payment.id,
      actorUserId: options.actorUserId || null,
      action: 'payment_broadcast_failed',
      fromStatus: payment.status,
      toStatus: 'failed',
      details: { error: String(error.message || error).slice(0, 500) },
    }).catch(() => {});
    throw new RewardError('BROADCAST_FAILED', 'Unable to broadcast the CELO payment', 502);
  }

  try {
    const receipt = await gateway.waitForPayment(broadcast.hash);
    if (receipt.status !== 'success') {
      throw new Error('Reward transaction reverted');
    }
    await dbRun(
      db,
      `UPDATE reward_payments
       SET status = 'confirmed', block_number = ?, confirmed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND transaction_hash = ?`,
      [String(receipt.blockNumber), payment.id, broadcast.hash]
    );
    await recordRewardAudit(db, {
      paymentId: payment.id,
      actorUserId: options.actorUserId || null,
      action: 'payment_confirmed',
      fromStatus: 'broadcast',
      toStatus: 'confirmed',
      details: {
        transactionHash: broadcast.hash,
        blockNumber: String(receipt.blockNumber),
      },
    }).catch((error) => console.error('Unable to record reward audit:', error));
    return { payment: await getRewardPayment(db, submissionId), idempotent: false };
  } catch (error) {
    await dbRun(
      db,
      `UPDATE reward_payments
       SET failure_code = 'CONFIRMATION_PENDING', failure_reason = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = 'broadcast'`,
      [String(error.message || error).slice(0, 500), payment.id]
    );
    throw new RewardError(
      'CONFIRMATION_PENDING',
      'Payment was broadcast and will not be sent again while confirmation is pending',
      202
    );
  }
}

module.exports = {
  RewardError,
  ensureRewardClaim,
  getRewardPayment,
  getRewardPolicy: () => publicPolicy(createRewardPolicy()),
  listUserRewardPayments,
  processRewardPayment,
  reactivateWalletBlockedClaims,
  serializePayment,
};
