const { ethers } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");
const { TAX_RATE, 
        AMOR_TOKEN_NAME, 
        AMOR_TOKEN_SYMBOL
      } = require('../helpers/constants.js');
const init = require('../test-init.js');

use(solidity);

  let root;
  let multisig;

  let AMOR_TOKEN;
  let AMOR_GUILD_TOKEN;

describe("unit - AMORxGuild", function () {

  const setupTests = deployments.createFixture(async () => {
    const signers = await ethers.getSigners();
    const setup = await init.initialize(signers);
    await init.getTokens(setup);

    AMOR_TOKEN = setup.tokens.AmorTokenImplementation;
    AMOR_GUILD_TOKEN = setup.tokens.AmorGuildToken;
    AMOR_TOKEN_PROXY = setup.tokens.AmorTokenProxy;

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

  context("function: initProxy()", () => {
      it("Should initialize the proxy", async function () {
        expect(await AMOR_TOKEN_PROXY.initProxy(AMOR_GUILD_TOKEN.address)).
          to.emit(AMOR_TOKEN_PROXY, "Upgraded").
            withArgs(AMOR_GUILD_TOKEN.address);
      });

      it("Should fail if called more than once", async function () {
        await expect(AMOR_TOKEN_PROXY.initProxy(AMOR_GUILD_TOKEN.address)).
          to.be.revertedWith("Initialized");
      });
    });

  context("function: viewImplementation()", () => {
    it("Should return the correct implementation address", async function () {
      expect(await AMOR_TOKEN_PROXY.viewImplementation()).
        to.equal(AMOR_GUILD_TOKEN.address);
    });
  });

  context("function: upgradeImplenentation()", () => {
      it("Should upgrade the implementation address", async function () {
        expect(await AMOR_TOKEN_PROXY.upgradeImplementation(AMOR_TOKEN.address)).
          to.emit(AMOR_TOKEN_PROXY, "Upgraded")
            .withArgs(AMOR_TOKEN.address);
      });

      it("Should return the upgraded implementation address", async function () {
        expect(await AMOR_TOKEN_PROXY.viewImplementation()).
          to.equal(AMOR_TOKEN.address);
      });
  });

});
