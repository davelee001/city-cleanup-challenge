const { parseEther } = require('viem');
const {
  calculateReward,
  createRewardPolicy,
  impactMultiplierBps,
  publicPolicy,
} = require('../../src/services/rewardPolicy');

describe('CELO reward policy', () => {
  const originalEnvironment = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnvironment };
  });

  it('defines the pilot reward amounts and payout limits', () => {
    const policy = publicPolicy(createRewardPolicy());

    expect(policy).toMatchObject({
      version: 'celo-testnet-v1',
      currency: 'CELO',
      network: 'Celo Sepolia',
      baseRewardCelo: '0.01',
      perSubmissionCapCelo: '0.05',
      dailyAccountCapCelo: '0.1',
      weeklyAccountCapCelo: '0.35',
      dailyWalletCapCelo: '0.1',
      weeklyWalletCapCelo: '0.35',
      manualApprovalThresholdCelo: '0.03',
    });
  });

  it('combines category and impact multipliers deterministically', () => {
    const reward = calculateReward({
      waste_category: 'metal',
      estimated_weight: 10,
      item_count: 5,
    });

    expect(reward.categoryMultiplierBps).toBe(15_000);
    expect(reward.impactMultiplierBps).toBe(15_000);
    expect(reward.amountWei).toBe(parseEther('0.0225'));
    expect(reward.requiresManualApproval).toBe(false);
  });

  it('caps a calculated reward at the per-submission limit', () => {
    process.env.CELO_BASE_REWARD = '0.04';
    const reward = calculateReward({
      waste_category: 'metal',
      estimated_weight: 10,
    });

    expect(reward.calculatedWei).toBe(parseEther('0.09'));
    expect(reward.amountWei).toBe(parseEther('0.05'));
    expect(reward.capped).toBe(true);
    expect(reward.requiresManualApproval).toBe(true);
  });

  it('uses item count or weight to classify impact', () => {
    expect(impactMultiplierBps({ item_count: 20 })).toBe(12_500);
    expect(impactMultiplierBps({ estimated_weight: 10 })).toBe(15_000);
    expect(impactMultiplierBps({ item_count: 2, estimated_weight: 1 })).toBe(10_000);
  });
});
