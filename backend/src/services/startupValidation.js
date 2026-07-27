const { isAddress } = require('viem');

const PLACEHOLDER_PATTERNS = [
  /^\$\{.+\}$/,
  /example\.com/i,
  /your[-_]/i,
  /change[-_]?me/i,
  /replace[-_]?with/i,
  /placeholder/i,
];

function isPlaceholder(value) {
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(String(value || '')));
}

function isBooleanString(value) {
  return value === undefined || ['true', 'false'].includes(String(value).toLowerCase());
}

function isSecureUrl(value) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function validPrivateKey(value) {
  return /^(0x)?[0-9a-fA-F]{64}$/.test(String(value || ''));
}

function validateRuntimeEnvironment(environment = process.env) {
  const errors = [];
  const warnings = [];
  const production = environment.NODE_ENV === 'production';
  const rewardsEnabled = String(environment.CELO_REWARDS_ENABLED).toLowerCase() === 'true';
  const dryRun = environment.CELO_REWARD_DRY_RUN === undefined
    || String(environment.CELO_REWARD_DRY_RUN).toLowerCase() === 'true';
  const liveRewards = rewardsEnabled && !dryRun;
  const databaseClient = String(environment.DATABASE_CLIENT || 'sqlite').toLowerCase();

  if (!['sqlite', 'postgres'].includes(databaseClient)) {
    errors.push('DATABASE_CLIENT must be sqlite or postgres');
  }
  if (databaseClient === 'postgres') {
    try {
      const databaseUrl = new URL(environment.DATABASE_URL);
      if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol)) {
        errors.push('DATABASE_URL must use the postgres or postgresql protocol');
      }
    } catch {
      errors.push('DATABASE_URL must be a valid PostgreSQL connection URL');
    }
  }

  for (const name of [
    'CELO_REWARDS_ENABLED',
    'CELO_REWARD_DRY_RUN',
    'METRICS_ENABLED',
    'USE_CLOUD_STORAGE',
    'SENTRY_ENABLED',
  ]) {
    if (!isBooleanString(environment[name])) {
      errors.push(`${name} must be true or false`);
    }
  }

  if (environment.CELO_CHAIN_ID && Number(environment.CELO_CHAIN_ID) !== 11_142_220) {
    errors.push('CELO_CHAIN_ID must be 11142220 for Celo Sepolia');
  }
  if (environment.WALLET_CHALLENGE_TTL_MS) {
    const ttl = Number(environment.WALLET_CHALLENGE_TTL_MS);
    if (!Number.isInteger(ttl) || ttl < 60_000 || ttl > 30 * 60_000) {
      errors.push('WALLET_CHALLENGE_TTL_MS must be between 60000 and 1800000');
    }
  }
  if (environment.CELO_REQUIRED_CONFIRMATIONS) {
    const confirmations = Number(environment.CELO_REQUIRED_CONFIRMATIONS);
    if (!Number.isInteger(confirmations) || confirmations < 1 || confirmations > 20) {
      errors.push('CELO_REQUIRED_CONFIRMATIONS must be between 1 and 20');
    }
  }
  if (environment.CELO_TREASURY_MIN_BALANCE) {
    const minimumBalance = Number(environment.CELO_TREASURY_MIN_BALANCE);
    if (!Number.isFinite(minimumBalance) || minimumBalance <= 0) {
      errors.push('CELO_TREASURY_MIN_BALANCE must be a positive CELO amount');
    }
  }
  const numericRanges = [
    ['API_RATE_LIMIT', 1, 10_000],
    ['AUTH_RATE_LIMIT', 1, 1_000],
    ['RATE_LIMIT_WINDOW_MS', 1_000, 3_600_000],
    ['JSON_BODY_LIMIT_BYTES', 1_024, 10 * 1_024 * 1_024],
    ['TRUST_PROXY_HOPS', 0, 10],
  ];
  for (const [name, minimum, maximum] of numericRanges) {
    if (environment[name] !== undefined && environment[name] !== '') {
      const value = Number(environment[name]);
      if (!Number.isInteger(value) || value < minimum || value > maximum) {
        errors.push(`${name} must be an integer between ${minimum} and ${maximum}`);
      }
    }
  }
  for (const name of ['SENTRY_TRACES_SAMPLE_RATE', 'SENTRY_PROFILES_SAMPLE_RATE']) {
    if (environment[name] !== undefined && environment[name] !== '') {
      const value = Number(environment[name]);
      if (!Number.isFinite(value) || value < 0 || value > 1) {
        errors.push(`${name} must be a number between 0 and 1`);
      }
    }
  }
  const cloudStorageEnabled = String(environment.USE_CLOUD_STORAGE).toLowerCase() === 'true';
  if (cloudStorageEnabled) {
    if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(environment.AWS_S3_BUCKET || '')) {
      errors.push('AWS_S3_BUCKET must be a valid bucket name when cloud storage is enabled');
    }
    if (!environment.AWS_REGION || isPlaceholder(environment.AWS_REGION)) {
      errors.push('AWS_REGION is required when cloud storage is enabled');
    }
    const accessKeyConfigured = Boolean(environment.AWS_ACCESS_KEY_ID);
    const secretKeyConfigured = Boolean(environment.AWS_SECRET_ACCESS_KEY);
    if (accessKeyConfigured !== secretKeyConfigured) {
      errors.push('AWS access key ID and secret must be configured together');
    }
  }

  if (production) {
    for (const name of [
      databaseClient === 'postgres' ? 'DATABASE_URL' : 'DATABASE_PATH',
      'CORS_ORIGIN',
      'JWT_ACCESS_SECRET',
      'JWT_REFRESH_SECRET',
      'METRICS_TOKEN',
      'AUDIT_IP_HASH_SECRET',
    ]) {
      if (environment[name] && isPlaceholder(environment[name])) {
        errors.push(`${name} still contains a placeholder`);
      }
    }
    const sentryEnabled = String(environment.SENTRY_ENABLED).toLowerCase() === 'true';
    if (sentryEnabled) {
      if (!environment.SENTRY_DSN) errors.push('SENTRY_DSN is required when Sentry is enabled');
      else if (isPlaceholder(environment.SENTRY_DSN)) {
        errors.push('SENTRY_DSN still contains a placeholder');
      } else if (!isSecureUrl(environment.SENTRY_DSN)) {
        errors.push('SENTRY_DSN must use HTTPS in production');
      }
    }
    const metricsEnabled = String(environment.METRICS_ENABLED).toLowerCase() === 'true';
    if (metricsEnabled && (
      !environment.METRICS_TOKEN
      || isPlaceholder(environment.METRICS_TOKEN)
      || environment.METRICS_TOKEN.length < 32
    )) {
      errors.push(
        'METRICS_TOKEN must be a non-placeholder value of at least 32 characters when metrics are enabled',
      );
    }
    if (!environment.AUDIT_IP_HASH_SECRET) {
      errors.push('AUDIT_IP_HASH_SECRET is required in production');
    } else if (
      isPlaceholder(environment.AUDIT_IP_HASH_SECRET)
      || environment.AUDIT_IP_HASH_SECRET.length < 32
    ) {
      errors.push('AUDIT_IP_HASH_SECRET must be a non-placeholder value of at least 32 characters');
    }
    for (const name of ['WALLET_VERIFICATION_DOMAIN', 'WALLET_VERIFICATION_URI']) {
      if (!environment[name]) errors.push(`${name} is required in production`);
      else if (isPlaceholder(environment[name])) errors.push(`${name} still contains a placeholder`);
    }
    if (
      environment.WALLET_VERIFICATION_URI
      && !isSecureUrl(environment.WALLET_VERIFICATION_URI)
    ) {
      errors.push('WALLET_VERIFICATION_URI must use HTTPS in production');
    }
  }

  if (liveRewards) {
    if (!isAddress(environment.CELO_REWARD_CONTRACT_ADDRESS || '')) {
      errors.push('CELO_REWARD_CONTRACT_ADDRESS must be a valid deployed address');
    }
    if (!validPrivateKey(environment.CELO_TREASURY_PRIVATE_KEY)) {
      errors.push('CELO_TREASURY_PRIVATE_KEY must be a 32-byte private key');
    }
    if (!isSecureUrl(environment.CELO_RPC_URL)) {
      errors.push('CELO_RPC_URL must use HTTPS when live rewards are enabled');
    }
    if (Number(environment.CELO_CHAIN_ID || 11_142_220) !== 11_142_220) {
      errors.push('Live rewards are restricted to Celo Sepolia');
    }
  }

  if (!rewardsEnabled) warnings.push('CELO reward broadcasting is disabled');
  else if (dryRun) warnings.push('CELO rewards are running in simulation mode');
  if (
    liveRewards
    && String(environment.CELO_RPC_URL).includes('forno.celo-sepolia')
  ) {
    warnings.push('The public Forno RPC has no uptime SLA; configure a supported pilot provider');
  }
  if (production && databaseClient === 'sqlite') {
    warnings.push('Production is using SQLite; run only one backend replica');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    mode: liveRewards ? 'live-testnet' : rewardsEnabled ? 'simulation' : 'disabled',
  };
}

module.exports = {
  isPlaceholder,
  validateRuntimeEnvironment,
};
