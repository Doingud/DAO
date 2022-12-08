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
  let AMOR_BEACON;
  let AMOR_TOKEN_PROXY

describe("unit - DoinGudProxy", function () {

  const setupTests = deployments.createFixture(async () => {
    const signers = await ethers.getSigners();
    const setup = await init.initialize(signers);
    await init.getTokens(setup);

    root = setup.roles.root;
    multisig = setup.roles.doingud_multisig;
    user1 = setup.roles.user1;
    user2 = setup.roles.user2;

    AMOR_TOKEN = setup.tokens.AmorTokenImplementation;
    AMOR_GUILD_TOKEN = setup.tokens.AmorGuildToken;
    AMOR_TOKEN_PROXY = await init.proxy();
    AMOR_BEACON = await init.beacon(AMOR_TOKEN.address, root.address);
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
        await expect(AMOR_TOKEN_PROXY.initProxy(AMOR_BEACON.address)).
          to.emit(AMOR_TOKEN_PROXY, "BeaconUpgraded").
            withArgs(AMOR_BEACON.address);
      });

      it("Should fail if called more than once", async function () {
        await expect(AMOR_TOKEN_PROXY.initProxy(AMOR_GUILD_TOKEN.address)).
          to.be.revertedWith("Initializable: contract is already initialized");
      });
    });

  context("function: viewImplementation()", () => {
    it("Should return the correct implementation address", async function () {
      expect(await AMOR_TOKEN_PROXY.implementation()).
        to.equal(AMOR_TOKEN.address);
    });
  });

  context("function: upgradeTo()", () => {
      it("Should upgrade the implementation address", async function () {
        await expect(AMOR_BEACON.upgradeTo(AMOR_GUILD_TOKEN.address)).
          to.emit(AMOR_BEACON, "Upgraded")
            .withArgs(AMOR_GUILD_TOKEN.address);
      });

      it("Should return the upgraded implementation address", async function () {
        expect(await AMOR_TOKEN_PROXY.implementation()).
          to.equal(AMOR_GUILD_TOKEN.address);
      });
  });

});
