const { validateRuntimeEnvironment } = require('../../src/services/startupValidation');

describe('runtime environment validation', () => {
  it('keeps local simulation valid and reports broadcasting as disabled', () => {
    const result = validateRuntimeEnvironment({
      NODE_ENV: 'development',
      CELO_REWARDS_ENABLED: 'false',
      CELO_REWARD_DRY_RUN: 'true',
      CELO_CHAIN_ID: '11142220',
    });

    expect(result.valid).toBe(true);
    expect(result.mode).toBe('disabled');
    expect(result.warnings).toContain('CELO reward broadcasting is disabled');
  });

  it('rejects incomplete live reward configuration', () => {
    const result = validateRuntimeEnvironment({
      NODE_ENV: 'production',
      CELO_REWARDS_ENABLED: 'true',
      CELO_REWARD_DRY_RUN: 'false',
      CELO_CHAIN_ID: '11142220',
      CELO_RPC_URL: 'http://unsafe-rpc.test',
      CELO_REWARD_CONTRACT_ADDRESS: 'not-an-address',
      CELO_TREASURY_PRIVATE_KEY: 'short',
      METRICS_TOKEN: '${METRICS_TOKEN}',
      WALLET_VERIFICATION_DOMAIN: 'city-cleanup.example.com',
      WALLET_VERIFICATION_URI: 'http://city-cleanup.example.com',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      'CELO_REWARD_CONTRACT_ADDRESS must be a valid deployed address',
      'CELO_TREASURY_PRIVATE_KEY must be a 32-byte private key',
      'CELO_RPC_URL must use HTTPS when live rewards are enabled',
      'METRICS_TOKEN still contains a placeholder',
      'WALLET_VERIFICATION_DOMAIN still contains a placeholder',
      'WALLET_VERIFICATION_URI still contains a placeholder',
      'WALLET_VERIFICATION_URI must use HTTPS in production',
    ]));
  });

  it('accepts a complete Celo Sepolia pilot configuration', () => {
    const result = validateRuntimeEnvironment({
      NODE_ENV: 'production',
      DATABASE_PATH: '/app/data/city-cleanup.db',
      CELO_REWARDS_ENABLED: 'true',
      CELO_REWARD_DRY_RUN: 'false',
      CELO_CHAIN_ID: '11142220',
      CELO_RPC_URL: 'https://rpc.provider.test/celo-sepolia',
      CELO_REWARD_CONTRACT_ADDRESS: '0x0000000000000000000000000000000000000001',
      CELO_TREASURY_PRIVATE_KEY: `0x${'1'.repeat(64)}`,
      WALLET_VERIFICATION_DOMAIN: 'cleanup.community',
      WALLET_VERIFICATION_URI: 'https://cleanup.community',
      WALLET_CHALLENGE_TTL_MS: '600000',
      METRICS_ENABLED: 'true',
      METRICS_TOKEN: 'm'.repeat(32),
      SENTRY_ENABLED: 'false',
      AUDIT_IP_HASH_SECRET: 'a'.repeat(32),
    });

    expect(result.valid).toBe(true);
    expect(result.mode).toBe('live-testnet');
  });

  it('requires secure Sentry and audit secrets in production', () => {
    const result = validateRuntimeEnvironment({
      NODE_ENV: 'production',
      DATABASE_PATH: '/app/data/city-cleanup.db',
      WALLET_VERIFICATION_DOMAIN: 'cleanup.community',
      WALLET_VERIFICATION_URI: 'https://cleanup.community',
      SENTRY_ENABLED: 'true',
      SENTRY_DSN: 'http://unsafe-sentry.test/1',
      AUDIT_IP_HASH_SECRET: 'short',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      'SENTRY_DSN must use HTTPS in production',
      'AUDIT_IP_HASH_SECRET must be a non-placeholder value of at least 32 characters',
    ]));
  });

  it('requires protected metrics in production', () => {
    const result = validateRuntimeEnvironment({
      NODE_ENV: 'production',
      DATABASE_PATH: '/app/data/city-cleanup.db',
      WALLET_VERIFICATION_DOMAIN: 'cleanup.community',
      WALLET_VERIFICATION_URI: 'https://cleanup.community',
      SENTRY_ENABLED: 'false',
      METRICS_ENABLED: 'true',
      METRICS_TOKEN: 'short',
      AUDIT_IP_HASH_SECRET: 'a'.repeat(32),
    });

    expect(result.errors).toContain(
      'METRICS_TOKEN must be a non-placeholder value of at least 32 characters when metrics are enabled',
    );
  });

  it('rejects unsafe HTTP protection limits', () => {
    const result = validateRuntimeEnvironment({
      API_RATE_LIMIT: '0',
      AUTH_RATE_LIMIT: 'many',
      RATE_LIMIT_WINDOW_MS: '500',
      JSON_BODY_LIMIT_BYTES: '100',
      TRUST_PROXY_HOPS: '20',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(5);
  });

  it('rejects invalid Sentry sampling rates', () => {
    const result = validateRuntimeEnvironment({
      SENTRY_TRACES_SAMPLE_RATE: '1.1',
      SENTRY_PROFILES_SAMPLE_RATE: 'not-a-number',
    });

    expect(result.errors).toEqual(expect.arrayContaining([
      'SENTRY_TRACES_SAMPLE_RATE must be a number between 0 and 1',
      'SENTRY_PROFILES_SAMPLE_RATE must be a number between 0 and 1',
    ]));
  });

  it('rejects incomplete optional S3 storage configuration', () => {
    const result = validateRuntimeEnvironment({
      USE_CLOUD_STORAGE: 'true',
      AWS_S3_BUCKET: 'INVALID_BUCKET',
      AWS_REGION: '',
      AWS_ACCESS_KEY_ID: 'only-one-half',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      'AWS_S3_BUCKET must be a valid bucket name when cloud storage is enabled',
      'AWS_REGION is required when cloud storage is enabled',
      'AWS access key ID and secret must be configured together',
    ]));
  });

  it('accepts a PostgreSQL connection URL', () => {
    const result = validateRuntimeEnvironment({
      DATABASE_CLIENT: 'postgres',
      DATABASE_URL: 'postgresql://cleanup:secret@database.internal/city_cleanup',
    });

    expect(result.valid).toBe(true);
  });

  it('rejects an invalid PostgreSQL connection URL', () => {
    const result = validateRuntimeEnvironment({
      DATABASE_CLIENT: 'postgres',
      DATABASE_URL: 'https://database.internal/city_cleanup',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'DATABASE_URL must use the postgres or postgresql protocol'
    );
  });
});
