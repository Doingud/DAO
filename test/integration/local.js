const { ethers } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");
const { MOCK_GUILD_NAMES,
        MOCK_GUILD_SYMBOLS, 
        TEST_TRANSFER,
        AMOR_TOKEN_NAME,
        AMOR_TOKEN_SYMBOL,
        TAX_RATE,
        GAURDIAN_THRESHOLD,
        BASIS_POINTS
      } = require('../helpers/constants.js');
const init = require('../test-init.js');
const ether = require("@openzeppelin/test-helpers/src/ether.js");

use(solidity);

/// The users
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
let VESTING;

/// The MetaDao Proxy Tokens
let DOINGUD_AMOR_TOKEN;
let DOINGUD_AMOR_GUILD_TOKEN;
let DOINGUD_DAMOR;
let DOINGUD_FXAMOR;

/// The MetaDao Control Structures
let METADAO;
let DOINGUD_CONTROLLER;
let DOINGUD_GOVERNOR;
let DOINGUD_AVATAR;
let DOINGUD_METADAO;

/// The Guild Control Structures
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

  root = setup.roles.root;
  multisig = setup.roles.doingud_multisig;
  user1 = setup.roles.user1;

  ///   DOINGUD ECOSYSTEM DEPLOYMENT
  ///   STEP 1: Deploy token implementations
  AMOR_TOKEN = setup.tokens.AmorTokenImplementation;
  AMOR_GUILD_TOKEN = setup.tokens.AmorGuildToken;
  FX_AMOR_TOKEN = setup.tokens.FXAMORxGuild;
  DAMOR_GUILD_TOKEN = setup.tokens.dAMORxGuild;

  ///   STEP 2: Deploy DoinGud Control Structures
  await init.metadao(setup);
  await init.controller(setup);
  await init.avatar(setup);
  await init.governor(setup);
  await init.getGuildFactory(setup);
  await init.vestingContract(setup);

  CLONE_FACTORY = setup.factory;
  CONTROLLERXGUILD = setup.controller;
  GOVERNORXGUILD = setup.governor;
  AVATARXGUILD = setup.avatars.avatar;
  METADAO = setup.metadao;

  ///   STEP 3: Deploy the proxies for the tokens and the control structures
  let amor_proxy = await init.proxy();
  let amor_guild_token_proxy = await init.proxy();
  let dAmor_proxy = await init.proxy();
  let fxAmor_proxy = await init.proxy();
  let controller_proxy = await init.proxy();
  let avatar_proxy = await init.proxy();
  let governor_proxy = await init.proxy();
  let metadao_proxy = await init.proxy();

  ///   STEP 4: Init the proxies to point to the correct implementation addresses
  await amor_proxy.initProxy(AMOR_TOKEN.address);
  await amor_guild_token_proxy.initProxy(AMOR_GUILD_TOKEN.address);
  await dAmor_proxy.initProxy(DAMOR_GUILD_TOKEN.address);
  await fxAmor_proxy.initProxy(FX_AMOR_TOKEN.address);
  await controller_proxy.initProxy(CONTROLLERXGUILD.address);
  await avatar_proxy.initProxy(AVATARXGUILD.address);
  await governor_proxy.initProxy(GOVERNORXGUILD.address);
  await metadao_proxy.initProxy(METADAO.address);
  
  ///   STEP 5: Init the storage of the tokens and control contracts
  DOINGUD_AMOR_TOKEN = AMOR_TOKEN.attach(amor_proxy.address);
  DOINGUD_AMOR_GUILD_TOKEN = AMOR_GUILD_TOKEN.attach(amor_guild_token_proxy.address);
  DOINGUD_DAMOR = DAMOR_GUILD_TOKEN.attach(dAmor_proxy.address);
  DOINGUD_FXAMOR = FX_AMOR_TOKEN.attach(fxAmor_proxy.address);
  DOINGUD_AVATAR = AVATARXGUILD.attach(avatar_proxy.address);
  DOINGUD_CONTROLLER = CONTROLLERXGUILD.attach(controller_proxy.address);
  DOINGUD_GOVERNOR = GOVERNORXGUILD.attach(governor_proxy.address);
  DOINGUD_METADAO = METADAO.attach(metadao_proxy.address);

  await DOINGUD_AMOR_TOKEN.init(
    AMOR_TOKEN_NAME, 
    AMOR_TOKEN_SYMBOL, 
    DOINGUD_METADAO.address, //taxController
    TAX_RATE,
    setup.roles.root.address
  );

  await DOINGUD_AMOR_GUILD_TOKEN.init(
    'AMORxMETADAO', 
    'AMORxG',
    DOINGUD_AMOR_TOKEN.address,
    DOINGUD_CONTROLLER.address
  );

  await DOINGUD_DAMOR.init(
    "DoinGud dAMOR", 
    "DAMOR", 
    setup.roles.operator.address, 
    DOINGUD_AMOR_GUILD_TOKEN.address, 
    GAURDIAN_THRESHOLD
  );

  await DOINGUD_FXAMOR.init(
    "DoinGud FXAMOR", 
    "FXAMOR", 
    DOINGUD_CONTROLLER.address, //controller
    DOINGUD_AMOR_GUILD_TOKEN.address
  );

  await DOINGUD_CONTROLLER.init(
    setup.roles.root.address, // owner
    DOINGUD_AMOR_TOKEN.address,
    DOINGUD_AMOR_GUILD_TOKEN.address, // AMORxGuild
    DOINGUD_FXAMOR.address, // FXAMORxGuild
    DOINGUD_METADAO.address, // MetaDaoController
    setup.roles.root.address // the multisig address of the MetaDAO, which owns the token
  );

  await DOINGUD_AVATAR.init(
    setup.roles.root.address, // owner
    DOINGUD_GOVERNOR.address // governor Address
  );

  await DOINGUD_GOVERNOR.init(
    "DoinGud Governor",
    DOINGUD_AMOR_GUILD_TOKEN.address, //AMORxGuild
    setup.roles.authorizer_adaptor.address, // Snapshot Address
    DOINGUD_AVATAR.address // Avatar Address
  );

  await DOINGUD_METADAO.init(
    DOINGUD_AMOR_TOKEN.address,
    CLONE_FACTORY.address,
    root.address
  );

});

    beforeEach('setup', async function() {
        await setupTests();
    });

    context("Setup the implementation contracts", () => {
        it("Should transfer AMOR between addresses", async function () {
            const taxDeducted = TEST_TRANSFER*(TAX_RATE/BASIS_POINTS)

            await expect(DOINGUD_AMOR_TOKEN.transfer(user1.address, TEST_TRANSFER)).
                to.emit(DOINGUD_AMOR_TOKEN, "Transfer").
                    withArgs(root.address, user1.address, (TEST_TRANSFER-taxDeducted).toString());
        });

        it("Should accrue taxes correctly", async function () {
            const taxDeducted = TEST_TRANSFER*(TAX_RATE/BASIS_POINTS)
            await DOINGUD_AMOR_TOKEN.transfer(user1.address, TEST_TRANSFER);

            expect(await DOINGUD_AMOR_TOKEN.balanceOf(DOINGUD_METADAO.address)).to.equal(taxDeducted.toString());
            expect(await DOINGUD_AMOR_TOKEN.balanceOf(user1.address)).to.equal(((TEST_TRANSFER - taxDeducted).toString()));
        });
    });

    context("Donate AMOR to the Guild", () => {

    });

    context('Setup the MetaDAO Controller', () => {
    });

    context('Create the guild contracts', () => {

    });

});