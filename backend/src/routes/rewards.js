const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const {
  RewardError,
  ensureRewardClaim,
  getRewardPayment,
  getRewardPolicy,
  listUserRewardPayments,
  processRewardPayment,
} = require('../services/rewardService');
const {
  getRewardOperationsSummary,
  listAdminRewardPayments,
  reconcileRewardPayment,
  recordRewardAudit,
  setRewardPaused,
} = require('../services/rewardOperations');
const { runCeloPilotPreflight } = require('../services/celoPreflight');
const metricsService = require('../services/metrics');

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

  router.get('/mine', async (req, res) => {
    try {
      const payments = await listUserRewardPayments(db, req.user.id, req.query.limit);
      return res.json({ success: true, payments });
    } catch {
      return res.status(500).json({
        success: false,
        message: 'Unable to load reward history',
      });
    }
  });

  router.get('/admin/summary', requireAdmin, async (req, res) => {
    try {
      const summary = await getRewardOperationsSummary(db);
      return res.json({ success: true, summary });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Unable to load reward operations summary',
      });
    }
  });

  router.get('/admin/payments', requireAdmin, async (req, res) => {
    try {
      const payments = await listAdminRewardPayments(db, {
        status: req.query.status,
        limit: req.query.limit,
      });
      return res.json({ success: true, payments });
    } catch (error) {
      const status = error instanceof RewardError ? error.status : 500;
      return res.status(status).json({
        success: false,
        code: error.code || 'REWARD_QUEUE_FAILED',
        message: error.message || 'Unable to load reward queue',
      });
    }
  });

  router.post('/admin/preflight', requireAdmin, async (req, res) => {
    try {
      const preflight = await runCeloPilotPreflight(db);
      metricsService.updateCeloPreflight(preflight);
      await recordRewardAudit(db, {
        actorUserId: req.user.id,
        action: 'celo_preflight_run',
        details: {
          ready: preflight.ready,
          checks: preflight.checks.map((check) => ({
            name: check.name,
            ok: check.ok,
          })),
        },
      }).catch((error) => console.error('Unable to record reward audit:', error));
      return res.json({ success: true, preflight });
    } catch (error) {
      metricsService.updateCeloPreflight({ ready: false, deployment: {} });
      return res.status(502).json({
        success: false,
        code: 'CELO_PREFLIGHT_FAILED',
        message: error.message || 'Unable to run Celo pilot preflight',
      });
    }
  });

  router.put('/admin/controls', requireAdmin, async (req, res) => {
    try {
      if (typeof req.body.paused !== 'boolean') {
        return res.status(400).json({
          success: false,
          code: 'PAUSED_FLAG_REQUIRED',
          message: 'paused must be true or false',
        });
      }
      const controls = await setRewardPaused(
        db,
        req.body.paused,
        req.body.reason,
        req.user.id
      );
      return res.json({ success: true, controls });
    } catch (error) {
      const status = error instanceof RewardError ? error.status : 500;
      return res.status(status).json({
        success: false,
        code: error.code || 'REWARD_CONTROLS_FAILED',
        message: error.message || 'Unable to update reward controls',
      });
    }
  });

  router.post('/admin/payments/:id/reconcile', requireAdmin, async (req, res) => {
    try {
      const result = await reconcileRewardPayment(db, req.params.id, {
        actorUserId: req.user.id,
      });
      return res.json({ success: true, ...result });
    } catch (error) {
      const status = error instanceof RewardError ? error.status : 502;
      return res.status(status).json({
        success: false,
        code: error.code || 'REWARD_RECONCILIATION_FAILED',
        message: error.message || 'Unable to reconcile reward payment',
      });
    }
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
      await recordRewardAudit(db, {
        paymentId: payment.id,
        actorUserId: req.user.id,
        action: 'claim_created_or_loaded',
        toStatus: payment.status,
        details: { submissionId: payment.submissionId },
      }).catch((error) => console.error('Unable to record reward audit:', error));
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
        actorUserId: req.user.id,
      });
      return res.status(result.idempotent ? 200 : 201).json({
        success: true,
        idempotent: result.idempotent,
        payment: result.payment,
      });
    } catch (error) {
      const status = error instanceof RewardError ? error.status : 500;
      const payment = await getRewardPayment(db, req.params.id).catch(() => null);
      if (status === 202) {
        return res.status(202).json({
          success: true,
          idempotent: true,
          outcome: 'confirmation_pending',
          message: error.message,
          payment,
        });
      }
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
