const { ethers } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");
const init = require('../test-init.js');

use(solidity);
/*
let AMOR_TOKEN;
let AMOR_GUILD_TOKEN;
let FX_AMOR_TOKEN;
let DAMOR_GUILD_TOKEN;
*/
let METADAO;
let user1;
let user2;
/*
let root;
let multisig;
*/
describe("unit - MetaDao", function () {

    const setupTests = deployments.createFixture(async () => {
      const signers = await ethers.getSigners();
      const setup = await init.initialize(signers);
      ///   Setup token contracts
      await init.getTokens(setup);
      /*
      AMOR_TOKEN = setup.tokens.AmorTokenImplementation;
      AMOR_GUILD_TOKEN = setup.tokens.AmorGuildToken;
      FX_AMOR_TOKEN = setup.tokens.FXAMORxGuild;
      DAMOR_GUILD_TOKEN = setup.tokens.dAMORxGuild;
      
      ///   Setup signer accounts
      root = setup.roles.root;
      multisig = setup.roles.doingud_multisig;
      */
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

    });


    

});