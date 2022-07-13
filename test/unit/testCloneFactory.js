const { ethers } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");
const { TAX_RATE, 
        AMOR_TOKEN_NAME, 
        AMOR_TOKEN_SYMBOL,
        TEST_TRANSFER,
        MOCK_GUILD_NAMES,
        MOCK_GUILD_SYMBOLS 
      } = require('../helpers/constants.js');
const init = require('../test-init.js');

use(solidity);

  let root;
  let multisig;

  let AMOR_TOKEN;
  let AMOR_GUILD_TOKEN;
  let CLONE_FACTORY;
  let GUILD_ONE_AMORXGUILD;
  let GUILD_ONE_DAMORXGUILD;
  let GUILD_ONE_FXAMORXGUILD;
  let GUILD_TWO;

  const TEST_TAX_DEDUCTED_AMOUNT = 95000000000000000000n;
  const TEST_BALANCE_ROOT = 9999900000000000000000000n;

describe("unit - Clone Factory", function () {

  const setupTests = deployments.createFixture(async () => {
    const signers = await ethers.getSigners();
    const setup = await init.initialize(signers);
    await init.getTokens(setup);

    //AMOR_TOKEN = setup.tokens.AmorTokenImplementation;
    AMOR_GUILD_TOKEN = setup.tokens.AmorGuildToken;
    CLONE_FACTORY = setup.tokens.CloneFactoryContract;

    root = setup.roles.root;
    multisig = setup.roles.doingud_multisig;

  });

  before('Setup', async function() {
    await setupTests();
    // await AMOR_TOKEN.init(
    //   AMOR_TOKEN_NAME, 
    //   AMOR_TOKEN_SYMBOL, 
    //   multisig.address, 
    //   TAX_RATE, 
    //   root.address
    // );
  });

  context("function: deployGuildContracts", () => {
      it("Should deploy the Guild Contracts", async function () {
        await CLONE_FACTORY.deployGuildContracts(MOCK_GUILD_NAMES[0],MOCK_GUILD_SYMBOLS[0]);

        let guildOneAmorXGuild = await CLONE_FACTORY.guilds(0);
        let guildOneDAmorXGuild = await CLONE_FACTORY.dAMORxGuildTokens(0);
        let guildOneFXAmorXGuild = await CLONE_FACTORY.fxAMORxGuildTokens(0);
        
        GUILD_ONE_AMORXGUILD = AMOR_GUILD_TOKEN.attach(guildOneAmorXGuild);
        GUILD_ONE_DAMORXGUILD = AMOR_GUILD_TOKEN.attach(guildOneDAmorXGuild);
        GUILD_ONE_FXAMORXGUILD = AMOR_GUILD_TOKEN.attach(guildOneFXAmorXGuild);

        expect(await GUILD_ONE_AMORXGUILD.name()).to.equal("AMORx"+MOCK_GUILD_NAMES[0]);
      });

      it("Should have named the AMORxGuild Token correctly", async function () {
        expect(await GUILD_ONE_AMORXGUILD.name()).to.equal("AMORx"+MOCK_GUILD_NAMES[0]);
      });
      it("Should have named the dAMORxGuild Token correctly", async function () {
        expect(await GUILD_ONE_DAMORXGUILD.name()).to.equal("dAMORx"+MOCK_GUILD_NAMES[0]);
      });
      it("Should have named the FXAMORxGuild Token correctly", async function () {
        expect(await GUILD_ONE_FXAMORXGUILD.name()).to.equal("FXAMORx"+MOCK_GUILD_NAMES[0]);
      });

});
});