const { ethers } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");
const { MOCK_GUILD_NAMES,
        MOCK_GUILD_SYMBOLS, 
        TWO_ADDRESS,
        ZERO_ADDRESS
      } = require('../helpers/constants.js');
const init = require('../test-init.js');

use(solidity);

  let AMOR_TOKEN;
  let AMOR_GUILD_TOKEN;
  let CLONE_FACTORY;
  let FX_AMOR_TOKEN;
  let DAMOR_GUILD_TOKEN;
  let CONTROLLERXGUILD;
  let GUILD_ONE_AMORXGUILD;
  let GUILD_ONE_DAMORXGUILD;
  let GUILD_ONE_FXAMORXGUILD;
  let GUILD_ONE_CONTROLLERXGUILD;

describe("unit - Clone Factory", function () {

  const setupTests = deployments.createFixture(async () => {
    const signers = await ethers.getSigners();
    const setup = await init.initialize(signers);
    await init.getTokens(setup);

    AMOR_TOKEN = setup.tokens.AmorTokenImplementation;
    AMOR_GUILD_TOKEN = setup.tokens.AmorGuildToken;
    FX_AMOR_TOKEN = setup.tokens.FXAMORxGuild;
    DAMOR_GUILD_TOKEN = setup.tokens.dAMORxGuild;

    root = setup.roles.root;
    multisig = setup.roles.doingud_multisig;
    user1 = setup.roles.user1;

    await init.getGuildFactory(setup);
    CLONE_FACTORY = setup.factory.guildFactory;
    CONTROLLERXGUILD = setup.factory.controller;
  });

  before('Setup', async function() {
    await setupTests();
  });

  context("function: deployGuildContracts", () => {
    it("Should deploy the Guild Token Contracts", async function () {
      expect(await CLONE_FACTORY.deployGuildContracts(user1.address, MOCK_GUILD_NAMES[0],MOCK_GUILD_SYMBOLS[0])).
        to.not.equal(ZERO_ADDRESS);

      this.guildOneAmorXGuild = await CLONE_FACTORY.amorxGuildTokens(0);
      this.guildOneDAmorXGuild = await CLONE_FACTORY.dAMORxGuildTokens(this.guildOneAmorXGuild);
      this.guildOneFXAmorXGuild = await CLONE_FACTORY.fxAMORxGuildTokens(this.guildOneAmorXGuild);
      this.guildOneControllerxGuild = await CLONE_FACTORY.guildControllers(this.guildOneAmorXGuild);
      
      GUILD_ONE_AMORXGUILD = AMOR_GUILD_TOKEN.attach(this.guildOneAmorXGuild);
      GUILD_ONE_DAMORXGUILD = DAMOR_GUILD_TOKEN.attach(this.guildOneDAmorXGuild);
      GUILD_ONE_FXAMORXGUILD = FX_AMOR_TOKEN.attach(this.guildOneFXAmorXGuild);
      GUILD_ONE_CONTROLLERXGUILD = CONTROLLERXGUILD.attach(this.guildOneControllerxGuild);
    });

    it("Should have set the tokens' paramaters correctly", async function () {
      expect(await GUILD_ONE_AMORXGUILD.name()).to.equal("AMORx"+MOCK_GUILD_NAMES[0]);
      expect(await GUILD_ONE_DAMORXGUILD.name()).to.equal("dAMORx"+MOCK_GUILD_NAMES[0]);
      expect(await GUILD_ONE_FXAMORXGUILD.name()).to.equal("FXAMORx"+MOCK_GUILD_NAMES[0]);
      expect(await GUILD_ONE_AMORXGUILD.symbol()).to.equal("Ax"+MOCK_GUILD_SYMBOLS[0]);
      expect(await GUILD_ONE_DAMORXGUILD.symbol()).to.equal("Dx"+MOCK_GUILD_SYMBOLS[0]);
      expect(await GUILD_ONE_FXAMORXGUILD.symbol()).to.equal("FXx"+MOCK_GUILD_SYMBOLS[0]);
    });
  });

  context("Constructor", ()=> {
    it("Should return the implementation addresses", async function () {
      expect(await CLONE_FACTORY.amorToken()).to.equal(AMOR_TOKEN.address);
      expect(await CLONE_FACTORY.amorxGuildToken()).to.equal(AMOR_GUILD_TOKEN.address);
      expect(await CLONE_FACTORY.fxAMORxGuildToken()).to.equal(FX_AMOR_TOKEN.address);
      expect(await CLONE_FACTORY.dAMORxGuildToken()).to.equal(DAMOR_GUILD_TOKEN.address);
      expect(await CLONE_FACTORY.controllerxGuild()).to.equal(CONTROLLERXGUILD.address);
    })
  });

  context("function: amorxGuildTokens()", () => {
    it("Should return the guild address", async function () {
      expect(await CLONE_FACTORY.amorxGuildTokens(0)).to.equal(GUILD_ONE_AMORXGUILD.address);
    });

    it("Should not return an address outside the array range", async function () {
      await expect(CLONE_FACTORY.amorxGuildTokens(2)).to.be.revertedWith(null);
    });
  })

  context("function: fxAMORxGuildTokens()", () => {
    it("Should return the FX Token address", async function () {
      expect(await CLONE_FACTORY.fxAMORxGuildTokens(GUILD_ONE_AMORXGUILD.address)).to.equal(GUILD_ONE_FXAMORXGUILD.address);
    });

    it("Should not return an address outside the array range", async function () {
      expect(await CLONE_FACTORY.fxAMORxGuildTokens(TWO_ADDRESS)).to.equal(ZERO_ADDRESS);
    });
  })

  context("function: dAMORxGuildTokens()", () => {
    it("Should return the dAMORxGuild Token address", async function () {
      expect(await CLONE_FACTORY.dAMORxGuildTokens(GUILD_ONE_AMORXGUILD.address)).to.equal(GUILD_ONE_DAMORXGUILD.address);
    });

    it("Should not return an address outside the array range", async function () {
      expect(await CLONE_FACTORY.dAMORxGuildTokens(TWO_ADDRESS)).to.equal(ZERO_ADDRESS);
    });
  })

  context("function: guildControllers()", () => {
    it("Should return the ControllerxGuild address", async function () {
      expect(await CLONE_FACTORY.guildControllers(GUILD_ONE_AMORXGUILD.address)).to.equal(GUILD_ONE_CONTROLLERXGUILD.address);
    });

    it("Should not return an address outside the array range", async function () {
      expect(await CLONE_FACTORY.guildControllers(TWO_ADDRESS)).to.equal(ZERO_ADDRESS);
    });
  })

});