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
    CLONE_FACTORY = await init.guildFactory(setup);

    root = setup.roles.root;
    multisig = setup.roles.doingud_multisig;
    user1 = setup.roles.user1;

    VESTING = await init.vestingContract(setup);

  });

  before('Setup', async function() {
    await setupTests();
    AMORDeducted = ethers.BigNumber.from((ONE_HUNDRED_ETHER*(BASIS_POINTS-TAX_RATE)/BASIS_POINTS).toString());

  });

  context("Constructor", () => {
    it("Should have deployed the contract with the right parameters", async function () {
      expect(await VESTING.SENTINAL()).to.equal(ONE_ADDRESS);
      expect(await VESTING.sentinalOwner()).to.equal(ZERO_ADDRESS);
      expect(await VESTING.beneficiaries(ZERO_ADDRESS)).to.equal(ONE_ADDRESS);
    });
  });

  context("function: vestAMOR()", () => {
    it("Should lock AMOR in the contract", async function () {
      await AMOR_TOKEN.approve(VESTING.address, ONE_HUNDRED_ETHER);
      await VESTING.vestAmor(ONE_HUNDRED_ETHER);

      expect(await VESTING.unallocatedAMOR()).to.equal(AMORDeducted);
    });
  });

  context("function: allocateVestedTokens()", () => {
    it("Should allocate vested tokens to a beneficiary", async function () {
      VESTING_TIME = await time.latest();
      console.log("Time before adding 2 years: "+ VESTING_TIME);
      VESTING_TIME = parseInt(time.duration.years(2)) + parseInt(VESTING_TIME);
      console.log("Vesting date: " + VESTING_TIME);
      await VESTING.allocateVestedTokens(user1.address, AMORDeducted, 0, VESTING_TIME);
      expect(await VESTING.balanceOf(user1.address)).to.equal(AMORDeducted);
      expect(await VESTING.unallocatedAMOR()).to.equal(0);
    });

    it("Should fail if unsufficient unallocated AMOR", async function () {
      await expect(VESTING.allocateVestedTokens(user1.address, AMORDeducted, 0, 1661165490)).
        to.be.revertedWith("InsufficientFunds()");
    });
  });

  context("function: modifyAllocation()", () => {
    it("Should allow the MetaDAO to change allocation details", async function () {
      await AMOR_TOKEN.approve(VESTING.address, ONE_HUNDRED_ETHER);
      await VESTING.vestAmor(ONE_HUNDRED_ETHER);
      await VESTING.modifyAllocation(user1.address, AMORDeducted, 0, VESTING_TIME);
      expect(await VESTING.balanceOf(user1.address)).to.equal(ethers.BigNumber.from((AMORDeducted*2).toString()));
      let userBalance = await VESTING.allocations(user1.address);
      expect(userBalance.tokensAllocated).to.equal((AMORDeducted*2).toString());
    });
  });

  context("function: tokensAvailable()", () => {
    it("Should calculate the correct amount of tokens for time passed", async function () {
      let userInfo = await VESTING.allocations(user1.address);
      let currentTime = await time.latest();
      let timeElapsed;
      let tokensClaimable;
      await time.increaseTo(VESTING_TIME);
      currentTime = await time.latest();
      timeElapsed = VESTING_TIME - userInfo.vestingStart;
      tokensClaimable = userInfo.tokensAllocated * timeElapsed / (userInfo.vestingDate - userInfo.vestingStart);
      tokensClaimable = Math.trunc(tokensClaimable);
      expect(await VESTING.tokensAvailable(user1.address)).to.equal(tokensClaimable.toString());
    });
  });

  context("function: withdrawAMOR()", () => {
    it("Should allow a user to withdraw an amount of AMOR", async function () {
      let userBalance = await VESTING.tokensAvailable(user1.address);
      await VESTING.connect(user1).withdrawAmor(FIFTY_ETHER);
      expect(await VESTING.tokensAvailable(user1.address)).to.equal((userBalance-FIFTY_ETHER).toString());
      
      userBalance = await VESTING.tokensAvailable(user1.address);
      await VESTING.connect(user1).withdrawAmor(ONE_HUNDRED_ETHER);
      expect(await VESTING.tokensAvailable(user1.address)).to.equal((userBalance-ONE_HUNDRED_ETHER).toString())
    });
  });

});