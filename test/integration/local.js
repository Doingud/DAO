const { ethers } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");
const { MOCK_GUILD_NAMES,
        MOCK_GUILD_SYMBOLS, 
        TEST_TRANSFER,
        AMOR_TOKEN_NAME,
        AMOR_TOKEN_SYMBOL,
        TAX_RATE
      } = require('../helpers/constants.js');
const init = require('../test-init.js');

use(solidity);

let root;
let multisig;
let user1;
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

describe("Integration Tests", function () {

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

  /// Initializr the DoinGud Ecosystem
  await setup.tokens.AmorTokenImplementation.init(
    AMOR_TOKEN_NAME, 
    AMOR_TOKEN_SYMBOL, 
    setup.roles.authorizer_adaptor.address, //taxController
    TAX_RATE,
    setup.roles.root.address // the multisig address of the MetaDAO, which owns the token
  );
});

    beforeEach('setup', async function() {
        await setupTests();
    });

    context("Setup the implementation contracts", () => {
        it("Should transfer AMOR between addresses", async function () {
            console.log(root.address);
            console.log(user1.address);
            await expect(AMOR_TOKEN.transfer(user1.address, TEST_TRANSFER)).to.emit(AMOR_TOKEN, "Transfer").withArgs(root.address, user1.address, 0);
        });

        it("Should accrue taxes correctly", async function () {
        
        });
    });

    context("Donate AMOR to the Guild", () => {

    });

    context('Setup the MetaDAO Controller', () => {
    });

    context('Create the guild contracts', () => {

    });

});