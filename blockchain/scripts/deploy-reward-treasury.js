const fs = require('node:fs');
const path = require('node:path');
const { ethers, network } = require('hardhat');

const CELO_SEPOLIA_CHAIN_ID = 11_142_220n;
const CONFIRMATION = 'DEPLOY_REWARD_TREASURY_TO_CELO_SEPOLIA';

async function main() {
  const [deployer] = await ethers.getSigners();
  const providerNetwork = await ethers.provider.getNetwork();
  const isCeloSepolia = network.name === 'celoSepolia';
  const owner = process.env.CELO_REWARD_OWNER || (!isCeloSepolia ? deployer.address : null);
  const maximum = process.env.CELO_CONTRACT_MAX_REWARD_CELO || '0.05';
  const maxRewardWei = ethers.parseEther(maximum);
  const sourceCommit = process.env.CELO_SOURCE_COMMIT || 'local-uncommitted';

  if (isCeloSepolia) {
    if (providerNetwork.chainId !== CELO_SEPOLIA_CHAIN_ID) {
      throw new Error(`Refusing deployment on chain ${providerNetwork.chainId}.`);
    }
    if (process.env.CELO_DEPLOY_CONFIRM !== CONFIRMATION) {
      throw new Error(`Set CELO_DEPLOY_CONFIRM=${CONFIRMATION}.`);
    }
    if (!owner || !ethers.isAddress(owner) || owner === ethers.ZeroAddress) {
      throw new Error('CELO_REWARD_OWNER must be a valid dedicated owner.');
    }
    if (
      owner.toLowerCase() === deployer.address.toLowerCase()
      && process.env.ALLOW_DEPLOYER_AS_REWARD_OWNER !== 'true'
    ) {
      throw new Error('Use a separate owner or explicitly approve deployer ownership.');
    }
    if (!/^[0-9a-f]{40}$/i.test(sourceCommit)) {
      throw new Error('CELO_SOURCE_COMMIT must be the reviewed 40-character Git commit.');
    }
  }
  if (maxRewardWei <= 0n || maxRewardWei > ethers.parseEther('0.05')) {
    throw new Error('CELO_CONTRACT_MAX_REWARD_CELO must be above zero and at most 0.05.');
  }

  const factory = await ethers.getContractFactory('RewardTreasury');
  const treasury = await factory.deploy(owner, maxRewardWei);
  const receipt = await treasury.deploymentTransaction().wait();
  const address = await treasury.getAddress();
  const code = await ethers.provider.getCode(address);
  if (code === '0x') throw new Error('Deployment produced no contract bytecode.');
  if (
    (await treasury.owner()).toLowerCase() !== owner.toLowerCase()
    || !(await treasury.paused())
    || await treasury.maxRewardWei() !== maxRewardWei
  ) {
    throw new Error('Post-deployment contract verification failed.');
  }

  const record = {
    network: network.name,
    chainId: providerNetwork.chainId.toString(),
    contract: address,
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    deployer: deployer.address,
    owner,
    maxRewardCelo: ethers.formatEther(maxRewardWei),
    paused: true,
    sourceCommit,
    compiler: 'solc 0.8.19, optimizer 200 runs',
    deployedAt: new Date().toISOString(),
  };
  const outputDirectory = path.resolve(__dirname, '..', 'deployments');
  fs.mkdirSync(outputDirectory, { recursive: true });
  const outputPath = path.join(outputDirectory, `${network.name}.json`);
  fs.writeFileSync(outputPath, `${JSON.stringify(record, null, 2)}\n`);
  console.log(JSON.stringify(record, null, 2));
  console.log(`Deployment record written to ${outputPath}.`);
}

main().catch((error) => {
  console.error(`RewardTreasury deployment failed: ${error.message}`);
  process.exitCode = 1;
});
