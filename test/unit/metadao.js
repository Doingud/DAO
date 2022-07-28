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
      await init.getTokens(setup);
  
      AMOR_TOKEN = setup.tokens.AmorTokenImplementation;
      AMOR_GUILD_TOKEN = setup.tokens.AmorGuildToken;
      FX_AMOR_TOKEN = setup.tokens.FXAMORxGuild;
      DAMOR_GUILD_TOKEN = setup.tokens.dAMORxGuild;
      root = setup.roles.root;
      multisig = setup.roles.doingud_multisig;    
      user1 = setup.roles.user1;
      user2 = setup.roles.user2;

      await init.getGuildFactory(setup);
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