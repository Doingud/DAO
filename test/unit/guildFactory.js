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
  let GOVERNORXGUILD;
  let AVATARXGUILD;
  let GUILD_ONE_AMORXGUILD;
  let GUILD_ONE_DAMORXGUILD;
  let GUILD_ONE_FXAMORXGUILD;
  let GUILD_ONE_CONTROLLERXGUILD;
  let GUILD_ONE_AVATARXGUILD;
  let GUILD_ONE_GOVERNORXGUILD;

describe("unit - Clone Factory", function () {

  const setupTests = deployments.createFixture(async () => {
    const signers = await ethers.getSigners();
    const setup = await init.initialize(signers);
    await init.getTokens(setup);
    await init.metadao(setup);
    await init.controller(setup);
    await init.avatar(setup);
    await init.governor(setup);

    AMOR_TOKEN = setup.tokens.AmorTokenImplementation;
    AMOR_GUILD_TOKEN = setup.tokens.AmorGuildToken;
    FX_AMOR_TOKEN = setup.tokens.FXAMORxGuild;
    DAMOR_GUILD_TOKEN = setup.tokens.dAMORxGuild;

    root = setup.roles.root;
    multisig = setup.roles.doingud_multisig;
    user1 = setup.roles.user1;

    await init.getGuildFactory(setup);
    CLONE_FACTORY = setup.factory;
    CONTROLLERXGUILD = setup.controller;
    GOVERNORXGUILD = setup.governor;
    AVATARXGUILD = setup.avatars.avatar;
  });

  before('Setup', async function() {
    await setupTests();
  });

  context("function: deployGuildContracts", () => {
    it("Should deploy the Guild Token Contracts", async function () {
      expect(await CLONE_FACTORY.deployGuildContracts(user1.address, MOCK_GUILD_NAMES[0],MOCK_GUILD_SYMBOLS[0])).to.not.be.null;

      this.guildOneAmorXGuild = await CLONE_FACTORY.amorxGuildTokens(0);
      this.guildOneDAmorXGuild = await CLONE_FACTORY.guildComponents(this.guildOneAmorXGuild, 0);
      this.guildOneFXAmorXGuild = await CLONE_FACTORY.guildComponents(this.guildOneAmorXGuild, 1);
      this.guildOneControllerxGuild = await CLONE_FACTORY.guildComponents(this.guildOneAmorXGuild, 2);
      this.guildOneGovernorxGuild = await CLONE_FACTORY.guildComponents(this.guildOneAmorXGuild, 3);
      this.guildOneAvatarxGuild = await CLONE_FACTORY.guildComponents(this.guildOneAmorXGuild, 4);
      
      GUILD_ONE_AMORXGUILD = AMOR_GUILD_TOKEN.attach(this.guildOneAmorXGuild);
      GUILD_ONE_DAMORXGUILD = DAMOR_GUILD_TOKEN.attach(this.guildOneDAmorXGuild);
      GUILD_ONE_FXAMORXGUILD = FX_AMOR_TOKEN.attach(this.guildOneFXAmorXGuild);
      GUILD_ONE_CONTROLLERXGUILD = CONTROLLERXGUILD.attach(this.guildOneControllerxGuild);
      GUILD_ONE_GOVERNORXGUILD = GOVERNORXGUILD.attach(this.guildOneGovernorxGuild);
      GUILD_ONE_AVATARXGUILD = AVATARXGUILD.attach(this.guildOneAvatarxGuild);
    });

    it("Should have set the tokens' paramaters correctly", async function () {
      expect(await GUILD_ONE_AMORXGUILD.name()).to.equal("AMORx"+MOCK_GUILD_NAMES[0]);
      expect(await GUILD_ONE_DAMORXGUILD.name()).to.equal("dAMORx"+MOCK_GUILD_NAMES[0]);
      expect(await GUILD_ONE_FXAMORXGUILD.name()).to.equal("FXAMORx"+MOCK_GUILD_NAMES[0]);
      expect(await GUILD_ONE_AMORXGUILD.symbol()).to.equal("Ax"+MOCK_GUILD_SYMBOLS[0]);
      expect(await GUILD_ONE_DAMORXGUILD.symbol()).to.equal("Dx"+MOCK_GUILD_SYMBOLS[0]);
      expect(await GUILD_ONE_FXAMORXGUILD.symbol()).to.equal("FXx"+MOCK_GUILD_SYMBOLS[0]);
    });

    it("Should have initialized the control contracts", async function () {
      await expect(GUILD_ONE_GOVERNORXGUILD.init(ZERO_ADDRESS, ZERO_ADDRESS)).to.be.revertedWith("AlreadyInitialized()");
      await expect(GUILD_ONE_CONTROLLERXGUILD.init(ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS)).to.be.revertedWith("AlreadyInitialized()");
      await expect(GUILD_ONE_AVATARXGUILD.init(ZERO_ADDRESS, ZERO_ADDRESS)).to.be.revertedWith("AlreadyInitialized()");
    });
  });

  context("Constructor", ()=> {
    it("Should return the implementation addresses", async function () {
      expect(await CLONE_FACTORY.amorToken()).to.equal(AMOR_TOKEN.address);
      expect(await CLONE_FACTORY.amorxGuildToken()).to.equal(AMOR_GUILD_TOKEN.address);
      expect(await CLONE_FACTORY.guildComponents(AMOR_GUILD_TOKEN.address, 0)).to.equal(DAMOR_GUILD_TOKEN.address);
      expect(await CLONE_FACTORY.guildComponents(AMOR_GUILD_TOKEN.address, 1)).to.equal(FX_AMOR_TOKEN.address);
      expect(await CLONE_FACTORY.guildComponents(AMOR_GUILD_TOKEN.address, 2)).to.equal(CONTROLLERXGUILD.address);
      expect(await CLONE_FACTORY.guildComponents(AMOR_GUILD_TOKEN.address, 3)).to.equal(GOVERNORXGUILD.address);
      expect(await CLONE_FACTORY.guildComponents(AMOR_GUILD_TOKEN.address, 4)).to.equal(AVATARXGUILD.address);
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
      expect(await CLONE_FACTORY.guildComponents(GUILD_ONE_AMORXGUILD.address, 1)).to.equal(GUILD_ONE_FXAMORXGUILD.address);
    });

    it("Should not return an address outside the array range", async function () {
      expect(await CLONE_FACTORY.guildComponents(TWO_ADDRESS, 0)).to.equal(ZERO_ADDRESS);
    });
  })

  context("function: dAMORxGuildTokens()", () => {
    it("Should return the dAMORxGuild Token address", async function () {
      expect(await CLONE_FACTORY.guildComponents(GUILD_ONE_AMORXGUILD.address, 0)).to.equal(GUILD_ONE_DAMORXGUILD.address);
    });

    it("Should not return an address outside the array range", async function () {
      expect(await CLONE_FACTORY.guildComponents(TWO_ADDRESS, 0)).to.equal(ZERO_ADDRESS);
    });
  })

  context("function: guildControllers()", () => {
    it("Should return the ControllerxGuild address", async function () {
      expect(await CLONE_FACTORY.guildComponents(GUILD_ONE_AMORXGUILD.address, 2)).to.equal(GUILD_ONE_CONTROLLERXGUILD.address);
    });

    it("Should not return an address outside the array range", async function () {
      expect(await CLONE_FACTORY.guildComponents(TWO_ADDRESS, 2)).to.equal(ZERO_ADDRESS);
    });
  })

});