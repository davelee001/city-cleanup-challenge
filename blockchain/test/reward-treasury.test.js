const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('RewardTreasury', () => {
  const maxReward = ethers.parseEther('0.05');

  async function deployTreasury() {
    const [owner, recipient, outsider, nextOwner] = await ethers.getSigners();
    const factory = await ethers.getContractFactory('RewardTreasury');
    const treasury = await factory.deploy(owner.address, maxReward);
    await treasury.waitForDeployment();
    return { owner, recipient, outsider, nextOwner, treasury };
  }

  async function expectRevert(promise, expectedMessage) {
    try {
      await promise;
      expect.fail('Expected transaction to revert');
    } catch (error) {
      expect(String(error.message)).to.include(expectedMessage);
    }
  }

  it('deploys paused with the configured owner and reward ceiling', async () => {
    const { owner, treasury } = await deployTreasury();
    expect(await treasury.owner()).to.equal(owner.address);
    expect(await treasury.paused()).to.equal(true);
    expect(await treasury.maxRewardWei()).to.equal(maxReward);
  });

  it('pays native CELO once after the owner explicitly resumes rewards', async () => {
    const { recipient, treasury } = await deployTreasury();
    const claimId = ethers.id('submission:1');
    const amount = ethers.parseEther('0.01');
    const before = await ethers.provider.getBalance(recipient.address);

    await (await treasury.setPaused(false)).wait();
    await (await treasury.payReward(claimId, recipient.address, { value: amount })).wait();

    expect(await treasury.paidClaims(claimId)).to.equal(true);
    expect(await ethers.provider.getBalance(recipient.address)).to.equal(before + amount);
  });

  it('rejects a second payment for the same claim', async () => {
    const { recipient, treasury } = await deployTreasury();
    const claimId = ethers.id('submission:2');
    const value = ethers.parseEther('0.01');
    await (await treasury.setPaused(false)).wait();
    await (await treasury.payReward(claimId, recipient.address, { value })).wait();

    await expectRevert(
      treasury.payReward(claimId, recipient.address, { value }),
      'claim already paid',
    );
  });

  it('rejects zero claims, recipients, amounts, and oversized rewards', async () => {
    const { recipient, treasury } = await deployTreasury();
    await (await treasury.setPaused(false)).wait();

    await expectRevert(
      treasury.payReward(ethers.ZeroHash, recipient.address, { value: 1n }),
      'invalid claim',
    );
    await expectRevert(
      treasury.payReward(ethers.id('zero-recipient'), ethers.ZeroAddress, { value: 1n }),
      'invalid recipient',
    );
    await expectRevert(
      treasury.payReward(ethers.id('empty'), recipient.address),
      'empty reward',
    );
    await expectRevert(
      treasury.payReward(ethers.id('oversized'), recipient.address, {
        value: maxReward + 1n,
      }),
      'reward exceeds maximum',
    );
  });

  it('accepts a reward exactly at the immutable ceiling', async () => {
    const { recipient, treasury } = await deployTreasury();
    await (await treasury.setPaused(false)).wait();
    await (await treasury.payReward(ethers.id('maximum'), recipient.address, {
      value: maxReward,
    })).wait();
    expect(await treasury.paidClaims(ethers.id('maximum'))).to.equal(true);
  });

  it('rolls back duplicate state when a recipient rejects the transfer', async () => {
    const { treasury } = await deployTreasury();
    const receiverFactory = await ethers.getContractFactory('RejectingReceiver');
    const receiver = await receiverFactory.deploy();
    await receiver.waitForDeployment();
    const claimId = ethers.id('rejected-transfer');
    await (await treasury.setPaused(false)).wait();

    await expectRevert(
      treasury.payReward(claimId, await receiver.getAddress(), { value: 1n }),
      'transfer failed',
    );
    expect(await treasury.paidClaims(claimId)).to.equal(false);
  });

  it('restricts payments and pause controls to the owner', async () => {
    const { recipient, outsider, treasury } = await deployTreasury();
    await expectRevert(
      treasury.connect(outsider).setPaused(false),
      'owner required',
    );
    await (await treasury.setPaused(false)).wait();
    await expectRevert(
      treasury.connect(outsider).payReward(ethers.id('unauthorized'), recipient.address, {
        value: ethers.parseEther('0.01'),
      }),
      'owner required',
    );
    await (await treasury.setPaused(true)).wait();
    await expectRevert(
      treasury.payReward(ethers.id('paused'), recipient.address, { value: 1n }),
      'rewards paused',
    );
  });

  it('requires the nominated owner to accept ownership', async () => {
    const { nextOwner, outsider, treasury } = await deployTreasury();
    await (await treasury.transferOwnership(nextOwner.address)).wait();
    expect(await treasury.pendingOwner()).to.equal(nextOwner.address);

    await expectRevert(
      treasury.connect(outsider).acceptOwnership(),
      'pending owner required',
    );
    await (await treasury.connect(nextOwner).acceptOwnership()).wait();
    expect(await treasury.owner()).to.equal(nextOwner.address);
    expect(await treasury.pendingOwner()).to.equal(ethers.ZeroAddress);
    await expectRevert(treasury.setPaused(false), 'owner required');
    await (await treasury.connect(nextOwner).setPaused(false)).wait();
    expect(await treasury.paused()).to.equal(false);
  });

  it('rejects unsafe constructor and ownership values', async () => {
    const factory = await ethers.getContractFactory('RewardTreasury');
    await expectRevert(
      factory.deploy(ethers.ZeroAddress, maxReward),
      'invalid owner',
    );
    const { treasury } = await deployTreasury();
    await expectRevert(
      treasury.transferOwnership(ethers.ZeroAddress),
      'invalid owner',
    );
  });
});
