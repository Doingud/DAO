const { ethers } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");
const { TAX_RATE, 
        BASIS_POINTS, 
        AMOR_TOKEN_NAME, 
        AMOR_TOKEN_SYMBOL,
        INIT_MINT,
        TEST_TRANSFER,
        MOCK_TEST_AMOUNT,
        MOCK_GUILD_NAMES,
        MOCK_GUILD_SYMBOLS 
      } = require('../helpers/constants.js');
const init = require('../test-init.js');

use(solidity);



  //  The contract with the execution logic
  //  The contract with the execution logic
  let IMPLEMENTATION;
  let GUILD_TOKEN_IMPLEMENTATION;
  //  The contract which stores the data
  let PROXY_CONTRACT;
  //  The PROXY_CONTRACT with the implemenation
  let PROXY;

  let root;
  let multisig;
  let user1;
  let user2;

  let AMOR_TOKEN;
  let CLONE_TARGET;

describe("unit - AMORxGuild", function () {

  const setupTests = deployments.createFixture(async () => {
    const signers = await ethers.getSigners();
    const setup = await init.initialize(signers);
    await init.getTokens(setup);

    AMOR_TOKEN = setup.tokens.AmorTokenImplementation;
    PROXY_CONTRACT = setup.tokens.AmorTokenProxy;
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

  context("init()", () => {
    describe("initialization of token details", function () {
      it("Should emit an Initialized event", async function () {
        await expect(AMOR_GUILD_TOKEN.init(
          AMOR_TOKEN.address, 
          MOCK_GUILD_NAMES[0], 
          MOCK_GUILD_SYMBOLS[0]
        )).
          to.emit(AMOR_GUILD_TOKEN, "Initialized").
            withArgs(MOCK_GUILD_NAMES[0], MOCK_GUILD_SYMBOLS[0], AMOR_TOKEN.address);
      });

      it("Should fail if called more than once", async function () {
        await expect(AMOR_GUILD_TOKEN.init(
          AMOR_TOKEN.address, 
          MOCK_GUILD_NAMES[0], 
          MOCK_GUILD_SYMBOLS[0]
        )).to.be.reverted;
      });
    });
  });

  context("stakeAmor()", () => {
    describe("staking behaviour", function () {
      it("Should allow a user to stake 100 AMOR", async function () {
        await AMOR_TOKEN.approve(AMOR_GUILD_TOKEN.address, MOCK_TEST_AMOUNT);
        await expect(AMOR_GUILD_TOKEN.stakeAmor(root.address, MOCK_TEST_AMOUNT)).
         to.emit(AMOR_TOKEN, "Transfer").withArgs(
          root.address, 
          AMOR_GUILD_TOKEN.address, 
          (MOCK_TEST_AMOUNT*(TAX_RATE/BASIS_POINTS))
        );
      });
    });
  });

});
