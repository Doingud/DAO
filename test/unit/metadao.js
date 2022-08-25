const { ethers } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");
const init = require('../test-init.js');
const { 
    ONE_HUNDRED_ETHER,
    FIFTY_ETHER,
    ONE_ADDRESS
  } = require('../helpers/constants.js');

use(solidity);

let AMOR_TOKEN;
let METADAO;
let USDC;
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
      ///   Initialize the metadao
      await init.metadao(setup);
      METADAO = setup.metadao;
    });

    before('setup', async function() {
        await setupTests();
    });

    context('function: addGuild()', () => {
        it('it fails add guilds if not an admin address', async function () {
            await expect(METADAO.connect(user1).addGuild(user2.address)).
                to.be.revertedWith('AccessControl');
        });

        it('it adds a guild if tx sent by admin', async function () {
            await METADAO.addGuild(user2.address);
            expect(await METADAO.guilds(0)).to.equal(user2.address); 
        });

        it('it fails when trying to add the same guild', async function () {
            await expect(METADAO.addGuild(user2.address)).
                to.be.revertedWith("Exists()");
        });
    });

    context('function: removeGuild()', () => {
        it('it fails to remove guilds if not an admin address', async function () {
            await expect(METADAO.connect(user1).removeGuild(0, user2.address)).
                to.be.revertedWith('AccessControl');
        });

        it('it removes a guild if tx sent by admin', async function () {
            await METADAO.addGuild(user1.address);
            await METADAO.removeGuild(0, user2.address);
            expect(await METADAO.guilds(0)).to.equal(user1.address);  
        });
    });

    context('function: updateGuildWeight()', () => {
        it('it fails to update the weight is msg.sender is not a guild', async function () {
            await expect(METADAO.connect(user2).updateGuildWeight(ONE_HUNDRED_ETHER)).to.be.reverted;
        });

        it('it successfully updates the weight when a Guild address calls the function', async function () {
            await METADAO.addGuild(user2.address);
            expect(await METADAO.connect(user1).updateGuildWeight(ONE_HUNDRED_ETHER));
            expect(await METADAO.connect(user2).updateGuildWeight(ONE_HUNDRED_ETHER));
        });
    });

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
            await METADAO.connect(root).donate(USDC.address, ONE_HUNDRED_ETHER)
        });
    });

    context('function: distribute()', () => {
        it('it succeeds if amor tokens are distributed to the guild according to guild weight', async function () {
            let amorBalance = await AMOR_TOKEN.balanceOf(METADAO.address);
            expect(await AMOR_TOKEN.balanceOf(root.address) > 0);
            await METADAO.distribute();
            expect(await METADAO.guildFunds(user1.address, AMOR_TOKEN.address)).to.equal((amorBalance/2).toString());
            expect(await METADAO.guildFunds(user1.address, USDC.address)).to.equal(FIFTY_ETHER);
        });

        it('does not change the allocations if called more than once', async function () {
            let fundsAllocated = await METADAO.guildFunds(user1.address, USDC.address);
            await METADAO.distribute();
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

});