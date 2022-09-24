const { ethers } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");
const { MOCK_GUILD_NAMES,
        MOCK_GUILD_SYMBOLS 
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
});

    before('setup', async function() {
        await setupTests();
    });

    context("Setup the implementation contracts", () => {
        it("Should transfer AMOR between addresses", async function () {
            
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