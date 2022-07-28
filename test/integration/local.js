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
let GUILD_ONE_AMORXGUILD;
let GUILD_ONE_DAMORXGUILD;
let GUILD_ONE_FXAMORXGUILD;
let GUILD_ONE_CONTROLLER;
let METADAO;
let PROXY;
let user1;
let CONTROLLERXGUILD;

describe("local integration tests - MetaDao", function () {

    const setupTests = deployments.createFixture(async () => {
        /// Get the signers
        const signers = await ethers.getSigners();
        /// Initialize test setup
        const setup = await init.initialize(signers);
        /// Setup signer accounts
        user1 = setup.roles.user1;
        /// Setup token implementations
        await init.getTokens(setup);
        AMOR_TOKEN = setup.tokens.AmorTokenImplementation;
        AMOR_GUILD_TOKEN = setup.tokens.AmorGuildToken;
        FX_AMOR_TOKEN = setup.tokens.FXAMORxGuild;
        DAMOR_GUILD_TOKEN = setup.tokens.dAMORxGuild;
        PROXY = setup.tokens.AmorTokenProxy;
        ///   Setup the guildfactory and controller contract
        await init.getGuildFactory(setup);
        CLONE_FACTORY = setup.factory.guildFactory;
        CONTROLLERXGUILD = setup.factory.controller;
        ///   Initialize the metadao
        await init.metadao(setup);
        METADAO = setup.metadao;
    });

    before('setup', async function() {
        await setupTests();
    });

    context('Setup the implementation contracts', () => {
        it('Should return the AMOR token address', async function () {
            expect(await AMOR_TOKEN.address).to.not.be.null;
        });
        it('Should return the AMORxGuild implementation address', async function () {
            expect(await AMOR_GUILD_TOKEN.address).to.not.be.null;
        });
        it('Should return the FXAMORxGuild token address', async function () {
            expect(await FX_AMOR_TOKEN.address).to.not.be.null;
        });
        it('Should return the dAMOR/dAMORxGuild token implementation address', async function () {
            expect(await DAMOR_GUILD_TOKEN.address).to.not.be.null;
        });
        it('Should return the DoinGudProxy implementation address', async function () {
            expect(await PROXY.address).to.not.be.null;
        });
        it('Should return the controller implementation address', async function () {
            expect(await CONTROLLERXGUILD.address).to.not.be.null;
        });
    });

    context('Setup the GuildFactory contract', () => {
        it('Should correctly setup the GuildFactory contract', async function () {
            expect(await CLONE_FACTORY.amorToken()).to.equal(AMOR_TOKEN.address);
            expect(await CLONE_FACTORY.amorxGuildToken()).to.equal(AMOR_GUILD_TOKEN.address);
            expect(await CLONE_FACTORY.fxAMORxGuildToken()).to.equal(FX_AMOR_TOKEN.address);
            expect(await CLONE_FACTORY.dAMORxGuildToken()).to.equal(DAMOR_GUILD_TOKEN.address);
            expect(await CLONE_FACTORY.controllerxGuild()).to.equal(CONTROLLERXGUILD.address);
            expect(await CLONE_FACTORY.cloneTarget()).to.equal(PROXY.address);
        });
    });

    context('Setup the MetaDAO Controller', () => {
        it('Should correctly setup the MetaDAO Controller contract', async function () {
            expect(await METADAO.guildFactory()).to.equal(CLONE_FACTORY.address);
        });
    });

    context('Create the guild contracts', () => {
        it('Should deploy a new guild', async function () {
            await METADAO.createGuild(user1.address, MOCK_GUILD_NAMES[0], MOCK_GUILD_SYMBOLS[0]);
            GUILD_ONE_CONTROLLER = await CLONE_FACTORY.guildControllers(0);
            GUILD_ONE_AMORXGUILD = await CLONE_FACTORY.amorxGuilds(0);
            GUILD_ONE_DAMORXGUILD = await CLONE_FACTORY.dAMORxGuildTokens(0);
            GUILD_ONE_FXAMORXGUILD = await CLONE_FACTORY.fxAMORxGuildTokens(0);

            GUILD_ONE_CONTROLLER = CONTROLLERXGUILD.attach(GUILD_ONE_CONTROLLER);
            GUILD_ONE_AMORXGUILD = AMOR_GUILD_TOKEN.attach(GUILD_ONE_AMORXGUILD);
            GUILD_ONE_DAMORXGUILD = DAMOR_GUILD_TOKEN.attach(GUILD_ONE_DAMORXGUILD);
            GUILD_ONE_FXAMORXGUILD = FX_AMOR_TOKEN.attach(GUILD_ONE_FXAMORXGUILD);
        });
        it('Should return the correct AMORxGuild name', async function () {
            expect(await GUILD_ONE_AMORXGUILD.name()).to.equal("AMORxGUILD_ONE");
        });
        it('Should return the correct dAMORxGuild name', async function () {
            expect(await GUILD_ONE_DAMORXGUILD.name()).to.equal("dAMORxGUILD_ONE");
        });
        it('Should return the correct FXAMORxGuild name', async function () {
            expect(await GUILD_ONE_FXAMORXGUILD.name()).to.equal("FXAMORxGUILD_ONE");
        });
        it('Should return the expected Controller owner address', async function () {
            expect(await GUILD_ONE_CONTROLLER.owner()).to.be.equal(user1.address);
        });
    });

});