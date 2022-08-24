const { ethers } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");
const init = require('../test-init.js');
const { 
    ONE_HUNDRED_ETHER, FIFTY_ETHER, ONE_ADDRESS
  } = require('../helpers/constants.js');
const { AddressOne } = require("@gnosis.pm/safe-contracts");

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
    });

    context('function: removeGuild()', () => {
        it('it fails to remove guilds if not an admin address', async function () {
            await METADAO.addGuild(user2.address);
            await expect(METADAO.connect(user1).removeGuild(0,user2.address)).
                to.be.revertedWith('AccessControl');
        });

        it('it removes a guild if tx sent by admin', async function () {
            await METADAO.addGuild(user2.address);
            await METADAO.addGuild(user1.address);
            await METADAO.removeGuild(0,user2.address);
            expect(await METADAO.guilds(0)).to.equal(user1.address);  
        });

    });

    context('function: updateGuildWeight()', () => {
        it('it fails to update the weight is msg.sender is not a guild', async function () {
            await expect(METADAO.connect(user2).updateGuildWeight(50)).to.be.reverted;
        });

        it('it successfully updates the weight when a Guild address calls the function', async function () {
            expect(await METADAO.connect(user1).updateGuildWeight(ONE_HUNDRED_ETHER));
        });
    });

    context('function: donate()', () => {
        it('it succeeds if amor token is successfully donated to the metadao', async function () {
            expect(await AMOR_TOKEN.balanceOf(root.address) > 0);
            expect(await AMOR_TOKEN.balanceOf(METADAO.address) == 0);
            await AMOR_TOKEN.connect(root).approve(METADAO.address,1000);
            expect(await AMOR_TOKEN.allowance(root.address,METADAO.address) == 1000);
            await METADAO.connect(root).donate(AMOR_TOKEN.address, 10);
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

    context('function: distribute()', () => {
        it('it succeeds if amor tokens are distributed to the guild according to guild weight', async function () {
            await METADAO.addGuild(user1.address);
            await METADAO.addGuild(user2.address);
            amorBalance = await AMOR_TOKEN.balanceOf(root.address);
            expect(await AMOR_TOKEN.balanceOf(root.address) > 0);
            await AMOR_TOKEN.approve(METADAO.address, ONE_HUNDRED_ETHER);
            await USDC.connect(root).approve(METADAO.address, ONE_HUNDRED_ETHER);
            expect(await AMOR_TOKEN.allowance(root.address, METADAO.address) == ONE_HUNDRED_ETHER);
            await METADAO.donate(AMOR_TOKEN.address, ONE_HUNDRED_ETHER)
            await METADAO.connect(root).donate(USDC.address, ONE_HUNDRED_ETHER)
            expect(await METADAO.connect(user1).updateGuildWeight(ONE_HUNDRED_ETHER));
            expect(await METADAO.connect(user2).updateGuildWeight(ONE_HUNDRED_ETHER));
            await METADAO.distribute();
            let guild1Amor = await METADAO.guildFunds(user1.address, AMOR_TOKEN.address);
            console.log("AMOR: "+guild1Amor);
            let donatedAmor = await METADAO.donations(AMOR_TOKEN.address);
            console.log("Donated AMOR: "+donatedAmor);
            let guildsTotalWeight = await METADAO.guildsTotalWeight();
            console.log("GuildsTotalWeight: "+guildsTotalWeight);
            let guild1Weight = await METADAO.guildWeight(user1.address);
            console.log("Guild 1 Weight: "+guild1Weight);
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
            /// So here you are adding user1.address as a guild controller
            await METADAO.addGuild(user1.address);
            expect(await AMOR_TOKEN.balanceOf(root.address) > 0);
            await AMOR_TOKEN.connect(root).approve(METADAO.address, ONE_HUNDRED_ETHER);
            expect(await AMOR_TOKEN.allowance(root.address, METADAO.address) == ONE_HUNDRED_ETHER);
            /// Here you donate 100 wei
            /// The issue here is that in `donate()` we don't transfer AMOR to `address(this)`
            await METADAO.connect(root).donate(AMOR_TOKEN.address, ONE_HUNDRED_ETHER);
            expect(await METADAO.connect(user1).updateGuildWeight(ONE_HUNDRED_ETHER));
            await METADAO.distribute();
            await METADAO.connect(user1).claim();
            let balanceAMOR = await AMOR_TOKEN.balanceOf(user1.address);
            console.log("AMOR: "+balanceAMOR);
            let balanceUSDC = await(USDC.balanceOf(user1.address));
            console.log("USDC: "+ balanceUSDC);
            expect(await USDC.balanceOf(user1.address)).to.be.equal(FIFTY_ETHER);
        });

    });

});