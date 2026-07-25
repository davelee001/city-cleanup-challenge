const express = require('express');
const { createRateLimit } = require('../middleware/auth');
const {
  reactivateWalletBlockedClaims,
} = require('../services/rewardService');
const {
  WalletError,
  createWalletChallenge,
  getWalletStatus,
  unlinkWallet,
  verifyWalletChallenge,
} = require('../services/walletService');

function walletErrorResponse(res, error, fallbackCode, fallbackMessage) {
  const status = error instanceof WalletError ? error.status : 500;
  return res.status(status).json({
    success: false,
    code: error.code || fallbackCode,
    message: error.message || fallbackMessage,
  });
}

function createWalletRouter(db) {
  const router = express.Router();
  const challengeLimit = createRateLimit(10 * 60 * 1000, 20);

  router.get('/', async (req, res) => {
    try {
      const wallet = await getWalletStatus(db, req.user.id);
      return res.json({ success: true, wallet });
    } catch (error) {
      return walletErrorResponse(
        res,
        error,
        'WALLET_STATUS_FAILED',
        'Unable to load wallet status'
      );
    }
  });

  router.post('/challenge', challengeLimit, async (req, res) => {
    try {
      const challenge = await createWalletChallenge(
        db,
        req.user.id,
        req.body.address
      );
      return res.status(201).json({ success: true, challenge });
    } catch (error) {
      return walletErrorResponse(
        res,
        error,
        'WALLET_CHALLENGE_FAILED',
        'Unable to create wallet challenge'
      );
    }
  });

  router.post('/verify', challengeLimit, async (req, res) => {
    try {
      const wallet = await verifyWalletChallenge(
        db,
        req.user.id,
        req.body.challengeId,
        req.body.signature
      );
      let rewards = { reactivated: 0, examined: 0 };
      let rewardWarning = null;
      try {
        rewards = await reactivateWalletBlockedClaims(
          db,
          req.user.id,
          wallet.address
        );
      } catch (error) {
        rewardWarning = 'Wallet verified, but blocked rewards require administrator review';
        console.error('Unable to reactivate wallet-blocked rewards:', error);
      }
      return res.json({
        success: true,
        wallet,
        rewards,
        rewardWarning,
      });
    } catch (error) {
      return walletErrorResponse(
        res,
        error,
        'WALLET_VERIFICATION_FAILED',
        'Unable to verify wallet'
      );
    }
  });

  router.delete('/', async (req, res) => {
    try {
      const wallet = await unlinkWallet(db, req.user.id);
      return res.json({ success: true, wallet });
    } catch (error) {
      return walletErrorResponse(
        res,
        error,
        'WALLET_UNLINK_FAILED',
        'Unable to remove wallet'
      );
    }
  });

  return router;
}

module.exports = { createWalletRouter };
