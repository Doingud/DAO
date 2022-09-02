const { ethers } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");
const init = require('../test-init.js');
const { 
    ONE_HUNDRED_ETHER,
    FIFTY_ETHER,
    ONE_ADDRESS,
    ZERO_ADDRESS,
    MOCK_GUILD_NAMES,
    MOCK_GUILD_SYMBOLS
  } = require('../helpers/constants.js');

use(solidity);

let AMOR_TOKEN;
let AMOR_GUILD_TOKEN;
let METADAO;
let USDC;
let user1;
let user2;
//let user3;
//let root;
let CONTROLLER
let GUILD_CONTROLLER_ONE;
let GUILD_CONTROLLER_TWO;

describe("unit - MetaDao", function () {

    const setupTests = deployments.createFixture(async () => {
        const signers = await ethers.getSigners();
        const setup = await init.initialize(signers);
        ///   Setup token contracts
        await init.getTokens(setup);
        AMOR_TOKEN = setup.tokens.AmorTokenImplementation;
        USDC = setup.tokens.ERC20Token;
        AMOR_GUILD_TOKEN = setup.tokens.AmorGuildToken;
        ///   Setup signer accounts
        root = setup.roles.root;
        multisig = setup.roles.doingud_multisig;    
        user1 = setup.roles.user1;
        user2 = setup.roles.user2;
        user3 = setup.roles.user3;
        pool = setup.roles.pool;
        ///   Setup the Controller
        await init.controller(setup);
        console.log("Controller init");
        CONTROLLER = setup.controller;
        await init.metadao(setup);
        METADAO = setup.metadao;
        await CONTROLLER.setMetaDao(METADAO.address);
        let varx = await CONTROLLER.MetaDaoController();
        console.log(varx);
        console.log("Metadao init");
        ///   Setup the guildfactory contract first
        await init.getGuildFactory(setup);
        await METADAO.setGuildFactory(setup.factory.guildFactory.address);
        console.log("guildfactory init");

        ///   Initialize the metadao

    });

    beforeEach('setup', async function() {
        await setupTests();
        /// Setup the guilds through the METADAO
        await METADAO.createGuild(user2.address, MOCK_GUILD_NAMES[0], MOCK_GUILD_SYMBOLS[0]);
        await METADAO.createGuild(user1.address, MOCK_GUILD_NAMES[1], MOCK_GUILD_SYMBOLS[1]);
        GUILD_CONTROLLER_ONE = await METADAO.guilds(ONE_ADDRESS);
        GUILD_CONTROLLER_ONE = CONTROLLER.attach(GUILD_CONTROLLER_ONE);
        //console.log("GUILD_ONE " + GUILD_CONTROLLER_ONE.address);
        GUILD_CONTROLLER_TWO = await METADAO.guilds(GUILD_CONTROLLER_ONE.address);
        GUILD_CONTROLLER_TWO = CONTROLLER.attach(GUILD_CONTROLLER_TWO);
        //  Fix for tests
        await GUILD_CONTROLLER_ONE.setMetaDao(METADAO.address);
        await GUILD_CONTROLLER_TWO.setMetaDao(METADAO.address);
        //console.log("GUILD_TWO " + GUILD_CONTROLLER_TWO.address);
        await METADAO.addWhitelist(USDC.address);
        await AMOR_TOKEN.approve(METADAO.address, ONE_HUNDRED_ETHER);
        await USDC.approve(METADAO.address, ONE_HUNDRED_ETHER);
        const abi = ethers.utils.defaultAbiCoder;
        let encodedIndex = abi.encode(
            ["tuple(address, uint256)"],
            [
            [GUILD_CONTROLLER_ONE.address, 100]
            ]
        );
        let encodedIndex2 = abi.encode(
            ["tuple(address, uint256)"],
            [
            [GUILD_CONTROLLER_TWO.address, 100]
            ]
        );

        //let feesIndex = encodedIndex;
        await METADAO.updateFeeIndex([encodedIndex, encodedIndex2]);

        
        //await METADAO.connect(root).donate(AMOR_TOKEN.address, ONE_HUNDRED_ETHER, 0);
        //await METADAO.connect(root).donate(USDC.address, ONE_HUNDRED_ETHER, 0);
    });

    context("initialization", () => {
        it("Should have set up the linked list addresses correctly", async function () {
            let address1 = await METADAO.guilds(ONE_ADDRESS);
            let address2 = await METADAO.guilds(address1);
            /// Confirm linked list logic
            expect(await METADAO.guilds(ONE_ADDRESS)).to.be.equal(address1);
            expect(await METADAO.guilds(address1)).to.be.equal(address2);
            expect(await METADAO.guilds(address2)).to.be.equal(ONE_ADDRESS);
        });
    });

    context('function: addFeeIndex()', () => {
        it('Should have set the fee index correctly', async function () {
            let hash = await METADAO.indexHashes(0);
            let indexReturn = await METADAO.indexes(hash);
            expect(indexReturn.indexDenominator).to.equal(200);
        });
    });

    context('function: addGuild()', () => {
        it('it fails add guilds if not an admin address', async function () {
            await expect(METADAO.connect(user1).createGuild(user2.address, MOCK_GUILD_NAMES[0], MOCK_GUILD_SYMBOLS[0])).
                to.be.revertedWith('AccessControl');
        });

        it('it creates a new guild if tx sent by admin', async function () {
            await METADAO.createGuild(user3.address, MOCK_GUILD_NAMES[2], MOCK_GUILD_SYMBOLS[2]);
            expect(await METADAO.guilds(GUILD_CONTROLLER_TWO.address)).to.not.equal(ONE_ADDRESS);
        });

        it('Should add an external guild', async function () {
            await METADAO.addExternalGuild(user3.address);
            expect(await METADAO.guilds(GUILD_CONTROLLER_TWO.address)).to.equal(user3.address);
        })

        it('it fails when trying to add the same guild twice', async function () {
            await METADAO.addExternalGuild(user3.address);
            await expect(METADAO.addExternalGuild(user3.address)).
                to.be.revertedWith('Exists()');
        });
    });

    context('function: removeGuild()', () => {
        it('it fails to remove guilds if not an admin address', async function () {
            await expect(METADAO.connect(user1).removeGuild(GUILD_CONTROLLER_ONE.address)).
                to.be.revertedWith('AccessControl');
        });

        it('it removes a guild if tx sent by admin', async function () {
            await METADAO.removeGuild(GUILD_CONTROLLER_TWO.address);
            expect(await METADAO.guilds(GUILD_CONTROLLER_ONE.address)).to.equal(ONE_ADDRESS);  
        });
    });

    context('function: addWhitelist()', () => {
        it('Should add token to whitelist', async function () {
            await METADAO.addWhitelist(AMOR_GUILD_TOKEN.address);
            /// Test linked list assumptions
            expect(await METADAO.isWhitelisted(AMOR_GUILD_TOKEN.address)).to.be.true;
            expect(await METADAO.whitelist(ONE_ADDRESS)).to.equal(AMOR_TOKEN.address);
            expect(await METADAO.whitelist(AMOR_TOKEN.address)).to.equal(USDC.address);
            expect(await METADAO.whitelist(USDC.address)).to.equal(AMOR_GUILD_TOKEN.address);
            expect(await METADAO.whitelist(AMOR_GUILD_TOKEN.address)).to.equal(ONE_ADDRESS);
        });

        it('Should fail if not called by admin', async function () {
            await expect(METADAO.connect(user1).addWhitelist(USDC.address)).to.be.revertedWith("AccessControl");
        });
    });

    context('function: donate()', () => {
        it("Should fail if token not whitelisted", async function () {
            await expect(METADAO.donate(AMOR_GUILD_TOKEN.address, ONE_HUNDRED_ETHER, 0)).to.be.revertedWith("NotListed()");
        });

        it('it succeeds if tokens are successfully donated to the metadao', async function () {
            await AMOR_TOKEN.approve(METADAO.address, ONE_HUNDRED_ETHER);
            await USDC.approve(METADAO.address, ONE_HUNDRED_ETHER);
            await METADAO.connect(root).donate(AMOR_TOKEN.address, ONE_HUNDRED_ETHER, 0);
            await METADAO.connect(root).donate(USDC.address, ONE_HUNDRED_ETHER, 0);
            expect(await METADAO.donations(USDC.address)).to.equal((ONE_HUNDRED_ETHER).toString());
        });
    });

    context('function: claimToken()', () => {
        it('it succeeds if amor tokens are distributed to the guild according to fee index weight', async function () {
            await AMOR_TOKEN.approve(METADAO.address, ONE_HUNDRED_ETHER);
            await USDC.approve(METADAO.address, ONE_HUNDRED_ETHER);
            await METADAO.donate(AMOR_TOKEN.address, ONE_HUNDRED_ETHER, 0);
            /// Here we need to call `gatherDonation` from the GuildController
            let something = await GUILD_CONTROLLER_ONE.MetaDaoController();
            expect(METADAO.address).to.equal(something);
            console.log("MDC: " + something);
            let amorBalanceMetaDao = await AMOR_TOKEN.balanceOf(METADAO.address);
            let amorBalanceController = await AMOR_TOKEN.balanceOf(GUILD_CONTROLLER_ONE.address);
            await GUILD_CONTROLLER_ONE.gatherDonation(AMOR_TOKEN.address);
            let metadaoAfter = await AMOR_TOKEN.balanceOf(METADAO.address);
            let controllerAfter = await AMOR_TOKEN.balanceOf(GUILD_CONTROLLER_ONE.address);
            expect((amorBalanceMetaDao - metadaoAfter)*0.95).to.equal(controllerAfter - amorBalanceController);
            /// Step 2: Connect the owner to the guild and call `gatherDonation`
        });

        it('does not change the allocations if called more than once', async function () {
            //await METADAO.distributeAll();
            //let fundsAllocated = await METADAO.guildFunds(user2.address, USDC.address);
            //await METADAO.distributeAll();
            //expect(await METADAO.guildFunds(user2.address, USDC.address)).to.equal(fundsAllocated);

        });
    });

    context('function: claim()', () => {
        it('it fails to claim if msg.sender is not a guild', async function () {
            //await expect(METADAO.connect(multisig).claim()).to.be.revertedWith("AccessControl");
        });

        it('it succeeds if a guild claims the token according to guildweight', async function () {
            //await METADAO.distributeAll();
            //await METADAO.connect(user1).claim();
            //expect(await USDC.balanceOf(user1.address)).to.be.equal(FIFTY_ETHER);
        });
    });

    context('function: distributeToken()', () => {
        it('it distributes a specified token', async function () {    
            //await METADAO.distributeToken(USDC.address);
            //expect(await METADAO.guildFunds(user1.address, USDC.address)).to.equal(FIFTY_ETHER);
        });

    });

});