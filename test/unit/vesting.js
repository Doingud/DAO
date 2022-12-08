const { ethers } = require("hardhat");
const { time } = require("@openzeppelin/test-helpers");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");
const { ONE_ADDRESS,
        ZERO_ADDRESS,
        FIFTY_ETHER,
        ONE_HUNDRED_ETHER,
        BASIS_POINTS,
        TAX_RATE,
        AMOR_TOKEN_NAME,
        AMOR_TOKEN_SYMBOL
      } = require('../helpers/constants.js');
const init = require('../test-init.js');

use(solidity);

  let AMOR_TOKEN;
  let VESTING;
  let VESTING_START
  let VESTING_TIME;
  let AMORDeducted;
  let user1;
  let user2;

describe("unit - Vesting", function () {

  const setupTests = deployments.createFixture(async () => {
    const signers = await ethers.getSigners();
    const setup = await init.initialize(signers);
    await init.getTokens(setup);

    AMOR_TOKEN = setup.tokens.AmorTokenImplementation;
    await AMOR_TOKEN.init(
      AMOR_TOKEN_NAME, 
      AMOR_TOKEN_SYMBOL, 
      setup.roles.authorizer_adaptor.address, //taxController
      TAX_RATE,
      setup.roles.root.address 
    );

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
    VESTING_START = await time.latest();
    VESTING_START = parseInt(time.duration.minutes(1)) + parseInt(VESTING_START);
    VESTING_TIME = parseInt(time.duration.years(2)) + parseInt(VESTING_START);

  });

  context("function: vestAMOR()", () => {
    it("Should lock AMOR in the contract", async function () {
      expect(await VESTING.unallocatedAMOR()).to.equal(AMORDeducted);
    });
  });

  context("function: allocateVestedTokens()", () => {
    it("Should allocate vested tokens to a beneficiary", async function () {
      expect(await VESTING.beneficiaries(user1.address)).to.be.false;

      await VESTING.allocateVestedTokens(user1.address, AMORDeducted, VESTING_START, VESTING_START, VESTING_TIME);
      expect(await VESTING.balanceOf(user1.address)).to.equal(AMORDeducted);
      expect(await VESTING.unallocatedAMOR()).to.equal(0);
      expect(await VESTING.beneficiaries(user1.address)).to.be.true;
    });

    it("Should fail if unsufficient unallocated AMOR", async function () {
      await expect(VESTING.allocateVestedTokens(user1.address, ONE_HUNDRED_ETHER, 0, VESTING_START, VESTING_TIME)).
        to.be.revertedWith("InsufficientFunds()");
    });

    it("Should fail if the dates are invalid", async function () {
      await AMOR_TOKEN.transfer(VESTING.address, ONE_HUNDRED_ETHER);
      /// Fails when the cliff < vestingStart, cliff must be >= `vestingStart`
      await expect(VESTING.allocateVestedTokens(user1.address, AMORDeducted, 0, VESTING_START, VESTING_TIME)).
        to.be.revertedWith("InvalidDate()");
      /// Fails when the cliff > vestingDate, cliff must be <= vestingDate
      await expect(VESTING.allocateVestedTokens(user1.address, AMORDeducted, (VESTING_TIME + 1), VESTING_START, VESTING_TIME)).
        to.be.revertedWith("InvalidDate()");
      /// Fails when the vestingStart < block.timestamp, vestingStart must be >= block.timestamp
      await expect(VESTING.allocateVestedTokens(user1.address, AMORDeducted, VESTING_TIME, 0, VESTING_TIME)).
        to.be.revertedWith("InvalidDate()");
    });
  });

  context("function: modifyAllocation()", () => {
    it("Should allow the MetaDAO to change allocation details", async function () {
      await VESTING.allocateVestedTokens(user1.address, AMORDeducted, VESTING_START, VESTING_START, VESTING_TIME);
      await AMOR_TOKEN.transfer(VESTING.address, ONE_HUNDRED_ETHER);
      await VESTING.modifyAllocation(user1.address, AMORDeducted);
      expect(await VESTING.balanceOf(user1.address)).
        to.equal(ethers.BigNumber.from((AMORDeducted*2).toString()));

      let userBalance = await VESTING.allocations(user1.address);
      expect(userBalance.tokensAllocated).to.equal((AMORDeducted*2).toString());
    });

    it("Should fail if benenficiary is not found", async function () {
      await expect(VESTING.modifyAllocation(user2.address, AMORDeducted)).
        to.be.revertedWith("NotFound()");
    });
  });

  context("function: tokensAvailable()", () => {
    it("Should revert withdrawAMOR if allocation.cliff > block.timestamp", async function () {
      await VESTING.allocateVestedTokens(user1.address, AMORDeducted, (VESTING_TIME*2 - 1), VESTING_START, (VESTING_TIME*2));

      await expect(VESTING.connect(user1).withdrawAmor(ONE_HUNDRED_ETHER)).
        to.be.revertedWith("NotVested()");
    });

    it("Should calculate the correct amount of tokens for time passed", async function () {
      await VESTING.allocateVestedTokens(user1.address, AMORDeducted, VESTING_START, VESTING_START, VESTING_TIME);
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
      await VESTING.allocateVestedTokens(user1.address, (AMORDeducted*2).toString(), VESTING_START, VESTING_START, VESTING_TIME);
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
      await VESTING.allocateVestedTokens(user1.address, AMORDeducted, VESTING_START, VESTING_START, VESTING_TIME);
      await time.increaseTo(VESTING_START + parseInt(time.duration.minutes(30)));
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
      await VESTING.allocateVestedTokens(user1.address, AMORDeducted, VESTING_START, VESTING_START, VESTING_TIME);
      let currentTime = await time.latest();
      let cliff = parseInt(currentTime) + parseInt(time.duration.weeks(10));
      let vestingEnd = cliff + parseInt(time.duration.weeks(11));
      VESTING_START = await time.latest();
      VESTING_START = parseInt(time.duration.minutes(1)) + parseInt(VESTING_START);
      await AMOR_TOKEN.transfer(VESTING.address, ONE_HUNDRED_ETHER);
      await VESTING.allocateVestedTokens(user2.address, FIFTY_ETHER, cliff, VESTING_START, vestingEnd);
      expect(await VESTING.balanceOf(user2.address)).to.be.equal((FIFTY_ETHER).toString());
    });
  });

});