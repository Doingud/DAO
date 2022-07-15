const { ethers } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");
const { TAX_RATE, 
        AMOR_TOKEN_NAME, 
        AMOR_TOKEN_SYMBOL,
        MOCK_TEST_AMOUNT,
        MOCK_GUILD_NAMES,
        MOCK_GUILD_SYMBOLS 
      } = require('../helpers/constants.js');
const init = require('../test-init.js');

use(solidity);

  let root;
  let multisig;

  let AMOR_TOKEN;
  let AMOR_GUILD_TOKEN;

  const TEST_TAX_DEDUCTED_AMOUNT = 95000000000000000000n;
  const TEST_BALANCE_ROOT = 9999900000000000000000000n;

describe("unit - AMORxGuild", function () {

  const setupTests = deployments.createFixture(async () => {
    const signers = await ethers.getSigners();
    const setup = await init.initialize(signers);
    await init.getTokens(setup);

    AMOR_TOKEN = setup.tokens.AmorTokenImplementation;
    AMOR_GUILD_TOKEN = setup.tokens.AmorGuildToken;
    //CLONE_TARGET = setup.tokens.AmorGuildTokenProxy;
    //FACTORY = setup.tokens.AmorGuildCloneFactory;


    root = setup.roles.root;
    multisig = setup.roles.doingud_multisig;
    user1 = setup.roles.user1;
    user2 = setup.roles.user2;

  });

  before('Setup', async function() {
    await setupTests();
    await AMOR_TOKEN.init(
      AMOR_TOKEN_NAME, 
      AMOR_TOKEN_SYMBOL, 
      multisig.address, 
      TAX_RATE, 
      root.address
    );
  });

  context("function: init()", () => {
    describe("initialization of token details", function () {
      it("Should emit an Initialized event", async function () {
        await expect(AMOR_GUILD_TOKEN.init(
          AMOR_TOKEN.address, 
          MOCK_GUILD_NAMES[0], 
          MOCK_GUILD_SYMBOLS[0],
          user2.address
        )).
          to.emit(AMOR_GUILD_TOKEN, "Initialized").
            withArgs(MOCK_GUILD_NAMES[0], MOCK_GUILD_SYMBOLS[0], AMOR_TOKEN.address);
      });

      it("Should fail if called more than once", async function () {
        await expect(AMOR_GUILD_TOKEN.init(
          AMOR_TOKEN.address, 
          MOCK_GUILD_NAMES[0], 
          MOCK_GUILD_SYMBOLS[0],
          user2.address
        )).to.be.reverted;
      });
    });
  });

  context("function: setTax", () => {
    it("Should allow the tax rate to be set", async function () {
      await AMOR_GUILD_TOKEN.setTax(2000);
    });
  });

  context("function: stakeAmor()", () => {
    describe("staking behaviour", function () {
      it("Approve AMOR for stake", async function () {
        await AMOR_TOKEN.approve(AMOR_GUILD_TOKEN.address, MOCK_TEST_AMOUNT);
      });

      it("Should allow a user to stake 100 AMOR", async function () {
        expect(await AMOR_GUILD_TOKEN.stakeAmor(root.address, MOCK_TEST_AMOUNT)).
         to.emit(AMOR_TOKEN, "Transfer").
          withArgs(
            root.address, 
            AMOR_GUILD_TOKEN.address, 
            TEST_TAX_DEDUCTED_AMOUNT
          );
      });

      it("Should decrease the staker's balance by the test amount", async function () {
         expect(await AMOR_TOKEN.balanceOf(root.address)).to.equal(TEST_BALANCE_ROOT);
      });

      it("Should mint AmorxGuild to the staker", async function () {
        expect(await AMOR_GUILD_TOKEN.balanceOf(root.address)).
          to.equal(ethers.utils.parseEther((8).toString()))
      });

      it("Should mint AmorxGuild to the controller as taxed", async function () {
        expect(await AMOR_GUILD_TOKEN.balanceOf(user2.address)).
          to.equal(ethers.utils.parseEther((2).toString()))
      });

      it("Should revert if unsufficient AMOR", async function () {
        await expect(AMOR_GUILD_TOKEN.stakeAmor(root.address, ethers.utils.parseEther(MOCK_TEST_AMOUNT.toString()))).to.be.reverted;
      });
    });
  });

  context("function: withdrawAmor()", () => {
    describe("unstaking behaviour", function () {
      it("Should allow the user to withdraw their AMOR", async function () {
        expect(await AMOR_GUILD_TOKEN.withdrawAmor(ethers.utils.parseEther("8"))).
          to.emit(AMOR_TOKEN, "Transfer").
          to.emit(AMOR_GUILD_TOKEN, "Transfer");
      });
      it("Should revert if unsufficient AMORxGuild", async function () {
        await expect(AMOR_GUILD_TOKEN.withdrawAmor(ethers.utils.parseEther("100"))).
          to.be.reverted;
      });
    })
  })

  context("function: pause()", () => {
    it("Should allow the contract to be paused", async function () {
      await AMOR_GUILD_TOKEN.pause();
    });

    it("Should revert if trying to stake tokens while paused", async function () {
      await expect(AMOR_GUILD_TOKEN.stakeAmor(root.address, MOCK_TEST_AMOUNT)).to.be.reverted;
    });
  });

  context("function: unpause()", () => {
    it("Should allow the contract to be unpaused", async function () {
      await AMOR_GUILD_TOKEN.unpause();
    });

    it("Should allow a user to stake AMOR after being unpaused", async function () {
      await AMOR_TOKEN.approve(AMOR_GUILD_TOKEN.address, ethers.utils.parseEther("1"));

      expect(await AMOR_GUILD_TOKEN.stakeAmor(root.address, ethers.utils.parseEther("1"))).
        to.emit(AMOR_TOKEN, "Transfer")
    });

  });
});
