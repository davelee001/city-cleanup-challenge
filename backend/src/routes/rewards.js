const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const {
  RewardError,
  ensureRewardClaim,
  getRewardPayment,
  getRewardPolicy,
  processRewardPayment,
} = require('../services/rewardService');

function dbGet(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) reject(error);
      else resolve(row);
    });
  });
}

function createRewardRouter(db) {
  const router = express.Router();

  router.get('/policy', (req, res) => {
    res.json({ success: true, policy: getRewardPolicy() });
  });

  router.get('/submissions/:id', async (req, res) => {
    try {
      const submission = await dbGet(
        db,
        'SELECT id, user_id FROM cleanup_submissions WHERE id = ?',
        [req.params.id]
      );
      if (!submission) {
        return res.status(404).json({ success: false, message: 'Submission not found' });
      }
      if (req.user.role !== 'admin' && Number(submission.user_id) !== Number(req.user.id)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
      return res.json({
        success: true,
        payment: await getRewardPayment(db, submission.id),
      });
    } catch {
      return res.status(500).json({ success: false, message: 'Unable to load reward payment' });
    }
  });

  router.post('/submissions/:id/claim', requireAdmin, async (req, res) => {
    try {
      const payment = await ensureRewardClaim(db, req.params.id);
      return res.status(201).json({ success: true, payment });
    } catch (error) {
      const status = error instanceof RewardError ? error.status : 500;
      return res.status(status).json({
        success: false,
        code: error.code || 'REWARD_CLAIM_FAILED',
        message: error.message || 'Unable to create reward claim',
      });
    }
  });

  router.post('/submissions/:id/pay', requireAdmin, async (req, res) => {
    try {
      const result = await processRewardPayment(db, req.params.id, {
        approvedByAdmin: true,
      });
      return res.status(result.idempotent ? 200 : 201).json({
        success: true,
        idempotent: result.idempotent,
        payment: result.payment,
      });
    } catch (error) {
      const status = error instanceof RewardError ? error.status : 500;
      const payment = await getRewardPayment(db, req.params.id).catch(() => null);
      return res.status(status).json({
        success: false,
        code: error.code || 'REWARD_PAYMENT_FAILED',
        message: error.message || 'Unable to process reward payment',
        payment,
      });
    }
  });

  return router;
}

module.exports = { createRewardRouter };
