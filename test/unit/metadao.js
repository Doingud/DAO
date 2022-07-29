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
let METADAO;
let user1;
let user2;
let root;
let multisig;

describe("unit - MetaDao", function () {

    const setupTests = deployments.createFixture(async () => {
      const signers = await ethers.getSigners();
      const setup = await init.initialize(signers);
      ///   Setup token contracts
      await init.getTokens(setup);
      AMOR_TOKEN = setup.tokens.AmorTokenImplementation;
      AMOR_GUILD_TOKEN = setup.tokens.AmorGuildToken;
      FX_AMOR_TOKEN = setup.tokens.FXAMORxGuild;
      DAMOR_GUILD_TOKEN = setup.tokens.dAMORxGuild;
      ///   Setup signer accounts
      root = setup.roles.root;
      multisig = setup.roles.doingud_multisig;    
      user1 = setup.roles.user1;
      user2 = setup.roles.user2;
      ///   Setup the guildfactory contract first
      await init.getGuildFactory(setup);
      ///   Initialize the metadao
      await init.metadao(setup);
      METADAO = setup.metadao;
    });

    before('setup', async function() {
        await setupTests();
    });

    context('Add guilds', () => {
        it('it fails add guilds if not an admin address', async function () {
        
            await expect(METADAO.connect(user1).addGuild(user2.address)).to.be.revertedWith(
                'NOT_ADMIN'
            );
        });

        it('it adds a guild if tx sent by admin', async function () {
            await METADAO.addGuild(user2.address);
            expect(await METADAO.getGuild(0)).to.equal(user2.address); 
        });

    });


    context('Remove guilds', () => {
        it('it fails to remove guilds if not an admin address', async function () {
            await METADAO.addGuild(user2.address);
            await expect(METADAO.connect(user1).removeGuild(0,user2.address)).to.be.revertedWith(
                'NOT_ADMIN'
            );
        });

        it('it removes a guild if tx sent by admin', async function () {
            await METADAO.addGuild(user2.address);
            await METADAO.addGuild(user1.address);
            await METADAO.removeGuild(0,user2.address);
            expect(await METADAO.getGuild(0)).to.equal(user1.address);  
        });

    });


    context('Update Guild Weight', () => {
        it('it fails to update the weight is msg.sender is not a guild', async function () {
            await expect(METADAO.connect(user2).updateGuildWeight(50)).to.be.reverted;
        });

        it('it successfully updates the weight when a Guild address calls the function', async function () {
            await METADAO.addGuild(user1.address);
            await expect(METADAO.connect(user1).updateGuildWeight(20));
    
        });

    });


    context('Donate Amor tokens to metadao', () => {
        it('it fails to update the weight is msg.sender is not a guild', async function () {
            await expect(AMOR_TOKEN.balanceOf(root.address) > 0);
            await AMOR_TOKEN.connect(root).approve(METADAO.address,1000);
            await expect(AMOR_TOKEN.allowance(root.address,METADAO.address) == 1000);
            await METADAO.connect(root).donate(10);
        });


    });

    context('Claim amor tokens from metadao', () => {
        it('it fails to claim if msg.sender is not a guild', async function () {
            await expect(AMOR_TOKEN.balanceOf(root.address) > 0);
            await AMOR_TOKEN.connect(root).approve(METADAO.address,1000);
            await expect(AMOR_TOKEN.allowance(root.address,METADAO.address) == 1000);
            await expect(METADAO.connect(user1).claim()).to.be.reverted;
        });

        it('it succeeds if a guild claims the token according to guildweight', async function () {
            await METADAO.addGuild(user1.address);
            await METADAO.addGuild(user2.address);
            await expect(AMOR_TOKEN.balanceOf(root.address) > 0);
            await AMOR_TOKEN.connect(root).approve(METADAO.address,1000);
            await expect(AMOR_TOKEN.allowance(root.address,METADAO.address) == 1000);
            await METADAO.connect(root).donate(100);
            await expect(METADAO.connect(user1).updateGuildWeight(20));
            await expect(METADAO.connect(user2).updateGuildWeight(30));
            await METADAO.connect(user1).claim();
        });

    });

    context('Distribute Amor tokens from meta dao', () => {
        it('it succeeds if a guild claims the token according to guildweight', async function () {
            await METADAO.addGuild(user1.address);
            await METADAO.addGuild(user2.address);;
            await expect(AMOR_TOKEN.balanceOf(root.address) > 0);
            await AMOR_TOKEN.connect(root).approve(METADAO.address,1000);
            await expect(AMOR_TOKEN.allowance(root.address,METADAO.address) == 1000);
            await METADAO.connect(root).donate(100)
            await expect(METADAO.connect(user1).updateGuildWeight(20));
            await expect(METADAO.connect(user2).updateGuildWeight(30));
            await METADAO.distribute();
        });

    });

});