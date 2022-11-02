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
  let AMOR_TOKEN_BEACON;
  let AMOR_TOKEN_PROXY;
  let PROXIED_AMOR_TOKEN;

describe("unit - DoinGudBeacon", function () {

  const setupTests = deployments.createFixture(async () => {
    const signers = await ethers.getSigners();
    const setup = await init.initialize(signers);
    await init.getTokens(setup);
    await init.metadao(setup);
    await init.avatar(setup);
    await init.controller(setup);
    await init.governor(setup);

    AMOR_TOKEN = setup.tokens.AmorTokenImplementation;
    AMOR_GUILD_TOKEN = setup.tokens.AmorGuildToken;
    /// Init the beacon and the proxy
    AMOR_TOKEN_PROXY = await init.proxy();

    root = setup.roles.root;
    multisig = setup.roles.doingud_multisig;
    user1 = setup.roles.user1;
    user2 = setup.roles.user2;

    AMOR_TOKEN_BEACON = await init.beacon(AMOR_TOKEN.address, root.address);
    await AMOR_TOKEN_PROXY.initProxy(AMOR_TOKEN_BEACON.address);
    PROXIED_AMOR_TOKEN = AMOR_TOKEN.attach(AMOR_TOKEN_PROXY.address);
  });

  before('Setup', async function() {
    await setupTests();

  });

  context("Init implementation contract", () => {
      it("Should have set the implementation in the beacon", async function () {
        expect(await AMOR_TOKEN_BEACON.implementation()).to.equal(AMOR_TOKEN.address);
      });

      it("Should have set the proxy beacon", async function () {
        expect(await AMOR_TOKEN_PROXY.viewBeacon()).to.equal(AMOR_TOKEN_BEACON.address);
        expect(AMOR_TOKEN_PROXY.address).to.equal(PROXIED_AMOR_TOKEN.address);
      });
    });

  context("Proxy test", () => {
    it("Should set the proxy storage through the token init", async function () {
      await PROXIED_AMOR_TOKEN.init(
        AMOR_TOKEN_NAME,
        AMOR_TOKEN_SYMBOL,
        multisig.address,
        TAX_RATE,
        root.address
        );
    });

    it("Should return the token details correctly", async function () {
        expect(await PROXIED_AMOR_TOKEN.taxRate()).to.equal(TAX_RATE);
        expect(await PROXIED_AMOR_TOKEN.name()).to.equal(AMOR_TOKEN_NAME);
        expect(await PROXIED_AMOR_TOKEN.symbol()).to.equal(AMOR_TOKEN_SYMBOL);
    })
  });

  context("function: upgradeTo()", () => {
      it("Should upgrade the implementation address", async function () {
        await expect(AMOR_TOKEN_BEACON.upgradeTo(AMOR_GUILD_TOKEN.address)).
          to.emit(AMOR_TOKEN_BEACON, "Upgraded")
            .withArgs(AMOR_GUILD_TOKEN.address);
      });

      it("Should return the upgraded implementation address", async function () {
        expect(await AMOR_TOKEN_BEACON.implementation()).
          to.equal(AMOR_GUILD_TOKEN.address);
      });
  });

});
