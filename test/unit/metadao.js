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
let AMOR_GUILD_TOKEN;
let METADAO;
let USDC;
let user1;
let user2;
let user3;
let CONTROLLER;
let FACTORY;

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
        await init.avatar(setup);
        await init.governor(setup);
        /// Setup the MetaDao first
        await init.metadao(setup);
        METADAO = setup.metadao;
        /// Setup the Controller
        await init.controller(setup);
        CONTROLLER = setup.controller;
        /// Beacons
        setup.b_amorGuildToken = await init.beacon(AMOR_GUILD_TOKEN.address, METADAO.address);
        setup.b_fxamor = await init.beacon(setup.tokens.FXAMORxGuild.address, METADAO.address);
        setup.b_damor = await init.beacon(setup.tokens.dAMORxGuild.address, METADAO.address);
        setup.b_controller = await init.beacon(setup.controller.address, METADAO.address);
        setup.b_governor = await init.beacon(setup.governor.address, METADAO.address);
        setup.b_avatar = await init.beacon(setup.avatars.avatar.address, METADAO.address);
        /// Setup the guild factory
        await init.getGuildFactory(setup);
        FACTORY = setup.factory;

        await METADAO.init(AMOR_TOKEN.address, FACTORY.address, root.address);
    });

    beforeEach('setup', async function() {
        await setupTests();
        /// Setup the guilds through the METADAO
        await METADAO.createGuild(user2.address, user3.address, MOCK_GUILD_NAMES[0], MOCK_GUILD_SYMBOLS[0]);
        await METADAO.createGuild(user1.address, user3.address, MOCK_GUILD_NAMES[1], MOCK_GUILD_SYMBOLS[1]);
        GUILD_CONTROLLER_ONE = await METADAO.guilds(ONE_ADDRESS);
        GUILD_CONTROLLER_ONE = CONTROLLER.attach(GUILD_CONTROLLER_ONE);
        GUILD_CONTROLLER_TWO = await METADAO.guilds(GUILD_CONTROLLER_ONE.address);
        GUILD_CONTROLLER_TWO = CONTROLLER.attach(GUILD_CONTROLLER_TWO);

        await METADAO.addWhitelist(USDC.address);
        await AMOR_TOKEN.approve(METADAO.address, ONE_HUNDRED_ETHER);
        await USDC.approve(METADAO.address, ONE_HUNDRED_ETHER);

        let guilds = [GUILD_CONTROLLER_ONE.address, GUILD_CONTROLLER_TWO.address];
        let weights = [100, 100];

        await METADAO.updateIndex(guilds, weights, 0);
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
            indexReturn = await METADAO.indexes(0);
            expect(indexReturn.indexDenominator).to.equal(200);
        });
    });

    context('function: addGuild()', () => {
        it('Should fail to add guilds if not an admin address', async function () {
            await expect(METADAO.connect(user1).createGuild(user2.address, user3.address, MOCK_GUILD_NAMES[0], MOCK_GUILD_SYMBOLS[0])).
                to.be.revertedWith('Ownable');
        });

        it('Should create a new guild if tx sent by admin', async function () {
            await METADAO.createGuild(user3.address, user3.address, MOCK_GUILD_NAMES[2], MOCK_GUILD_SYMBOLS[2]);
            expect(await METADAO.guilds(GUILD_CONTROLLER_TWO.address)).to.not.equal(ONE_ADDRESS);
        });

        it('Should add an external guild', async function () {
            await METADAO.addExternalGuild(user3.address);
            expect(await METADAO.guilds(GUILD_CONTROLLER_TWO.address)).to.equal(user3.address);
        })

        it('Should fail when trying to add the same guild twice', async function () {
            await METADAO.addExternalGuild(user3.address);
            await expect(METADAO.addExternalGuild(user3.address)).
                to.be.revertedWith('Exists()');
        });
    });

    context('function: removeGuild()', () => {
        it('Should fail to remove guilds if InvalidGuild', async function () {
            await expect(METADAO.removeGuild(METADAO.address)).
                to.be.revertedWith('InvalidGuild');
        });

        it('Should remove a guild if tx sent by admin', async function () {
            await METADAO.removeGuild(GUILD_CONTROLLER_TWO.address);
            expect(await METADAO.guilds(GUILD_CONTROLLER_ONE.address)).to.equal(ONE_ADDRESS);  
        });
    });

    context('function: addWhitelist()', () => {
        it('Should revert to donate if called for not listed token', async function () {
            await expect(METADAO.donate(AMOR_GUILD_TOKEN.address, ONE_HUNDRED_ETHER, 1, 0)).
                to.be.revertedWith("NotListed()");
        });
    
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
            await expect(METADAO.connect(user1).addWhitelist(USDC.address)).to.be.revertedWith("Ownable");
        });
    });


    context('function: removeWhitelist()', () => {

        it('Should remove token from whitelist', async function () {
            await METADAO.addWhitelist(AMOR_GUILD_TOKEN.address);
            /// Test linked list assumptions
            expect(await METADAO.isWhitelisted(AMOR_GUILD_TOKEN.address)).to.be.true;
            expect(await METADAO.whitelist(ONE_ADDRESS)).to.equal(AMOR_TOKEN.address);
            expect(await METADAO.whitelist(AMOR_TOKEN.address)).to.equal(USDC.address);
            expect(await METADAO.whitelist(USDC.address)).to.equal(AMOR_GUILD_TOKEN.address);
            expect(await METADAO.whitelist(AMOR_GUILD_TOKEN.address)).to.equal(ONE_ADDRESS);
            expect(await METADAO.sentinelWhitelist()).to.equal(AMOR_GUILD_TOKEN.address);

            await METADAO.removeWhitelist(AMOR_GUILD_TOKEN.address);
            expect(await METADAO.isWhitelisted(AMOR_GUILD_TOKEN.address)).to.be.false;
            expect(await METADAO.whitelist(USDC.address)).to.equal(ONE_ADDRESS);
            expect(await METADAO.sentinelWhitelist()).to.equal(USDC.address);
        });

        it('Should remove token from inside of whitelist', async function () {
            await METADAO.addWhitelist(AMOR_GUILD_TOKEN.address);
            /// Test linked list assumptions
            expect(await METADAO.isWhitelisted(AMOR_GUILD_TOKEN.address)).to.be.true;
            expect(await METADAO.whitelist(ONE_ADDRESS)).to.equal(AMOR_TOKEN.address);
            expect(await METADAO.whitelist(AMOR_TOKEN.address)).to.equal(USDC.address);
            expect(await METADAO.whitelist(USDC.address)).to.equal(AMOR_GUILD_TOKEN.address);
            expect(await METADAO.whitelist(AMOR_GUILD_TOKEN.address)).to.equal(ONE_ADDRESS);
            expect(await METADAO.sentinelWhitelist()).to.equal(AMOR_GUILD_TOKEN.address);

            await METADAO.removeWhitelist(USDC.address);
            expect(await METADAO.isWhitelisted(USDC.address)).to.be.false;
            expect(await METADAO.whitelist(AMOR_TOKEN.address)).to.equal(AMOR_GUILD_TOKEN.address);
            expect(await METADAO.whitelist(AMOR_GUILD_TOKEN.address)).to.equal(ONE_ADDRESS);
            expect(await METADAO.sentinelWhitelist()).to.equal(AMOR_GUILD_TOKEN.address);
        });

        it('Should fail if not called by admin', async function () {
            await expect(METADAO.connect(user1).removeWhitelist(USDC.address)).to.be.revertedWith("Ownable");
        });


        it('Should fail if not exists', async function () {
            await expect(METADAO.connect(user1).removeWhitelist(AMOR_GUILD_TOKEN.address)).to.be.revertedWith("Ownable");
        });
    });

    context('function: donate()', () => {
        it("Should fail if token not whitelisted", async function () {
            await expect(METADAO.donate(AMOR_GUILD_TOKEN.address, ONE_HUNDRED_ETHER, 0, 0)).to.be.revertedWith("NotListed()");
        });

        it('Should succeed if tokens are successfully donated to the metadao', async function () {
            await AMOR_TOKEN.approve(METADAO.address, ONE_HUNDRED_ETHER);
            await USDC.approve(METADAO.address, ONE_HUNDRED_ETHER);
            await METADAO.donate(AMOR_TOKEN.address, ONE_HUNDRED_ETHER, 0, 2);
            await METADAO.donate(USDC.address, ONE_HUNDRED_ETHER, 0, 2);
            expect(await METADAO.donations(USDC.address)).to.equal((ONE_HUNDRED_ETHER).toString());
            expect(await METADAO.guildFunds(GUILD_CONTROLLER_ONE.address, USDC.address)).to.equal(FIFTY_ETHER);
        });


        it('Should fail if no index', async function () {
            let AMOR_TOKEN2;
            let USDC2;
            let user2;
            let FACTORY2;
            let METADAO2;

            const signers = await ethers.getSigners();
            const setup = await init.initialize(signers);
            ///   Setup token contracts
            await init.getTokens(setup);
            AMOR_TOKEN2 = setup.tokens.AmorTokenImplementation;
            USDC2 = setup.tokens.ERC20Token;
            ///   Setup signer accounts
            root = setup.roles.root;
            multisig = setup.roles.doingud_multisig;
            user2 = setup.roles.user2;
            user3 = setup.roles.user3;
            pool = setup.roles.pool;
            await init.avatar(setup);
            await init.governor(setup);
            /// Setup the MetaDao first
            await init.metadao(setup);
            METADAO2 = setup.metadao;
            await init.controller(setup);
            await init.avatar(setup);
            await init.governor(setup);
            /// Beacons
            setup.b_amorGuildToken = await init.beacon(AMOR_GUILD_TOKEN.address, METADAO.address);
            setup.b_fxamor = await init.beacon(setup.tokens.FXAMORxGuild.address, METADAO.address);
            setup.b_damor = await init.beacon(setup.tokens.dAMORxGuild.address, METADAO.address);
            setup.b_controller = await init.beacon(setup.controller.address, METADAO.address);
            setup.b_governor = await init.beacon(setup.governor.address, METADAO.address);
            setup.b_avatar = await init.beacon(setup.avatars.avatar.address, METADAO.address);

            await init.getGuildFactory(setup);
            FACTORY2 = setup.factory;

            await METADAO2.init(AMOR_TOKEN2.address, FACTORY2.address, root.address);

            /// Setup the guilds through the METADAO
            await METADAO2.createGuild(user2.address, user1.address, MOCK_GUILD_NAMES[0], MOCK_GUILD_SYMBOLS[0]);
            await METADAO2.createGuild(user2.address, user1.address, MOCK_GUILD_NAMES[1], MOCK_GUILD_SYMBOLS[1]);

    
            await METADAO2.addWhitelist(USDC2.address);
            await AMOR_TOKEN2.approve(METADAO2.address, ONE_HUNDRED_ETHER);
            await USDC2.approve(METADAO2.address, ONE_HUNDRED_ETHER);

            let indexReturn = await METADAO2.indexes(0);
            expect(indexReturn.indexDenominator).to.equal(0);

            await expect(METADAO2.donate(USDC2.address, ONE_HUNDRED_ETHER, 0, 0)).
                to.be.revertedWith("NoIndex()");
        });
    });

    context('function: claimToken()', () => {
        it('it succeeds if amor tokens are distributed to the guild according to fee index weight', async function () {
            await AMOR_TOKEN.approve(METADAO.address, ONE_HUNDRED_ETHER);
            await USDC.approve(METADAO.address, ONE_HUNDRED_ETHER);
            await METADAO.donate(AMOR_TOKEN.address, ONE_HUNDRED_ETHER, 0, 2);
            await METADAO.donate(USDC.address, ONE_HUNDRED_ETHER, 0, 2);
            /// Here we need to call `gatherDonation` from the GuildController
            /// Check AMOR claims
            let amorMetaDaoBefore = await AMOR_TOKEN.balanceOf(METADAO.address);
            let amorControllerBefore = await AMOR_TOKEN.balanceOf(GUILD_CONTROLLER_ONE.address);
            await GUILD_CONTROLLER_ONE.gatherDonation(AMOR_TOKEN.address);

            let metadaoAfter = await AMOR_TOKEN.balanceOf(METADAO.address);
            let controllerAfter = await AMOR_TOKEN.balanceOf(GUILD_CONTROLLER_ONE.address);
            expect((amorMetaDaoBefore - metadaoAfter)*0.95).to.equal(controllerAfter - amorControllerBefore);
            /// Check USDC claims
            let usdcMetaDaoBefore = await USDC.balanceOf(METADAO.address);
            let usdcControllerBefore = await USDC.balanceOf(GUILD_CONTROLLER_ONE.address);
            await GUILD_CONTROLLER_ONE.gatherDonation(USDC.address);

            let usdcMetaDaoAfter = await USDC.balanceOf(METADAO.address);
            let usdcControllerAfter = await USDC.balanceOf(GUILD_CONTROLLER_ONE.address);
            expect(usdcMetaDaoBefore - usdcMetaDaoAfter).to.equal(usdcControllerAfter - usdcControllerBefore);
        });

        it('Should revert to claim NotListed token', async function () {
            await expect(GUILD_CONTROLLER_ONE.gatherDonation(GUILD_CONTROLLER_TWO.address)).
                to.be.revertedWith("NotWhitelistedToken()");
        });

        it('Should revert if called not listed token', async function () {
            await expect(GUILD_CONTROLLER_ONE.gatherDonation(GUILD_CONTROLLER_ONE.address)).
                to.be.revertedWith("NotWhitelistedToken()");
        });

        it('Should revert if called with no tokens allocated', async function () {
            await expect(GUILD_CONTROLLER_ONE.gatherDonation(USDC.address)).
                to.be.revertedWith("InvalidAmount()");
        });
    });

    context('function: distributeFees()', () => {
        it('it distributes collected AMOR tokens from fees', async function () {    
            await AMOR_TOKEN.transfer(METADAO.address, ONE_HUNDRED_ETHER);
            expect(await METADAO.guildFees(GUILD_CONTROLLER_ONE.address)).to.equal(0);
            await METADAO.distributeFees(AMOR_TOKEN.address);
            expect(await METADAO.guildFees(GUILD_CONTROLLER_ONE.address)).to.equal((FIFTY_ETHER * 0.95).toString());
        });

        it('it distributes collected AMOR tokens from fees if amount = 0', async function () {    
            expect(await METADAO.guildFees(GUILD_CONTROLLER_ONE.address)).to.equal(0);
            await METADAO.distributeFees(AMOR_TOKEN.address);
            expect(await METADAO.guildFees(GUILD_CONTROLLER_ONE.address)).to.equal(0);
        });
    });

    context("function: claimFees()", () => {
        it("it fails if an invalid guild address is supplied", async function () {
            await expect(METADAO.claimFees(METADAO.address)).to.be.revertedWith("InvalidGuild()");
        });

        it("it allows a guild to claim fees apportioned to it", async function () {
            await AMOR_TOKEN.transfer(METADAO.address, ONE_HUNDRED_ETHER);
            await METADAO.distributeFees(AMOR_TOKEN.address);
            let guildAmor = await METADAO.guildFees(GUILD_CONTROLLER_ONE.address);
            await expect(METADAO.claimFees(GUILD_CONTROLLER_ONE.address)).
                to.emit(AMOR_TOKEN, "Transfer").
                withArgs(METADAO.address, GUILD_CONTROLLER_ONE.address, (guildAmor * 0.95).toString());
            expect(await METADAO.guildFees(GUILD_CONTROLLER_ONE.address)).to.equal(0);
        });
    })

    context("function: addIndex()", () => {
        it("Should allow a user to set a custom index", async function () {
            let guilds = [GUILD_CONTROLLER_ONE.address, GUILD_CONTROLLER_TWO.address];
            let weights = [50, 150];
            let index = await METADAO.addIndex(guilds, weights);
            index = await METADAO.indexes(1);
            expect(index.indexDenominator).to.equal(200);
        });
    });

    context("function: donate()", () => {
        it("Should allow a user to donate according to a custom index", async function () {
            let guilds = [GUILD_CONTROLLER_ONE.address, GUILD_CONTROLLER_TWO.address];
            let weights = [50, 150];

            await METADAO.addIndex(guilds, weights);
            await USDC.approve(METADAO.address, ONE_HUNDRED_ETHER);
            await METADAO.donate(USDC.address, ONE_HUNDRED_ETHER, 1, 2);

            expect(await METADAO.guildFunds(GUILD_CONTROLLER_ONE.address, USDC.address)).to.equal((ONE_HUNDRED_ETHER/4).toString());
            expect(await METADAO.guildFunds(GUILD_CONTROLLER_TWO.address, USDC.address)).to.equal((ONE_HUNDRED_ETHER * 0.75).toString());
        });
    });

    context('function: updateIndex()', () => {
        it('Should updateIndex if index = 0', async function () {
            let guilds = [GUILD_CONTROLLER_ONE.address, GUILD_CONTROLLER_TWO.address];
            let weights = [500, 150];

            await METADAO.updateIndex(guilds, weights, 0);

            let index = await METADAO.indexes(0);
            expect(index.indexDenominator).to.equal(650);
            await expect(METADAO.donate(USDC.address, ONE_HUNDRED_ETHER, 0, 1)).to.be.revertedWith("IndexChanged()");
            await METADAO.donate(USDC.address, ONE_HUNDRED_ETHER, 0, 2);
        });

        it('Should updateIndex if index > 0', async function () {
            let guilds = [GUILD_CONTROLLER_ONE.address, GUILD_CONTROLLER_TWO.address];
            let weights = [300, 200];
            await METADAO.addIndex(guilds, weights);

            weights = [500, 200];
            await METADAO.updateIndex(guilds, weights, 1);

            let index = await METADAO.indexes(1);
            expect(index.indexDenominator).to.equal(700);
        });

        it('Should fail to updateIndex if creator != msg.sender', async function () {
            let guilds = [GUILD_CONTROLLER_ONE.address, GUILD_CONTROLLER_TWO.address];
            let weights = [500, 200];
            await expect(METADAO.connect(user1).updateIndex(guilds, weights, 0)).
                to.be.revertedWith("Unauthorized()");
        });

        
    });

});