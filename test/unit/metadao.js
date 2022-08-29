const { ethers } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");
const init = require('../test-init.js');
const { 
    ONE_HUNDRED_ETHER,
    FIFTY_ETHER,
    ONE_ADDRESS,
    MOCK_GUILD_NAMES,
    MOCK_GUILD_SYMBOLS
  } = require('../helpers/constants.js');

use(solidity);

let AMOR_TOKEN;
let METADAO;
let USDC;
let GUILD_CONTROLLER;
let user1;
let user2;
let root;

describe("unit - MetaDao", function () {

    const setupTests = deployments.createFixture(async () => {
        const signers = await ethers.getSigners();
        const setup = await init.initialize(signers);
        ///   Setup token contracts
        await init.getTokens(setup);
        AMOR_TOKEN = setup.tokens.AmorTokenImplementation;
        USDC = setup.tokens.ERC20Token;
        AMOR_GUILD_TOKEN = setup.tokens.AmorGuildToken;
        FX_AMOR_TOKEN = setup.tokens.FXAMORxGuild;
        DAMOR_GUILD_TOKEN = setup.tokens.dAMORxGuild;
        ///   Setup signer accounts
        root = setup.roles.root;
        multisig = setup.roles.doingud_multisig;    
        user1 = setup.roles.user1;
         user2 = setup.roles.user2;
         pool = setup.roles.pool;
        ///   Setup the guildfactory contract first
        await init.getGuildFactory(setup);
        ///   Setup the Controller
        CONTROLLER = setup.factory.controller;
        ///   Initialize the metadao
        await init.metadao(setup);
        METADAO = setup.metadao;
    });

    before('setup', async function() {
        await setupTests();
    });

    context('function: createGuild()', () => {
        it('it fails add guilds if not an admin address', async function () {
            await expect(METADAO.connect(user1).createGuild(user2.address, MOCK_GUILD_NAMES[0], MOCK_GUILD_SYMBOLS[0])).
                to.be.revertedWith('AccessControl');
        });

        it('it adds a guild if tx sent by admin', async function () {
            await METADAO.createGuild(user2.address, MOCK_GUILD_NAMES[0], MOCK_GUILD_SYMBOLS[0]);
            let guild = await METADAO.guilds(0);
            GUILD_CONTROLLER = AMOR_TOKEN.attach(guild);

            expect(await GUILD_CONTROLLER.owner()).to.equal(user2.address); 
        });
    });

    context('function: removeGuild()', () => {
        it('it fails to remove guilds if not an admin address', async function () {
            await expect(METADAO.connect(user1).removeGuild(0, GUILD_CONTROLLER.address)).
                to.be.revertedWith('AccessControl');
        });

        it('it removes a guild if tx sent by admin', async function () {
            await METADAO.createGuild(user1.address, MOCK_GUILD_NAMES[1], MOCK_GUILD_SYMBOLS[1]);
            let GUILD_CONTROLLER_TWO = await METADAO.guilds(1);
            await METADAO.removeGuild(0, GUILD_CONTROLLER.address);
            GUILD_CONTROLLER_TWO = AMOR_TOKEN.attach(GUILD_CONTROLLER_TWO);
            expect(await METADAO.guilds(0)).to.equal(GUILD_CONTROLLER_TWO.address);  
        });
    });

    /* Removed: only the owners can adjust the weights
    context('function: updateGuildWeight()', () => {
        it('it fails to update the weight is msg.sender is not a guild', async function () {
            await expect(METADAO.connect(user2).updateGuildWeights([user1.address, user2.address], [ONE_HUNDRED_ETHER, ONE_HUNDRED_ETHER])).
                to.be.revertedWith('AccessControl');
        });

        it('it successfully updates the weight when a Guild address calls the function', async function () {
            await METADAO.createGuild(user2.address, MOCK_GUILD_NAMES[0], MOCK_GUILD_SYMBOLS[0]);
            expect(await METADAO.connect(user1).updateGuildWeight(ONE_HUNDRED_ETHER));
            expect(await METADAO.connect(user2).updateGuildWeight(ONE_HUNDRED_ETHER));
        });
    });
    */

    context('function: addWhitelist()', () => {
        it('Should add token to whitelist', async function () {
            await METADAO.addWhitelist(USDC.address);
            expect(await METADAO.isWhitelisted(USDC.address)).to.be.true;
            expect(await METADAO.whitelist(ONE_ADDRESS)).to.equal(AMOR_TOKEN.address);
            expect(await METADAO.whitelist(AMOR_TOKEN.address)).to.equal(USDC.address);
            expect(await METADAO.whitelist(USDC.address)).to.equal(ONE_ADDRESS);
        });
    });

    context('function: donate()', () => {
        it('it succeeds if amor token is successfully donated to the metadao', async function () {
            expect(await AMOR_TOKEN.balanceOf(root.address) > 0);
            expect(await AMOR_TOKEN.balanceOf(METADAO.address) == 0);
            await AMOR_TOKEN.approve(METADAO.address, ONE_HUNDRED_ETHER);
            await USDC.approve(METADAO.address, ONE_HUNDRED_ETHER);
            expect(await AMOR_TOKEN.allowance(root.address,METADAO.address) == ONE_HUNDRED_ETHER);
            await METADAO.connect(root).donate(AMOR_TOKEN.address, ONE_HUNDRED_ETHER);
            await METADAO.connect(root).donate(USDC.address, ONE_HUNDRED_ETHER);
            expect(await METADAO.donations(USDC.address)).to.equal(ONE_HUNDRED_ETHER);
        });
    });

    context('function: distributeAll()', () => {
        it('it succeeds if amor tokens are distributed to the guild according to guild weight', async function () {
            let amorBalance = await AMOR_TOKEN.balanceOf(METADAO.address);
            expect(await AMOR_TOKEN.balanceOf(root.address) > 0);
            await METADAO.distributeAll();
            expect(await METADAO.guildFunds(user1.address, AMOR_TOKEN.address)).to.equal((amorBalance/2).toString());
            expect(await METADAO.guildFunds(user1.address, USDC.address)).to.equal(FIFTY_ETHER);
        });

        it('does not change the allocations if called more than once', async function () {
            let fundsAllocated = await METADAO.guildFunds(user1.address, USDC.address);
            await METADAO.distributeAll();
            expect(await METADAO.guildFunds(user1.address, USDC.address)).to.equal(fundsAllocated);

        });
    });

    context('function: claim()', () => {
        it('it fails to claim if msg.sender is not a guild', async function () {
            expect(await AMOR_TOKEN.balanceOf(root.address) > 0);
            await AMOR_TOKEN.connect(root).approve(METADAO.address,1000);
            expect(await AMOR_TOKEN.allowance(root.address,METADAO.address) == 1000);
            await expect(METADAO.connect(multisig).claim()).to.be.reverted;
        });

        it('it succeeds if a guild claims the token according to guildweight', async function () {
            await METADAO.connect(user1).claim();
            expect(await USDC.balanceOf(user1.address)).to.be.equal(FIFTY_ETHER);
        });
    });

    context('function: addIndex()', () => {
        it('it fails to add an index if the weights array is invalid', async function () {
            let weightsArray = [100, 100, 100];
            await expect(METADAO.addIndex(weightsArray)).
                to.be.revertedWith("InvalidArray()");
        });

        it('it adds a valid array to the index', async function () {
            weightsArray = [100, 50];
            await METADAO.addIndex(weightsArray);
        });
    });

});