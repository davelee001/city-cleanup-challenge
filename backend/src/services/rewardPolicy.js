const { formatEther, parseEther } = require('viem');

const BPS = 10_000n;
const DEFAULT_CATEGORY_MULTIPLIERS = Object.freeze({
  plastic: 10_000,
  glass: 12_000,
  metal: 15_000,
  paper: 8_000,
  mixed: 10_000,
});

function readCeloAmount(name, fallback) {
  const value = String(process.env[name] || fallback).trim();
  try {
    const wei = parseEther(value);
    if (wei <= 0n) throw new Error('must be positive');
    return wei;
  } catch {
    throw new Error(`${name} must be a positive CELO amount`);
  }
}

function readCategoryMultipliers() {
  if (!process.env.CELO_CATEGORY_MULTIPLIERS_BPS) {
    return DEFAULT_CATEGORY_MULTIPLIERS;
  }
  let parsed;
  try {
    parsed = JSON.parse(process.env.CELO_CATEGORY_MULTIPLIERS_BPS);
  } catch {
    throw new Error('CELO_CATEGORY_MULTIPLIERS_BPS must be valid JSON');
  }
  const result = {};
  for (const category of Object.keys(DEFAULT_CATEGORY_MULTIPLIERS)) {
    const value = Number(parsed[category]);
    if (!Number.isInteger(value) || value < 1 || value > 30_000) {
      throw new Error(`Invalid reward multiplier for ${category}`);
    }
    result[category] = value;
  }
  return Object.freeze(result);
}

function impactMultiplierBps(submission) {
  const weight = Number(submission.estimated_weight || 0);
  const items = Number(submission.item_count || 0);
  if (weight >= 10 || items >= 50) return 15_000;
  if (weight >= 5 || items >= 20) return 12_500;
  return 10_000;
}

function createRewardPolicy() {
  const policy = {
    version: process.env.CELO_REWARD_POLICY_VERSION || 'celo-testnet-v1',
    baseRewardWei: readCeloAmount('CELO_BASE_REWARD', '0.01'),
    perSubmissionCapWei: readCeloAmount('CELO_PER_SUBMISSION_CAP', '0.05'),
    dailyAccountCapWei: readCeloAmount('CELO_DAILY_ACCOUNT_CAP', '0.10'),
    weeklyAccountCapWei: readCeloAmount('CELO_WEEKLY_ACCOUNT_CAP', '0.35'),
    dailyWalletCapWei: readCeloAmount('CELO_DAILY_WALLET_CAP', '0.10'),
    weeklyWalletCapWei: readCeloAmount('CELO_WEEKLY_WALLET_CAP', '0.35'),
    manualApprovalThresholdWei: readCeloAmount('CELO_MANUAL_APPROVAL_THRESHOLD', '0.03'),
    categoryMultipliersBps: readCategoryMultipliers(),
  };

  return Object.freeze(policy);
}

function calculateReward(submission, policy = createRewardPolicy()) {
  const category = String(submission.waste_category || '').toLowerCase();
  const categoryBps = BigInt(policy.categoryMultipliersBps[category] || BPS);
  const impactBps = BigInt(impactMultiplierBps(submission));
  const combinedBps = (categoryBps * impactBps) / BPS;
  const calculatedWei = (policy.baseRewardWei * combinedBps) / BPS;
  const amountWei = calculatedWei > policy.perSubmissionCapWei
    ? policy.perSubmissionCapWei
    : calculatedWei;

  return {
    policyVersion: policy.version,
    baseRewardWei: policy.baseRewardWei,
    category,
    categoryMultiplierBps: Number(categoryBps),
    impactMultiplierBps: Number(impactBps),
    combinedMultiplierBps: Number(combinedBps),
    calculatedWei,
    amountWei,
    amountCelo: formatEther(amountWei),
    capped: calculatedWei > policy.perSubmissionCapWei,
    requiresManualApproval: amountWei >= policy.manualApprovalThresholdWei,
  };
}

function publicPolicy(policy = createRewardPolicy()) {
  return {
    version: policy.version,
    currency: 'CELO',
    network: 'Celo Sepolia',
    baseRewardCelo: formatEther(policy.baseRewardWei),
    perSubmissionCapCelo: formatEther(policy.perSubmissionCapWei),
    dailyAccountCapCelo: formatEther(policy.dailyAccountCapWei),
    weeklyAccountCapCelo: formatEther(policy.weeklyAccountCapWei),
    dailyWalletCapCelo: formatEther(policy.dailyWalletCapWei),
    weeklyWalletCapCelo: formatEther(policy.weeklyWalletCapWei),
    manualApprovalThresholdCelo: formatEther(policy.manualApprovalThresholdWei),
    categoryMultipliersBps: policy.categoryMultipliersBps,
    impactMultipliersBps: {
      standard: 10_000,
      medium: 12_500,
      large: 15_000,
    },
  };
}

module.exports = {
  calculateReward,
  createRewardPolicy,
  impactMultiplierBps,
  publicPolicy,
};
