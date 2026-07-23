const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const config = require('../config');
const db = require('../db');

class TokenError extends Error {
  constructor(message, code = 'INVALID_TOKEN') {
    super(message);
    this.name = 'TokenError';
    this.code = code;
  }
}

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (error, row) => {
    if (error) reject(error);
    else resolve(row);
  });
});

const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function onRun(error) {
    if (error) reject(error);
    else resolve({ changes: this.changes, lastID: this.lastID });
  });
});

const publicUser = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  phone: user.phone,
  location: user.location,
  role: user.role || 'user',
});

const signTokenPair = (user) => {
  const common = {
    subject: String(user.id),
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
  };
  const accessToken = jwt.sign(
    { username: user.username, role: user.role || 'user', type: 'access' },
    config.jwt.accessSecret,
    {
      ...common,
      expiresIn: config.jwt.accessExpiresIn,
      jwtid: crypto.randomUUID(),
    }
  );
  const refreshToken = jwt.sign(
    { username: user.username, type: 'refresh' },
    config.jwt.refreshSecret,
    {
      ...common,
      expiresIn: config.jwt.refreshExpiresIn,
      jwtid: crypto.randomUUID(),
    }
  );

  const accessPayload = jwt.decode(accessToken);
  const refreshPayload = jwt.decode(refreshToken);

  return {
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    accessTokenExpiresAt: new Date(accessPayload.exp * 1000).toISOString(),
    refreshTokenExpiresAt: new Date(refreshPayload.exp * 1000).toISOString(),
  };
};

const storeRefreshToken = async (userId, tokenPair) => {
  await dbRun(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES (?, ?, ?)`,
    [userId, hashToken(tokenPair.refreshToken), tokenPair.refreshTokenExpiresAt]
  );
};

const issueTokenPair = async (user) => {
  const tokenPair = signTokenPair(user);
  await storeRefreshToken(user.id, tokenPair);
  return tokenPair;
};

const verifyAccessToken = (token) => {
  try {
    const payload = jwt.verify(token, config.jwt.accessSecret, {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    });
    if (payload.type !== 'access') {
      throw new TokenError('Access token required', 'WRONG_TOKEN_TYPE');
    }
    return payload;
  } catch (error) {
    if (error instanceof TokenError) throw error;
    if (error.name === 'TokenExpiredError') {
      throw new TokenError('Access token expired', 'ACCESS_TOKEN_EXPIRED');
    }
    throw new TokenError('Invalid access token');
  }
};

const verifyRefreshToken = (token) => {
  try {
    const payload = jwt.verify(token, config.jwt.refreshSecret, {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    });
    if (payload.type !== 'refresh') {
      throw new TokenError('Refresh token required', 'WRONG_TOKEN_TYPE');
    }
    return payload;
  } catch (error) {
    if (error instanceof TokenError) throw error;
    if (error.name === 'TokenExpiredError') {
      throw new TokenError('Refresh token expired', 'REFRESH_TOKEN_EXPIRED');
    }
    throw new TokenError('Invalid refresh token');
  }
};

const rotateRefreshToken = async (refreshToken) => {
  const payload = verifyRefreshToken(refreshToken);
  const tokenHash = hashToken(refreshToken);
  const record = await dbGet(
    'SELECT * FROM refresh_tokens WHERE token_hash = ?',
    [tokenHash]
  );

  if (!record) {
    throw new TokenError('Refresh token is not recognized');
  }
  if (record.revoked_at) {
    await dbRun(
      'UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP) WHERE user_id = ?',
      [record.user_id]
    );
    throw new TokenError('Refresh token has already been used', 'REFRESH_TOKEN_REUSED');
  }
  if (String(record.user_id) !== String(payload.sub)) {
    throw new TokenError('Refresh token subject mismatch');
  }

  const user = await dbGet(
    'SELECT id, username, email, phone, location, role FROM users WHERE id = ?',
    [record.user_id]
  );
  if (!user) {
    throw new TokenError('User no longer exists');
  }

  const replacement = signTokenPair(user);
  const replacementHash = hashToken(replacement.refreshToken);
  const update = await dbRun(
    `UPDATE refresh_tokens
     SET revoked_at = CURRENT_TIMESTAMP, replaced_by_hash = ?
     WHERE token_hash = ? AND revoked_at IS NULL`,
    [replacementHash, tokenHash]
  );
  if (update.changes !== 1) {
    throw new TokenError('Refresh token has already been used', 'REFRESH_TOKEN_REUSED');
  }
  await storeRefreshToken(user.id, replacement);

  return { user: publicUser(user), tokens: replacement };
};

const revokeRefreshToken = async (refreshToken) => {
  if (!refreshToken) return;
  await dbRun(
    'UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP) WHERE token_hash = ?',
    [hashToken(refreshToken)]
  );
};

const revokeAllUserTokens = async (userId) => {
  await dbRun(
    'UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP) WHERE user_id = ?',
    [userId]
  );
};

module.exports = {
  TokenError,
  issueTokenPair,
  publicUser,
  revokeAllUserTokens,
  revokeRefreshToken,
  rotateRefreshToken,
  verifyAccessToken,
};
