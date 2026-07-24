const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('RewardTreasury', () => {
  async function deployTreasury() {
    const [owner, recipient, outsider] = await ethers.getSigners();
    const factory = await ethers.getContractFactory('RewardTreasury');
    const treasury = await factory.deploy(owner.address);
    await treasury.waitForDeployment();
    return { owner, recipient, outsider, treasury };
  }

  async function expectRevert(promise, expectedMessage) {
    try {
      await promise;
      expect.fail('Expected transaction to revert');
    } catch (error) {
      expect(String(error.message)).to.include(expectedMessage);
    }
  }

  it('pays native CELO and permanently marks the claim as paid', async () => {
    const { recipient, treasury } = await deployTreasury();
    const claimId = ethers.id('submission:1');
    const amount = ethers.parseEther('0.01');
    const before = await ethers.provider.getBalance(recipient.address);

    await (await treasury.payReward(claimId, recipient.address, { value: amount })).wait();

    expect(await treasury.paidClaims(claimId)).to.equal(true);
    expect(await ethers.provider.getBalance(recipient.address)).to.equal(before + amount);
  });

  it('rejects a second payment for the same claim', async () => {
    const { recipient, treasury } = await deployTreasury();
    const claimId = ethers.id('submission:2');
    const value = ethers.parseEther('0.01');
    await (await treasury.payReward(claimId, recipient.address, { value })).wait();

    await expectRevert(
      treasury.payReward(claimId, recipient.address, { value }),
      'claim already paid'
    );
  });

  it('restricts payments and pause controls to the owner', async () => {
    const { recipient, outsider, treasury } = await deployTreasury();
    const value = ethers.parseEther('0.01');

    await expectRevert(
      treasury.connect(outsider).payReward(ethers.id('unauthorized'), recipient.address, {
        value,
      }),
      'owner required'
    );
    await (await treasury.setPaused(true)).wait();
    await expectRevert(
      treasury.payReward(ethers.id('paused'), recipient.address, { value }),
      'rewards paused'
    );
  });
});
