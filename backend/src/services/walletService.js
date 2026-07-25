const crypto = require('crypto');
const {
  getAddress,
  isAddress,
  verifyMessage,
} = require('viem');

const CELO_SEPOLIA_CHAIN_ID = 11_142_220;
const DEFAULT_CHALLENGE_TTL_MS = 10 * 60 * 1000;
const ACTIVE_PAYOUT_STATUSES = [
  'pending',
  'awaiting_manual_approval',
  'processing',
  'broadcast',
];

class WalletError extends Error {
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

function publicWallet(user) {
  return {
    address: user?.celo_wallet_address || null,
    verified: Boolean(user?.celo_wallet_address && user?.celo_wallet_verified_at),
    verifiedAt: user?.celo_wallet_verified_at || null,
    chainId: CELO_SEPOLIA_CHAIN_ID,
    network: 'Celo Sepolia',
  };
}

async function getWalletStatus(db, userId) {
  const user = await dbGet(
    db,
    `SELECT id, celo_wallet_address, celo_wallet_verified_at
     FROM users WHERE id = ?`,
    [userId]
  );
  if (!user) throw new WalletError('USER_NOT_FOUND', 'User not found', 404);
  return publicWallet(user);
}

async function findWalletOwner(db, walletAddress, excludedUserId) {
  return dbGet(
    db,
    `SELECT id, username
     FROM users
     WHERE lower(celo_wallet_address) = lower(?) AND id != ?`,
    [walletAddress, excludedUserId]
  );
}

async function findActivePayout(db, userId) {
  const placeholders = ACTIVE_PAYOUT_STATUSES.map(() => '?').join(', ');
  return dbGet(
    db,
    `SELECT id, status FROM reward_payments
     WHERE user_id = ? AND status IN (${placeholders})
     ORDER BY id DESC LIMIT 1`,
    [userId, ...ACTIVE_PAYOUT_STATUSES]
  );
}

function buildVerificationMessage({
  challengeId,
  userId,
  walletAddress,
  nonce,
  issuedAt,
  expiresAt,
}) {
  const domain = process.env.WALLET_VERIFICATION_DOMAIN || 'city-cleanup.local';
  const uri = process.env.WALLET_VERIFICATION_URI || 'https://city-cleanup.local';
  return [
    'City Cleanup wallet verification',
    '',
    `Domain: ${domain}`,
    `URI: ${uri}`,
    `User ID: ${userId}`,
    `Wallet: ${walletAddress}`,
    `Chain ID: ${CELO_SEPOLIA_CHAIN_ID}`,
    `Challenge ID: ${challengeId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
    `Expires At: ${expiresAt}`,
    '',
    'Signing proves wallet ownership. It does not send a transaction or cost gas.',
  ].join('\n');
}

async function createWalletChallenge(db, userId, rawAddress, options = {}) {
  if (!isAddress(rawAddress || '')) {
    throw new WalletError(
      'INVALID_WALLET_ADDRESS',
      'Enter a valid Celo wallet address'
    );
  }
  const walletAddress = getAddress(rawAddress);
  const existingOwner = await findWalletOwner(db, walletAddress, userId);
  if (existingOwner) {
    throw new WalletError(
      'WALLET_ALREADY_LINKED',
      'This wallet is already linked to another account',
      409
    );
  }

  const current = await getWalletStatus(db, userId);
  if (current.address && current.address.toLowerCase() !== walletAddress.toLowerCase()) {
    const activePayout = await findActivePayout(db, userId);
    if (activePayout) {
      throw new WalletError(
        'WALLET_CHANGE_BLOCKED',
        'The wallet cannot be changed while a reward payment is pending',
        409
      );
    }
  }

  const now = options.now || new Date();
  const ttlMs = Number(options.ttlMs || process.env.WALLET_CHALLENGE_TTL_MS)
    || DEFAULT_CHALLENGE_TTL_MS;
  const challengeId = crypto.randomUUID();
  const nonce = crypto.randomBytes(16).toString('hex');
  const issuedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + ttlMs).toISOString();
  const message = buildVerificationMessage({
    challengeId,
    userId,
    walletAddress,
    nonce,
    issuedAt,
    expiresAt,
  });

  await dbRun(
    db,
    `UPDATE wallet_verification_challenges
     SET used_at = ?
     WHERE user_id = ? AND used_at IS NULL`,
    [issuedAt, userId]
  );
  await dbRun(
    db,
    `INSERT INTO wallet_verification_challenges
     (id, user_id, wallet_address, message, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
    [challengeId, userId, walletAddress, message, expiresAt]
  );

  return {
    challengeId,
    walletAddress,
    message,
    expiresAt,
    chainId: CELO_SEPOLIA_CHAIN_ID,
    network: 'Celo Sepolia',
  };
}

async function verifyWalletChallenge(db, userId, challengeId, signature, options = {}) {
  if (!challengeId || typeof challengeId !== 'string') {
    throw new WalletError('CHALLENGE_REQUIRED', 'Wallet challenge is required');
  }
  if (!signature || !/^0x[0-9a-fA-F]+$/.test(signature) || signature.length > 2048) {
    throw new WalletError('INVALID_SIGNATURE', 'Enter a valid wallet signature');
  }

  const challenge = await dbGet(
    db,
    `SELECT * FROM wallet_verification_challenges
     WHERE id = ? AND user_id = ?`,
    [challengeId, userId]
  );
  if (!challenge) {
    throw new WalletError('CHALLENGE_NOT_FOUND', 'Wallet challenge not found', 404);
  }
  if (challenge.used_at) {
    throw new WalletError('CHALLENGE_USED', 'Wallet challenge has already been used', 409);
  }
  const now = options.now || new Date();
  if (new Date(challenge.expires_at).getTime() <= now.getTime()) {
    throw new WalletError('CHALLENGE_EXPIRED', 'Wallet challenge has expired', 410);
  }

  let valid = false;
  try {
    valid = await verifyMessage({
      address: getAddress(challenge.wallet_address),
      message: challenge.message,
      signature,
    });
  } catch {
    valid = false;
  }
  if (!valid) {
    throw new WalletError(
      'SIGNATURE_MISMATCH',
      'The signature was not created by the requested wallet',
      401
    );
  }

  const existingOwner = await findWalletOwner(db, challenge.wallet_address, userId);
  if (existingOwner) {
    throw new WalletError(
      'WALLET_ALREADY_LINKED',
      'This wallet is already linked to another account',
      409
    );
  }

  const consumed = await dbRun(
    db,
    `UPDATE wallet_verification_challenges
     SET used_at = ?
     WHERE id = ? AND user_id = ? AND used_at IS NULL AND expires_at > ?`,
    [now.toISOString(), challengeId, userId, now.toISOString()]
  );
  if (consumed.changes !== 1) {
    throw new WalletError(
      'CHALLENGE_NO_LONGER_VALID',
      'Wallet challenge is no longer valid',
      409
    );
  }

  try {
    await dbRun(
      db,
      `UPDATE users
       SET celo_wallet_address = ?, celo_wallet_verified_at = ?
       WHERE id = ?`,
      [getAddress(challenge.wallet_address), now.toISOString(), userId]
    );
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      throw new WalletError(
        'WALLET_ALREADY_LINKED',
        'This wallet is already linked to another account',
        409
      );
    }
    throw error;
  }

  return getWalletStatus(db, userId);
}

async function unlinkWallet(db, userId) {
  const current = await getWalletStatus(db, userId);
  if (!current.address) return current;
  const activePayout = await findActivePayout(db, userId);
  if (activePayout) {
    throw new WalletError(
      'WALLET_UNLINK_BLOCKED',
      'The wallet cannot be removed while a reward payment is pending',
      409
    );
  }

  await dbRun(
    db,
    `UPDATE users
     SET celo_wallet_address = NULL, celo_wallet_verified_at = NULL
     WHERE id = ?`,
    [userId]
  );
  await dbRun(
    db,
    `UPDATE wallet_verification_challenges
     SET used_at = CURRENT_TIMESTAMP
     WHERE user_id = ? AND used_at IS NULL`,
    [userId]
  );
  return getWalletStatus(db, userId);
}

module.exports = {
  CELO_SEPOLIA_CHAIN_ID,
  WalletError,
  buildVerificationMessage,
  createWalletChallenge,
  getWalletStatus,
  unlinkWallet,
  verifyWalletChallenge,
};
