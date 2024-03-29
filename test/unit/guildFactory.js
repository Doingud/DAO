const { ethers } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");
const { MOCK_GUILD_NAMES,
        MOCK_GUILD_SYMBOLS,
        ZERO_ADDRESS,
        ONE_ADDRESS
      } = require('../helpers/constants.js');
const init = require('../test-init.js');

use(solidity);

  /// Implementation Contracts
  let AMOR_TOKEN;
  let AMOR_GUILD_TOKEN;
  let CLONE_FACTORY;
  let FX_AMOR_TOKEN;
  let DAMOR_GUILD_TOKEN;
  let CONTROLLERXGUILD;
  let GOVERNORXGUILD;
  let AVATARXGUILD;

  /// GUILD TESTING VARS
  let GUILD_ONE_AMORXGUILD;
  let GUILD_ONE_DAMORXGUILD;
  let GUILD_ONE_FXAMORXGUILD;
  let GUILD_ONE_CONTROLLERXGUILD;
  let GUILD_ONE_AVATARXGUILD;
  let GUILD_ONE_GOVERNORXGUILD;
  let METADAO;
  let guild;

  /// BEACONS
  let BEACON_AMOR_GUILD_TOKEN;
  let BEACON_DAMOR;
  let BEACON_FXAMOR;
  let BEACON_CONTROLLER;
  let BEACON_GOVERNOR;
  let BEACON_AVATAR;

  /// Users/Signers
  let user1;
  let user2;

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
    METADAO = setup.metadao;

    root = setup.roles.root;
    multisig = setup.roles.doingud_multisig;
    user1 = setup.roles.user1;
    user2 = setup.roles.user2;

    CONTROLLERXGUILD = setup.controller;
    GOVERNORXGUILD = setup.governor;
    AVATARXGUILD = setup.avatars.avatar;

    BEACON_AMOR_GUILD_TOKEN = await init.beacon(AMOR_GUILD_TOKEN.address, METADAO.address);
    BEACON_DAMOR = await init.beacon(DAMOR_GUILD_TOKEN.address, METADAO.address);
    BEACON_FXAMOR = await init.beacon(FX_AMOR_TOKEN.address, METADAO.address);
    BEACON_CONTROLLER = await init.beacon(CONTROLLERXGUILD.address, METADAO.address);
    BEACON_GOVERNOR = await init.beacon(GOVERNORXGUILD.address, METADAO.address);
    BEACON_AVATAR = await init.beacon(AVATARXGUILD.address, METADAO.address);

    setup.b_amorGuildToken = BEACON_AMOR_GUILD_TOKEN;
    setup.b_damor = BEACON_DAMOR;
    setup.b_fxamor = BEACON_FXAMOR;
    setup.b_controller = BEACON_CONTROLLER;
    setup.b_governor = BEACON_GOVERNOR;
    setup.b_avatar = BEACON_AVATAR;

    await init.getGuildFactory(setup);
    CLONE_FACTORY = setup.factory;
    /// Note: Using `root` as Avatar address
    await METADAO.init(AMOR_TOKEN.address, CLONE_FACTORY.address, root.address);
  });

  before('Setup', async function() {
    await setupTests();
  });

  context("function: deployGuildContracts", () => {
    it("Should deploy the Guild Token Contracts", async function () {
      await METADAO.createGuild(user1.address, user2.address, MOCK_GUILD_NAMES[0], MOCK_GUILD_SYMBOLS[0]);

      let guildOneControllerxGuild = await METADAO.guilds(ONE_ADDRESS);
      guild = await CLONE_FACTORY.guilds(guildOneControllerxGuild);

      GUILD_ONE_AMORXGUILD = AMOR_GUILD_TOKEN.attach(guild.AmorGuildToken);
      GUILD_ONE_DAMORXGUILD = DAMOR_GUILD_TOKEN.attach(guild.DAmorxGuild);
      GUILD_ONE_FXAMORXGUILD = FX_AMOR_TOKEN.attach(guild.FXAmorxGuild);
      GUILD_ONE_CONTROLLERXGUILD = CONTROLLERXGUILD.attach(guildOneControllerxGuild);
      GUILD_ONE_GOVERNORXGUILD = GOVERNORXGUILD.attach(guild.GovernorxGuild);
      GUILD_ONE_AVATARXGUILD = AVATARXGUILD.attach(guild.AvatarxGuild);
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
      await expect(GUILD_ONE_CONTROLLERXGUILD.init(ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS)).to.be.revertedWith("AlreadyInitialized()");
      await expect(GUILD_ONE_AVATARXGUILD.init(ZERO_ADDRESS, ZERO_ADDRESS)).to.be.revertedWith("AlreadyInitialized()");
    });
  });

  context("Constructor", ()=> {
    it("Should return the implementation addresses", async function () {
      expect(await CLONE_FACTORY.amorToken()).to.equal(AMOR_TOKEN.address);
      expect(await CLONE_FACTORY.amorxGuildToken()).to.equal(BEACON_AMOR_GUILD_TOKEN.address);
      expect(await CLONE_FACTORY.dAmorxGuild()).to.equal(BEACON_DAMOR.address);
      expect(await CLONE_FACTORY.fXAmorxGuild()).to.equal(BEACON_FXAMOR.address);
      expect(await CLONE_FACTORY.controllerxGuild()).to.equal(BEACON_CONTROLLER.address);
      expect(await CLONE_FACTORY.governorxGuild()).to.equal(BEACON_GOVERNOR.address);
      expect(await CLONE_FACTORY.avatarxGuild()).to.equal(BEACON_AVATAR.address);
    })
  });

  context("function: guilds()", () => {
    it("Should return the guild address", async function () {
      expect(guild.AvatarxGuild).to.equal(GUILD_ONE_AVATARXGUILD.address);
    });

    it("Should not return an address outside the array range", async function () {
      let guildDetail = await CLONE_FACTORY.guilds(ZERO_ADDRESS);

      expect(guildDetail.AvatarxGuild).to.equal(ZERO_ADDRESS);
    });
  })

  context("function: fxAMORxGuildTokens()", () => {
    it("Should return the FX Token address", async function () {
      expect(guild.FXAmorxGuild).to.equal(GUILD_ONE_FXAMORXGUILD.address);
    });
  })

  context("function: dAMORxGuildTokens()", () => {
    it("Should return the dAMORxGuild Token address", async function () {
      expect(guild.DAmorxGuild).to.equal(GUILD_ONE_DAMORXGUILD.address);
    });
  });

  context("function: guildControllers()", () => {
    it("Should return the ControllerxGuild address", async function () {
      expect(await METADAO.guilds(ONE_ADDRESS)).to.equal(GUILD_ONE_CONTROLLERXGUILD.address);
    });
  });

});