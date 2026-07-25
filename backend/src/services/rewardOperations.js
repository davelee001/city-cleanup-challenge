const { formatEther } = require('viem');
const { createCeloGateway } = require('./celoGateway');
const { RewardError, serializePayment } = require('./rewardService');

const PAYMENT_STATUSES = new Set([
  'blocked',
  'awaiting_manual_approval',
  'pending',
  'processing',
  'broadcast',
  'confirmed',
  'simulated',
  'failed',
  'duplicate_prevented',
]);

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

function parseDetails(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function recordRewardAudit(db, {
  paymentId = null,
  actorUserId = null,
  action,
  fromStatus = null,
  toStatus = null,
  details = null,
}) {
  await dbRun(
    db,
    `INSERT INTO reward_audit_log (
      payment_id, actor_user_id, action, from_status, to_status, details
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      paymentId,
      actorUserId,
      action,
      fromStatus,
      toStatus,
      details ? JSON.stringify(details) : null,
    ]
  );
}

async function getRewardControls(db) {
  const row = await dbGet(
    db,
    `SELECT c.*, u.username AS updated_by_username
     FROM reward_controls c
     LEFT JOIN users u ON u.id = c.updated_by
     WHERE c.id = 1`
  );
  return {
    paused: !row || Boolean(row.paused),
    reason: row?.pause_reason || null,
    updatedBy: row?.updated_by_username || null,
    updatedAt: row?.updated_at || null,
  };
}

async function setRewardPaused(db, paused, reason, actorUserId) {
  const nextPaused = Boolean(paused);
  const trimmedReason = String(reason || '').trim();
  if (nextPaused && trimmedReason.length < 5) {
    throw new RewardError(
      'PAUSE_REASON_REQUIRED',
      'Provide a clear reason when pausing rewards'
    );
  }
  if (trimmedReason.length > 300) {
    throw new RewardError('PAUSE_REASON_TOO_LONG', 'Pause reason is too long');
  }
  const previous = await getRewardControls(db);
  await dbRun(
    db,
    `UPDATE reward_controls
     SET paused = ?, pause_reason = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = 1`,
    [nextPaused ? 1 : 0, trimmedReason || null, actorUserId]
  );
  await recordRewardAudit(db, {
    actorUserId,
    action: nextPaused ? 'rewards_paused' : 'rewards_resumed',
    details: {
      previousPaused: previous.paused,
      reason: trimmedReason || null,
    },
  });
  return getRewardControls(db);
}

async function assertRewardsActive(db) {
  const controls = await getRewardControls(db);
  if (controls.paused) {
    throw new RewardError(
      'REWARDS_PAUSED',
      controls.reason || 'Reward payouts are temporarily paused',
      423
    );
  }
  return controls;
}

async function listAdminRewardPayments(db, options = {}) {
  const status = String(options.status || 'all');
  if (status !== 'all' && !PAYMENT_STATUSES.has(status)) {
    throw new RewardError('INVALID_REWARD_STATUS', 'Invalid reward status filter');
  }
  const limit = Math.min(Math.max(Number(options.limit) || 50, 1), 100);
  const params = [];
  let where = '';
  if (status !== 'all') {
    where = 'WHERE rp.status = ?';
    params.push(status);
  }
  params.push(limit);
  const rows = await dbAll(
    db,
    `SELECT rp.*, u.username, s.waste_category
     FROM reward_payments rp
     JOIN users u ON u.id = rp.user_id
     JOIN cleanup_submissions s ON s.id = rp.submission_id
     ${where}
     ORDER BY
       CASE rp.status
         WHEN 'broadcast' THEN 1
         WHEN 'processing' THEN 2
         WHEN 'awaiting_manual_approval' THEN 3
         WHEN 'pending' THEN 4
         WHEN 'failed' THEN 5
         ELSE 6
       END,
       rp.created_at ASC
     LIMIT ?`,
    params
  );
  return rows.map((row) => ({
    ...serializePayment(row),
    username: row.username,
    wasteCategory: row.waste_category,
  }));
}

async function getRewardOperationsSummary(db) {
  const gateway = createCeloGateway();
  const [counts, amounts, controls, recentAudit] = await Promise.all([
    dbAll(
      db,
      `SELECT status, COUNT(*) AS total
       FROM reward_payments GROUP BY status`
    ),
    dbAll(
      db,
      'SELECT amount_wei, status FROM reward_payments'
    ),
    getRewardControls(db),
    dbAll(
      db,
      `SELECT a.*, u.username AS actor_username
       FROM reward_audit_log a
       LEFT JOIN users u ON u.id = a.actor_user_id
       ORDER BY a.created_at DESC, a.id DESC LIMIT 25`
    ),
  ]);
  const byStatus = Object.fromEntries(counts.map((row) => [row.status, row.total]));
  const completedStatuses = new Set(['confirmed', 'simulated']);
  const activeStatuses = new Set([
    'pending',
    'awaiting_manual_approval',
    'processing',
    'broadcast',
  ]);
  const completedWei = amounts.reduce(
    (total, row) => total + (completedStatuses.has(row.status) ? BigInt(row.amount_wei) : 0n),
    0n
  );
  const activeWei = amounts.reduce(
    (total, row) => total + (activeStatuses.has(row.status) ? BigInt(row.amount_wei) : 0n),
    0n
  );
  return {
    controls,
    gateway: {
      chainId: gateway.chainId,
      network: 'Celo Sepolia',
      dryRun: gateway.dryRun,
      enabled: gateway.enabled,
      contractConfigured: Boolean(gateway.contractAddress),
      requiredConfirmations: gateway.requiredConfirmations,
    },
    counts: byStatus,
    completedCelo: formatEther(completedWei),
    activeCelo: formatEther(activeWei),
    recentAudit: recentAudit.map((row) => ({
      id: row.id,
      paymentId: row.payment_id,
      actorUserId: row.actor_user_id,
      actorUsername: row.actor_username,
      action: row.action,
      fromStatus: row.from_status,
      toStatus: row.to_status,
      details: parseDetails(row.details),
      createdAt: row.created_at,
    })),
  };
}

async function reconcileRewardPayment(db, paymentId, options = {}) {
  const gateway = options.gateway || createCeloGateway();
  const actorUserId = options.actorUserId || null;
  let payment = await dbGet(db, 'SELECT * FROM reward_payments WHERE id = ?', [paymentId]);
  if (!payment) {
    throw new RewardError('REWARD_PAYMENT_NOT_FOUND', 'Reward payment not found', 404);
  }
  if (payment.status === 'confirmed' || payment.status === 'simulated') {
    return { payment: serializePayment(payment), outcome: 'already_complete', idempotent: true };
  }
  if (payment.status !== 'broadcast' || !payment.transaction_hash) {
    throw new RewardError(
      'PAYMENT_NOT_BROADCAST',
      'Only a broadcast payment with a transaction hash can be reconciled',
      409
    );
  }

  const chainResult = await gateway.getPaymentStatus(payment.transaction_hash);
  if (!chainResult) {
    await recordRewardAudit(db, {
      paymentId: payment.id,
      actorUserId,
      action: 'reconciliation_pending',
      fromStatus: payment.status,
      toStatus: payment.status,
      details: { transactionHash: payment.transaction_hash },
    }).catch((error) => console.error('Unable to record reward audit:', error));
    return { payment: serializePayment(payment), outcome: 'pending', idempotent: true };
  }
  if (
    chainResult.status === 'success'
    && chainResult.confirmations < gateway.requiredConfirmations
  ) {
    return {
      payment: serializePayment(payment),
      outcome: 'confirmations_pending',
      confirmations: chainResult.confirmations,
      requiredConfirmations: gateway.requiredConfirmations,
      idempotent: true,
    };
  }

  let nextStatus = 'confirmed';
  let failureCode = null;
  let failureReason = null;
  if (chainResult.status !== 'success') {
    const claimPaid = await gateway.isClaimPaid(payment.claim_id);
    nextStatus = claimPaid ? 'duplicate_prevented' : 'failed';
    failureCode = claimPaid ? 'CLAIM_ALREADY_PAID_ONCHAIN' : 'TRANSACTION_REVERTED';
    failureReason = claimPaid
      ? 'The reward claim was paid by another transaction'
      : 'The broadcast reward transaction reverted';
  }
  await dbRun(
    db,
    `UPDATE reward_payments
     SET status = ?, block_number = ?, failure_code = ?, failure_reason = ?,
         confirmed_at = CASE WHEN ? = 'confirmed' THEN CURRENT_TIMESTAMP ELSE confirmed_at END,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND status = 'broadcast' AND transaction_hash = ?`,
    [
      nextStatus,
      String(chainResult.blockNumber),
      failureCode,
      failureReason,
      nextStatus,
      payment.id,
      payment.transaction_hash,
    ]
  );
  await recordRewardAudit(db, {
    paymentId: payment.id,
    actorUserId,
    action: nextStatus === 'confirmed' ? 'payment_confirmed' : 'payment_reconciled_failure',
    fromStatus: payment.status,
    toStatus: nextStatus,
    details: {
      transactionHash: payment.transaction_hash,
      blockNumber: String(chainResult.blockNumber),
      confirmations: chainResult.confirmations,
    },
  }).catch((error) => console.error('Unable to record reward audit:', error));
  payment = await dbGet(db, 'SELECT * FROM reward_payments WHERE id = ?', [payment.id]);
  return { payment: serializePayment(payment), outcome: nextStatus, idempotent: false };
}

module.exports = {
  assertRewardsActive,
  getRewardControls,
  getRewardOperationsSummary,
  listAdminRewardPayments,
  reconcileRewardPayment,
  recordRewardAudit,
  setRewardPaused,
};
