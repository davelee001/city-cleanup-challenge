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
    });

    expect(result.valid).toBe(true);
    expect(result.mode).toBe('live-testnet');
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
});
