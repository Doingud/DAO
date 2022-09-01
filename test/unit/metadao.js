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
let user3;
let root;
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
        FX_AMOR_TOKEN = setup.tokens.FXAMORxGuild;
        DAMOR_GUILD_TOKEN = setup.tokens.dAMORxGuild;
        ///   Setup signer accounts
        root = setup.roles.root;
        multisig = setup.roles.doingud_multisig;    
        user1 = setup.roles.user1;
        user2 = setup.roles.user2;
        user3 = setup.roles.user3;
        pool = setup.roles.pool;
        ///   Setup the guildfactory contract first
        await init.getGuildFactory(setup);
        ///   Setup the Controller
        CONTROLLER = setup.factory.controller;
        ///   Initialize the metadao
        await init.metadao(setup);
        METADAO = setup.metadao;
    });

    beforeEach('setup', async function() {
        await setupTests();
        /// Setup the guilds through the METADAO
        await METADAO.createGuild(user2.address, MOCK_GUILD_NAMES[0], MOCK_GUILD_SYMBOLS[0]);
        await METADAO.createGuild(user1.address, MOCK_GUILD_NAMES[1], MOCK_GUILD_SYMBOLS[1]);
        let guild1 = await METADAO.guilds(ZERO_ADDRESS);
        GUILD_CONTROLLER_ONE = AMOR_TOKEN.attach(guild1);
        //console.log("GUILD_ONE " + GUILD_CONTROLLER_ONE.address);
        let guild2 = await METADAO.guilds(GUILD_CONTROLLER_ONE.address);
        GUILD_CONTROLLER_TWO = AMOR_TOKEN.attach(guild2);
        //console.log("GUILD_TWO " + GUILD_CONTROLLER_TWO.address);
        await METADAO.addWhitelist(USDC.address);
        await AMOR_TOKEN.approve(METADAO.address, ONE_HUNDRED_ETHER);
        await USDC.approve(METADAO.address, ONE_HUNDRED_ETHER);
        const abi = ethers.utils.defaultAbiCoder;
        let amount = ethers.utils.hexZeroPad(ethers.utils.hexlify(100), 32);
        let encodedIndex = abi.encode(
            ["address", "uint256"],
            [
            GUILD_CONTROLLER_ONE.address, 100
            ]
        );

        //let feesIndex = encodedIndex;
        await METADAO.updateFeeIndex([encodedIndex]);
        let hash = await METADAO.indexHashes(0);
        let indexReturn = await METADAO.indexes(hash);
        console.log(indexReturn);
        
        //await METADAO.connect(root).donate(AMOR_TOKEN.address, ONE_HUNDRED_ETHER, 0);
        //await METADAO.connect(root).donate(USDC.address, ONE_HUNDRED_ETHER, 0);
    });

    context('function: addGuild()', () => {
        it('it fails add guilds if not an admin address', async function () {
            //await expect(METADAO.connect(user1).addGuild(user2.address)).
            //    to.be.revertedWith('AccessControl');
        });

        it('it adds a guild if tx sent by admin', async function () {
            //await METADAO.addGuild(user3.address);
            //expect(await METADAO.guilds(2)).to.equal(user3.address); 
        });

        it('it fails when trying to add the same guild', async function () {
            //await expect(METADAO.addGuild(user2.address)).
            //    to.be.revertedWith("Exists()");
        });
    });

    context('function: removeGuild()', () => {
        it('it fails to remove guilds if not an admin address', async function () {
            //await expect(METADAO.connect(user1).removeGuild(0, user2.address)).
            //    to.be.revertedWith('AccessControl');
        });

        it('it removes a guild if tx sent by admin', async function () {
            //await METADAO.removeGuild(0, user2.address);
            //expect(await METADAO.guilds(0)).to.equal(user1.address);  
        });
    });

    context('function: updateGuildWeights()', () => {
        it('it fails to update the weight if msg.sender is not a guild', async function () {
            //await expect(METADAO.connect(user3).updateGuildWeights([user1.address, user2.address], [ONE_HUNDRED_ETHER, ONE_HUNDRED_ETHER])).
            //    to.be.revertedWith('AccessControl');
        });

        it('it successfully updates the weight when the owner calls the function', async function () {
            //await METADAO.addGuild(user3.address);
            //expect(await METADAO.updateGuildWeights([user1.address, user2.address, user3.address], [ONE_HUNDRED_ETHER, ONE_HUNDRED_ETHER, ONE_HUNDRED_ETHER]));
        });
    });

    context('function: addWhitelist()', () => {
        it('Should add token to whitelist', async function () {
            //await METADAO.addWhitelist(AMOR_GUILD_TOKEN.address);
            /// Test linked list assumptions
            //expect(await METADAO.isWhitelisted(AMOR_GUILD_TOKEN.address)).to.be.true;
            //expect(await METADAO.whitelist(ONE_ADDRESS)).to.equal(AMOR_TOKEN.address);
            //expect(await METADAO.whitelist(AMOR_TOKEN.address)).to.equal(USDC.address);
            //expect(await METADAO.whitelist(USDC.address)).to.equal(AMOR_GUILD_TOKEN.address);
            //expect(await METADAO.whitelist(AMOR_GUILD_TOKEN.address)).to.equal(ONE_ADDRESS);
        });

        it('Should fail if not called by admin', async function () {
            //await expect(METADAO.connect(user1).addWhitelist(USDC.address)).to.be.revertedWith("AccessControl");
        });
    });

    context('function: donate()', () => {
        it('it succeeds if tokens are successfully donated to the metadao', async function () {
            //await AMOR_TOKEN.approve(METADAO.address, ONE_HUNDRED_ETHER);
            //await USDC.approve(METADAO.address, ONE_HUNDRED_ETHER);
            //expect(await AMOR_TOKEN.allowance(root.address,METADAO.address) == ONE_HUNDRED_ETHER);
            //await METADAO.connect(root).donate(AMOR_TOKEN.address, ONE_HUNDRED_ETHER);
            //await METADAO.connect(root).donate(USDC.address, ONE_HUNDRED_ETHER);
            //expect(await METADAO.donations(USDC.address)).to.equal((ONE_HUNDRED_ETHER*2).toString());
        });
    });

    context('function: distributeAll()', () => {
        it('it succeeds if amor tokens are distributed to the guild according to guild weight', async function () {
            //let amorBalance = await AMOR_TOKEN.balanceOf(METADAO.address);
            //expect(await AMOR_TOKEN.balanceOf(root.address) > 0);
            //await METADAO.distributeAll();
            //expect(await METADAO.guildFunds(user1.address, AMOR_TOKEN.address)).to.equal((amorBalance/2).toString());
            //expect(await METADAO.guildFunds(user1.address, USDC.address)).to.equal(FIFTY_ETHER);
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