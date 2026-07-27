const { runCeloPilotPreflight } = require('../../src/services/celoPreflight');

function fakeDatabase(paused = true) {
  return {
    get(sql, params, callback) {
      callback(null, {
        id: 1,
        paused: paused ? 1 : 0,
        pause_reason: 'Pilot preflight',
        updated_by_username: 'admin',
        updated_at: '2026-07-25 00:00:00',
      });
    },
  };
}

function completeEnvironment() {
  return {
    NODE_ENV: 'production',
    CELO_REWARDS_ENABLED: 'true',
    CELO_REWARD_DRY_RUN: 'false',
    CELO_CHAIN_ID: '11142220',
    CELO_RPC_URL: 'https://rpc.provider.test/celo-sepolia',
    CELO_REWARD_CONTRACT_ADDRESS: '0x0000000000000000000000000000000000000001',
    CELO_TREASURY_PRIVATE_KEY: `0x${'1'.repeat(64)}`,
    CELO_REQUIRED_CONFIRMATIONS: '2',
    CELO_TREASURY_MIN_BALANCE: '0.1',
    WALLET_VERIFICATION_DOMAIN: 'cleanup.community',
    WALLET_VERIFICATION_URI: 'https://cleanup.community',
    SENTRY_ENABLED: 'false',
    AUDIT_IP_HASH_SECRET: 'a'.repeat(32),
  };
}

describe('Celo pilot preflight', () => {
  it('passes only when deployment checks succeed and application payouts are paused', async () => {
    const gateway = {
      inspectDeployment: jest.fn().mockResolvedValue({
        checkedAt: '2026-07-25T00:00:00.000Z',
        rpc: { ok: true, actualChainId: 11_142_220, blockNumber: '123' },
        contract: {
          deployed: true,
          address: '0x0000000000000000000000000000000000000001',
          paused: false,
          owner: '0x0000000000000000000000000000000000000002',
        },
        signer: {
          matchesOwner: true,
          funded: true,
          balanceCelo: '1',
          minimumBalanceCelo: '0.1',
        },
        ready: true,
      }),
    };

    const result = await runCeloPilotPreflight(fakeDatabase(true), {
      gateway,
      environment: completeEnvironment(),
    });

    expect(result.ready).toBe(true);
    expect(result.checks.every((check) => check.ok)).toBe(true);
  });

  it('fails safely when payouts are active during preflight', async () => {
    const gateway = {
      inspectDeployment: jest.fn().mockResolvedValue({
        checkedAt: '2026-07-25T00:00:00.000Z',
        rpc: { ok: true, actualChainId: 11_142_220, blockNumber: '123' },
        contract: { deployed: true, paused: false, owner: '0x1', address: '0x1' },
        signer: {
          matchesOwner: true,
          funded: true,
          balanceCelo: '1',
          minimumBalanceCelo: '0.1',
        },
      }),
    };

    const result = await runCeloPilotPreflight(fakeDatabase(false), {
      gateway,
      environment: completeEnvironment(),
    });

    expect(result.ready).toBe(false);
    expect(result.checks.find((check) => check.name === 'application_pause')).toMatchObject({
      ok: false,
    });
  });
});
