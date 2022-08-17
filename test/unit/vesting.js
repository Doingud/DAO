const { ethers } = require("hardhat");
const { time } = require("@openzeppelin/test-helpers");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");
const { ONE_ADDRESS,
        ZERO_ADDRESS,
        ONE_HUNDRED_ETHER,
        BASIS_POINTS,
        TAX_RATE,
        SECONDS_IN_DAY
      } = require('../helpers/constants.js');
const init = require('../test-init.js');
const { duration } = require("@openzeppelin/test-helpers/src/time.js");

use(solidity);

  let AMOR_TOKEN;
  let AMOR_GUILD_TOKEN;
  let CLONE_FACTORY;
  let FX_AMOR_TOKEN;
  let DAMOR_GUILD_TOKEN;
  let GUILD_ONE_AMORXGUILD;
  let GUILD_ONE_DAMORXGUILD;
  let GUILD_ONE_FXAMORXGUILD;
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
      await VESTING.vestAMOR(ONE_HUNDRED_ETHER);

      expect(await VESTING.unallocatedAMOR()).to.equal(AMORDeducted);
    });
  });

  context("function: allocateVestedTokens()", () => {
    it("Should allocate vested tokens to a beneficiary", async function () {
      VESTING_TIME = await time.latest() + time.duration.years(1);
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
      await VESTING.vestAMOR(ONE_HUNDRED_ETHER);
      await VESTING.modifyAllocation(user1.address, AMORDeducted, 0, VESTING_TIME);
      expect(await VESTING.balanceOf(user1.address)).to.equal(ethers.BigNumber.from((AMORDeducted*2).toString()));
    });
  });

  context("function: tokensAvailable()", () => {
    it("Should calculate the correct amount of tokens for time passed", async function () {
      /// Let time pass so tokens can accumulate
      time.increase(duration.years(1)/2);
      let userInfo = await VESTING.allocations(user1.address);
      console.log(userInfo.vestingDate.toString());
      let currentTime = await time.latest();
      let timeElapsed = currentTime - userInfo.vestingStart;
      let tokensClaimable = userInfo.tokensAllocated * timeElapsed / (userInfo.vestingDate - userInfo.vestingStart);
      tokensClaimable = Math.trunc(tokensClaimable);
      expect(await VESTING.tokensAvailable(user1.address)).to.equal(tokensClaimable.toString());
      /// Let the vesting date pass
      time.increase(duration.years(1)/2);
      currentTime = await time.latest();
      timeElapsed = currentTime - userInfo.vestingStart;
      tokensClaimable = userInfo.tokensAllocated * timeElapsed / (userInfo.vestingDate - userInfo.vestingStart);
      tokensClaimable = Math.trunc(tokensClaimable);
      expect(await VESTING.tokensAvailable(user1.address)).to.equal(tokensClaimable.toString());
    });
  });

});