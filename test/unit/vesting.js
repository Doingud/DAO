const { ethers } = require("hardhat");
const { time } = require("@openzeppelin/test-helpers");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");
const { ONE_ADDRESS,
        ZERO_ADDRESS,
        FIFTY_ETHER,
        ONE_HUNDRED_ETHER,
        BASIS_POINTS,
        TAX_RATE
      } = require('../helpers/constants.js');
const init = require('../test-init.js');

use(solidity);

  let AMOR_TOKEN;
  let VESTING;
  let VESTING_START
  let VESTING_TIME;
  let AMORDeducted;

describe("unit - Vesting", function () {

  const setupTests = deployments.createFixture(async () => {
    const signers = await ethers.getSigners();
    const setup = await init.initialize(signers);
    await init.getTokens(setup);

    AMOR_TOKEN = setup.tokens.AmorTokenImplementation;
    AMOR_GUILD_TOKEN = setup.tokens.AmorGuildToken;
    FX_AMOR_TOKEN = setup.tokens.FXAMORxGuild;
    DAMOR_GUILD_TOKEN = setup.tokens.dAMORxGuild;
    CLONE_FACTORY = await init.getGuildFactory(setup);

    root = setup.roles.root;
    multisig = setup.roles.doingud_multisig;
    user1 = setup.roles.user1;
    user2 = setup.roles.user2;

    VESTING = await init.vestingContract(setup);

  });

  beforeEach('Setup', async function() {
    await setupTests();
    AMORDeducted = ethers.BigNumber.from((ONE_HUNDRED_ETHER*(BASIS_POINTS-TAX_RATE)/BASIS_POINTS).toString());
    await AMOR_TOKEN.transfer(VESTING.address, ONE_HUNDRED_ETHER);

  });

  context("Constructor", () => {
    it("Should have deployed the contract with the right parameters", async function () {
      expect(await VESTING.SENTINEL()).to.equal(ONE_ADDRESS);
      expect(await VESTING.SENTINELOwner()).to.equal(ZERO_ADDRESS);
      expect(await VESTING.beneficiaries(ZERO_ADDRESS)).to.equal(ONE_ADDRESS);
    });
  });

  context("function: vestAMOR()", () => {
    it("Should lock AMOR in the contract", async function () {
      //await AMOR_TOKEN.approve(VESTING.address, ONE_HUNDRED_ETHER);
      //await VESTING.vestAmor(ONE_HUNDRED_ETHER);
      //await AMOR_TOKEN.transfer(VESTING.address, ONE_HUNDRED_ETHER);

      expect(await VESTING.unallocatedAMOR()).to.equal(AMORDeducted);
    });
  });

  context("function: allocateVestedTokens()", () => {
    it("Should allocate vested tokens to a beneficiary", async function () {
      //AMOR_TOKEN.transfer(VESTING.address, ONE_HUNDRED_ETHER)
      VESTING_START = await time.latest();
      VESTING_TIME = parseInt(time.duration.years(2)) + parseInt(VESTING_START);
      await VESTING.allocateVestedTokens(user1.address, AMORDeducted, 0, parseInt(VESTING_START), VESTING_TIME);
      expect(await VESTING.balanceOf(user1.address)).to.equal(AMORDeducted);
      expect(await VESTING.unallocatedAMOR()).to.equal(0);
      expect(await VESTING.beneficiaries(user1.address)).equal(ONE_ADDRESS);
      expect(await VESTING.SENTINELOwner()).to.equal(user1.address);
    });

    it("Should fail if unsufficient unallocated AMOR", async function () {
      await expect(VESTING.allocateVestedTokens(user1.address, ONE_HUNDRED_ETHER, 0, parseInt(VESTING_START), VESTING_TIME)).
        to.be.revertedWith("InsufficientFunds()");
    });
  });

  context("function: modifyAllocation()", () => {
    it("Should allow the MetaDAO to change allocation details", async function () {
      ///await AMOR_TOKEN.transfer(VESTING.address, ONE_HUNDRED_ETHER);
      VESTING_START = await time.latest();
      VESTING_TIME = parseInt(time.duration.years(2)) + parseInt(VESTING_START);
      await VESTING.allocateVestedTokens(user1.address, AMORDeducted, 0, parseInt(VESTING_START), VESTING_TIME);
      await AMOR_TOKEN.transfer(VESTING.address, ONE_HUNDRED_ETHER);
      await VESTING.modifyAllocation(user1.address, AMORDeducted, 0, parseInt(VESTING_START), VESTING_TIME);
      expect(await VESTING.balanceOf(user1.address)).
        to.equal(ethers.BigNumber.from((AMORDeducted*2).toString()));

      let userBalance = await VESTING.allocations(user1.address);
      expect(userBalance.tokensAllocated).to.equal((AMORDeducted*2).toString());
    });

    it("Should fail if benenficiary is not found", async function () {
      await expect(VESTING.modifyAllocation(user2.address, AMORDeducted, 0, parseInt(VESTING_START), VESTING_TIME)).
        to.be.revertedWith("NotFound()");
    });
  });

  context("function: tokensAvailable()", () => {
    it("Should calculate the correct amount of tokens for time passed", async function () {
      VESTING_START = await time.latest();
      VESTING_TIME = parseInt(time.duration.years(2)) + parseInt(VESTING_START);
      await VESTING.allocateVestedTokens(user1.address, AMORDeducted, 0, parseInt(VESTING_START), VESTING_TIME);
      let userInfo = await VESTING.allocations(user1.address);
      await time.increaseTo(VESTING_TIME);
      let timeElapsed = VESTING_TIME - userInfo.vestingStart;
      let tokensClaimable = userInfo.tokensAllocated * timeElapsed / (userInfo.vestingDate - userInfo.vestingStart);
      expect(await VESTING.tokensAvailable(user1.address)).to.equal(tokensClaimable.toString());
    });
  });

  context("function: withdrawAMOR()", () => {
    it("Should allow a user to withdraw an amount of AMOR", async function () {
      await AMOR_TOKEN.transfer(VESTING.address, ONE_HUNDRED_ETHER);
      VESTING_START = await time.latest();
      VESTING_TIME = parseInt(time.duration.years(2)) + parseInt(VESTING_START);
      await VESTING.allocateVestedTokens(user1.address, (AMORDeducted*2).toString(), 0, parseInt(VESTING_START), VESTING_TIME);
      await time.increaseTo(VESTING_TIME);
      let userBalance = await VESTING.tokensAvailable(user1.address);
      await VESTING.connect(user1).withdrawAmor(FIFTY_ETHER);
      expect(await VESTING.tokensAvailable(user1.address)).
        to.equal((userBalance-FIFTY_ETHER).toString());
      
      userBalance = await VESTING.tokensAvailable(user1.address);
      await VESTING.connect(user1).withdrawAmor(ONE_HUNDRED_ETHER);
      expect(await VESTING.tokensAvailable(user1.address)).
        to.equal((userBalance-ONE_HUNDRED_ETHER).toString())
    });

    it("Should revert if tokensAvailable exceeded", async function () {
      VESTING_START = await time.latest();
      VESTING_TIME = parseInt(time.duration.years(2)) + parseInt(VESTING_START);
      await VESTING.allocateVestedTokens(user1.address, AMORDeducted, 0, parseInt(VESTING_START), VESTING_TIME);
      await expect(VESTING.connect(user1).withdrawAmor(ONE_HUNDRED_ETHER)).
        to.be.revertedWith("InsufficientFunds()")
    });

    it("Should revert if no token allocation", async function () {
      await expect(VESTING.withdrawAmor(ONE_HUNDRED_ETHER)).
        to.be.revertedWith("NotFound()");
    });
  });

  context("function: balanceOf()", () => {
    it("Should return the correct balance", async function () {
      VESTING_START = await time.latest();
      VESTING_TIME = parseInt(time.duration.years(2)) + parseInt(VESTING_START);
      await VESTING.allocateVestedTokens(user1.address, AMORDeducted, 0, parseInt(VESTING_START), VESTING_TIME);
      let currentTime = await time.latest();
      let cliff = parseInt(currentTime) + parseInt(time.duration.weeks(10));
      let vestingEnd = parseInt(time.duration.weeks(11));
      await AMOR_TOKEN.transfer(VESTING.address, ONE_HUNDRED_ETHER);
      await VESTING.allocateVestedTokens(user2.address, FIFTY_ETHER, cliff, parseInt(currentTime), vestingEnd);
      expect(await VESTING.balanceOf(user2.address)).to.be.equal((FIFTY_ETHER).toString());
    });
  });

});