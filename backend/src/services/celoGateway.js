const {
  createPublicClient,
  createWalletClient,
  encodePacked,
  getAddress,
  http,
  isAddress,
  keccak256,
} = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { celoSepolia } = require('viem/chains');

const REWARD_TREASURY_ABI = [
  {
    type: 'function',
    name: 'payReward',
    stateMutability: 'payable',
    inputs: [
      { name: 'claimId', type: 'bytes32' },
      { name: 'recipient', type: 'address' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'paidClaims',
    stateMutability: 'view',
    inputs: [{ name: 'claimId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
  },
];

function readBoolean(value, fallback = false) {
  if (value === undefined) return fallback;
  return String(value).toLowerCase() === 'true';
}

function normalizePrivateKey(value) {
  if (!value) return null;
  return value.startsWith('0x') ? value : `0x${value}`;
}

function createCeloGateway(options = {}) {
  const enabled = options.enabled ?? readBoolean(process.env.CELO_REWARDS_ENABLED);
  const dryRun = options.dryRun ?? readBoolean(process.env.CELO_REWARD_DRY_RUN, true);
  const rpcUrl = options.rpcUrl
    || process.env.CELO_RPC_URL
    || celoSepolia.rpcUrls.default.http[0];
  const contractAddress = options.contractAddress || process.env.CELO_REWARD_CONTRACT_ADDRESS;
  const privateKey = normalizePrivateKey(
    options.privateKey || process.env.CELO_TREASURY_PRIVATE_KEY
  );
  const confirmations = Number(
    options.confirmations || process.env.CELO_REQUIRED_CONFIRMATIONS || 2
  );
  const configuredChainId = Number(
    options.chainId || process.env.CELO_CHAIN_ID || celoSepolia.id
  );
  if (configuredChainId !== celoSepolia.id) {
    throw new Error(`CELO_CHAIN_ID must be ${celoSepolia.id} for Celo Sepolia`);
  }

  function createChainClient() {
    return createPublicClient({
      chain: celoSepolia,
      transport: http(rpcUrl),
    });
  }

  async function assertRpcChain() {
    const actualChainId = await createChainClient().getChainId();
    if (actualChainId !== celoSepolia.id) {
      throw new Error(
        `Configured CELO RPC is on chain ${actualChainId}; expected ${celoSepolia.id}`
      );
    }
  }

  function assertPayment(payment) {
    if (!/^0x[0-9a-fA-F]{64}$/.test(payment.claimId)) {
      throw new Error('Reward claim ID must be a bytes32 value');
    }
    if (!isAddress(payment.walletAddress)) {
      throw new Error('Reward recipient must be a valid Celo address');
    }
    if (BigInt(payment.amountWei) <= 0n) {
      throw new Error('Reward amount must be positive');
    }
  }

  async function broadcastPayment(payment) {
    assertPayment(payment);
    const recipient = getAddress(payment.walletAddress);

    if (dryRun) {
      return {
        hash: keccak256(encodePacked(
          ['bytes32', 'address', 'uint256'],
          [payment.claimId, recipient, BigInt(payment.amountWei)]
        )),
        simulated: true,
      };
    }
    if (!enabled) throw new Error('CELO rewards are disabled');
    if (!contractAddress || !isAddress(contractAddress)) {
      throw new Error('CELO_REWARD_CONTRACT_ADDRESS is not configured');
    }
    if (!privateKey) throw new Error('CELO_TREASURY_PRIVATE_KEY is not configured');
    await assertRpcChain();

    const account = privateKeyToAccount(privateKey);
    const walletClient = createWalletClient({
      account,
      chain: celoSepolia,
      transport: http(rpcUrl),
    });
    const hash = await walletClient.writeContract({
      address: getAddress(contractAddress),
      abi: REWARD_TREASURY_ABI,
      functionName: 'payReward',
      args: [payment.claimId, recipient],
      value: BigInt(payment.amountWei),
    });
    return { hash, simulated: false };
  }

  async function waitForPayment(hash) {
    if (dryRun) {
      return {
        status: 'success',
        blockNumber: 0n,
        transactionHash: hash,
        simulated: true,
      };
    }
    const publicClient = createChainClient();
    return publicClient.waitForTransactionReceipt({
      hash,
      confirmations: Number.isInteger(confirmations) && confirmations > 0 ? confirmations : 2,
    });
  }

  async function getPaymentStatus(hash) {
    if (dryRun) {
      return {
        status: 'success',
        blockNumber: 0n,
        confirmations,
        transactionHash: hash,
        simulated: true,
      };
    }
    const publicClient = createChainClient();
    try {
      const receipt = await publicClient.getTransactionReceipt({ hash });
      const latestBlock = await publicClient.getBlockNumber();
      const confirmationCount = latestBlock >= receipt.blockNumber
        ? Number(latestBlock - receipt.blockNumber + 1n)
        : 0;
      return {
        ...receipt,
        confirmations: confirmationCount,
      };
    } catch (error) {
      if (
        error.name === 'TransactionReceiptNotFoundError'
        || String(error.message).includes('could not be found')
      ) {
        return null;
      }
      throw error;
    }
  }

  async function isClaimPaid(claimId) {
    if (dryRun || !contractAddress || !isAddress(contractAddress)) return false;
    const publicClient = createChainClient();
    return publicClient.readContract({
      address: getAddress(contractAddress),
      abi: REWARD_TREASURY_ABI,
      functionName: 'paidClaims',
      args: [claimId],
    });
  }

  return {
    broadcastPayment,
    chainId: celoSepolia.id,
    contractAddress: contractAddress || null,
    dryRun,
    enabled,
    getPaymentStatus,
    isClaimPaid,
    requiredConfirmations:
      Number.isInteger(confirmations) && confirmations > 0 ? confirmations : 2,
    waitForPayment,
  };
}

module.exports = {
  REWARD_TREASURY_ABI,
  createCeloGateway,
};
