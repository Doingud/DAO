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
  let VESTING;

describe("unit - Vesting", function () {

  const setupTests = deployments.createFixture(async () => {
    const signers = await ethers.getSigners();
    const setup = await init.initialize(signers);
    await init.getTokens(setup);

    AMOR_TOKEN = setup.tokens.AmorTokenImplementation;
    AMOR_GUILD_TOKEN = setup.tokens.AmorGuildToken;
    FX_AMOR_TOKEN = setup.tokens.FXAMORxGuild;
    DAMOR_GUILD_TOKEN = setup.tokens.dAMORxGuild;
    CLONE_FACTORY = await init.guildFactory(setup);

    root = setup.roles.root;
    multisig = setup.roles.doingud_multisig;

    VESTING = await init.vestingContract(setup);

  });

  before('Setup', async function() {
    await setupTests();

    await CLONE_FACTORY.deployGuildContracts(MOCK_GUILD_NAMES[0],MOCK_GUILD_SYMBOLS[0]);

    this.guildOneAmorXGuild = await CLONE_FACTORY.guilds(0);
    this.guildOneDAmorXGuild = await CLONE_FACTORY.dAMORxGuildTokens(0);
    this.guildOneFXAmorXGuild = await CLONE_FACTORY.fxAMORxGuildTokens(0);
    
    GUILD_ONE_AMORXGUILD = AMOR_GUILD_TOKEN.attach(this.guildOneAmorXGuild);
    GUILD_ONE_DAMORXGUILD = DAMOR_GUILD_TOKEN.attach(this.guildOneDAmorXGuild);
    GUILD_ONE_FXAMORXGUILD = FX_AMOR_TOKEN.attach(this.guildOneFXAmorXGuild);

  });

  context("function: deployGuildContracts", () => {
      it("Should deploy the Guild Token Contracts", async function () {
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

      it("Should have named the AMORxGuild Symbol correctly", async function () {
        expect(await GUILD_ONE_AMORXGUILD.symbol()).to.equal("Ax"+MOCK_GUILD_SYMBOLS[0]);
      });
      it("Should have named the dAMORxGuild Symbol correctly", async function () {
        expect(await GUILD_ONE_DAMORXGUILD.symbol()).to.equal("Dx"+MOCK_GUILD_SYMBOLS[0]);
      });
      it("Should have named the FXAMORxGuild Symbol correctly", async function () {
        expect(await GUILD_ONE_FXAMORXGUILD.symbol()).to.equal("FXx"+MOCK_GUILD_SYMBOLS[0]);
      });

  });

  context("function: amorToken()", ()=> {
    it("Should return the AMOR token address", async function () {
      expect(await CLONE_FACTORY.amorToken()).to.equal(AMOR_TOKEN.address);
    })
  });

  context("function: amorxGuildToken()", ()=> {
    it("Should return the AMORxGuild implementation address", async function () {
      expect(await CLONE_FACTORY.amorxGuildToken()).to.equal(AMOR_GUILD_TOKEN.address);
    })
  });

  context("function: fxAMORxGuildToken()", ()=> {
    it("Should return the FXAMORxGuild implementation address", async function () {
      expect(await CLONE_FACTORY.fxAMORxGuildToken()).to.equal(FX_AMOR_TOKEN.address);
    })
  });

  context("function: dAMORxGuildToken()", ()=> {
    it("Should return the dAMORxGuild implementation address", async function () {
      expect(await CLONE_FACTORY.dAMORxGuildToken()).to.equal(DAMOR_GUILD_TOKEN.address);
    })
  });

  context("function: guilds()", () => {
    it("Should return the guild address", async function () {
      expect(await CLONE_FACTORY.guilds(0)).to.equal(GUILD_ONE_AMORXGUILD.address);
    });

    it("Should not return an address outside the array range", async function () {
      await expect(CLONE_FACTORY.guilds(2)).to.be.revertedWith(null);
    });
  })

  context("function: fxAMORxGuildTokens()", () => {
    it("Should return the FX Token address", async function () {
      expect(await CLONE_FACTORY.fxAMORxGuildTokens(0)).to.equal(GUILD_ONE_FXAMORXGUILD.address);
    });

    it("Should not return an address outside the array range", async function () {
      await expect(CLONE_FACTORY.fxAMORxGuildTokens(2)).to.be.revertedWith(null);
    });
  })

  context("function: dAMORxGuildTokens()", () => {
    it("Should return the dAMORxGuild Token address", async function () {
      expect(await CLONE_FACTORY.dAMORxGuildTokens(0)).to.equal(GUILD_ONE_DAMORXGUILD.address);
    });

    it("Should not return an address outside the array range", async function () {
      await expect(CLONE_FACTORY.dAMORxGuildTokens(2)).to.be.revertedWith(null);
    });
  })

});