const { ethers } = require('hardhat');

async function main() {
  const [deployer] = await ethers.getSigners();
  const owner = process.env.CELO_REWARD_OWNER || deployer.address;
  console.log('Deploying RewardTreasury with account:', deployer.address);
  console.log('Reward treasury owner:', owner);

  const RewardTreasury = await ethers.getContractFactory('RewardTreasury');
  const treasury = await RewardTreasury.deploy(owner);
  await treasury.waitForDeployment();

  console.log('RewardTreasury deployed to:', await treasury.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
