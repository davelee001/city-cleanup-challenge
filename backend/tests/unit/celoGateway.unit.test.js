const { createCeloGateway } = require('../../src/services/celoGateway');

describe('Celo Sepolia gateway', () => {
  const payment = {
    claimId: `0x${'1'.repeat(64)}`,
    walletAddress: '0x0000000000000000000000000000000000000001',
    amountWei: '10000000000000000',
  };

  it('creates a deterministic local simulation without an RPC call or private key', async () => {
    const gateway = createCeloGateway({ dryRun: true });

    const first = await gateway.broadcastPayment(payment);
    const second = await gateway.broadcastPayment(payment);

    expect(first.simulated).toBe(true);
    expect(first.hash).toBe(second.hash);
    expect(first.hash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(gateway.chainId).toBe(11_142_220);
  });

  it('refuses configuration for a different chain', () => {
    expect(() => createCeloGateway({
      dryRun: true,
      chainId: 44_787,
    })).toThrow('CELO_CHAIN_ID must be 11142220');
  });
});
