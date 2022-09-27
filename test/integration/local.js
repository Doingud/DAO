const { ethers } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");
const { MOCK_GUILD_NAMES,
        MOCK_GUILD_SYMBOLS, 
        TEST_TRANSFER,
        AMOR_TOKEN_NAME,
        AMOR_TOKEN_SYMBOL,
        TAX_RATE,
        GAURDIAN_THRESHOLD,
        BASIS_POINTS,
        FIFTY_ETHER,
        ONE_ADDRESS,
        ONE_HUNDRED_ETHER
      } = require('../helpers/constants.js');
const init = require('../test-init.js');
const ether = require("@openzeppelin/test-helpers/src/ether.js");
const { getSqrt } = require("../helpers/helpers.js");
const { time } = require("@openzeppelin/test-helpers");

use(solidity);

/// The users
let root;
let multisig;
let user1;
let user2;
let user3; 
let staker;

/// The implementation contracts
let AMOR_TOKEN;
let AMOR_GUILD_TOKEN;
let CLONE_FACTORY;
let FX_AMOR_TOKEN;
let DAMOR_GUILD_TOKEN;
let CONTROLLERXGUILD;
let GOVERNORXGUILD;
let AVATARXGUILD;
let VESTING;
let ERC20_TOKEN;
let AMOR_TOKEN_UPGRADE;

/// The proxy for AMOR token
let amor_proxy;
let amor_guild_token_proxy;

/// The MetaDao Proxy Tokens
let DOINGUD_AMOR_TOKEN;
let DOINGUD_AMOR_GUILD_TOKEN;
let DOINGUD_DAMOR;
let DOINGUD_FXAMOR;

/// The MetaDao Control Structures
let METADAO;
let DOINGUD_CONTROLLER;
let DOINGUD_GOVERNOR;
let DOINGUD_AVATAR;
let DOINGUD_METADAO;

/// The Newly Deployed Guilds
let GUILD_ONE_AMORXGUILD;
let GUILD_ONE_DAMORXGUILD;
let GUILD_ONE_FXAMORXGUILD;
let GUILD_ONE_CONTROLLERXGUILD;
let GUILD_ONE_AVATARXGUILD;
let GUILD_ONE_GOVERNORXGUILD;

let GUILD_TWO_AMORXGUILD;
let GUILD_TWO_DAMORXGUILD;
let GUILD_TWO_FXAMORXGUILD;
let GUILD_TWO_CONTROLLERXGUILD;
let GUILD_TWO_AVATARXGUILD;
let GUILD_TWO_GOVERNORXGUILD;

/// Required variables
let IMPACT_MAKERS;
let IMPACT_MAKERS_WEIGHTS;

describe("Integration Tests", function () {

const setupTests = deployments.createFixture(async () => {
  const signers = await ethers.getSigners();
  const setup = await init.initialize(signers);
  await init.getTokens(setup);

  root = setup.roles.root;
  multisig = setup.roles.doingud_multisig;
  user1 = setup.roles.user1;
  user2 = setup.roles.user2;
  user3 = setup.roles.user3;
  staker = setup.roles.staker;

  ///   DOINGUD ECOSYSTEM DEPLOYMENT
  ///   STEP 1: Deploy token implementations
  AMOR_TOKEN = setup.tokens.AmorTokenImplementation;
  AMOR_TOKEN_UPGRADE = setup.tokens.AmorTokenMockUpgrade;
  AMOR_GUILD_TOKEN = setup.tokens.AmorGuildToken;
  FX_AMOR_TOKEN = setup.tokens.FXAMORxGuild;
  DAMOR_GUILD_TOKEN = setup.tokens.dAMORxGuild;
  ERC20_TOKEN = setup.tokens.ERC20Token;

  ///   STEP 2: Deploy DoinGud Control Structures
  await init.metadao(setup);
  await init.controller(setup);
  await init.avatar(setup);
  await init.governor(setup);

  CONTROLLERXGUILD = setup.controller;
  GOVERNORXGUILD = setup.governor;
  AVATARXGUILD = setup.avatars.avatar;
  METADAO = setup.metadao;

  ///   STEP 3: Deploy the proxies for the tokens and the control structures
  ///   `amor_proxy` is declared earlier to allow upgrade testing
  amor_proxy = await init.proxy();
  /// For testing we need to use proxy address of the implementation contract
  setup.amor_storage = amor_proxy;
  let amor_guild_token_proxy = await init.proxy();
  setup.amorxGuild_storage = amor_guild_token_proxy;
  let dAmor_proxy = await init.proxy();
  let fxAmor_proxy = await init.proxy();
  let controller_proxy = await init.proxy();
  let avatar_proxy = await init.proxy();
  let governor_proxy = await init.proxy();
  let metadao_proxy = await init.proxy();

  ///   STEP 4: Init the proxies to point to the correct implementation addresses
  await amor_proxy.initProxy(AMOR_TOKEN.address);
  await amor_guild_token_proxy.initProxy(AMOR_GUILD_TOKEN.address);
  await dAmor_proxy.initProxy(DAMOR_GUILD_TOKEN.address);
  await fxAmor_proxy.initProxy(FX_AMOR_TOKEN.address);
  await controller_proxy.initProxy(CONTROLLERXGUILD.address);
  await avatar_proxy.initProxy(AVATARXGUILD.address);
  await governor_proxy.initProxy(GOVERNORXGUILD.address);
  await metadao_proxy.initProxy(METADAO.address);
  
  ///   STEP 5: Init the storage of the tokens and control contracts
  DOINGUD_AMOR_TOKEN = AMOR_TOKEN.attach(amor_proxy.address);
  DOINGUD_AMOR_GUILD_TOKEN = AMOR_GUILD_TOKEN.attach(amor_guild_token_proxy.address);
  DOINGUD_DAMOR = DAMOR_GUILD_TOKEN.attach(dAmor_proxy.address);
  DOINGUD_FXAMOR = FX_AMOR_TOKEN.attach(fxAmor_proxy.address);
  DOINGUD_AVATAR = AVATARXGUILD.attach(avatar_proxy.address);
  DOINGUD_CONTROLLER = CONTROLLERXGUILD.attach(controller_proxy.address);
  DOINGUD_GOVERNOR = GOVERNORXGUILD.attach(governor_proxy.address);
  DOINGUD_METADAO = METADAO.attach(metadao_proxy.address);

  setup.metadao = DOINGUD_METADAO;

  await init.getGuildFactory(setup);
  await init.vestingContract(setup);
  CLONE_FACTORY = setup.factory;

  await DOINGUD_AMOR_TOKEN.init(
    AMOR_TOKEN_NAME, 
    AMOR_TOKEN_SYMBOL, 
    DOINGUD_METADAO.address, //taxController
    TAX_RATE,
    setup.roles.root.address
  );

  await DOINGUD_AMOR_GUILD_TOKEN.init(
    'AMORxMETADAO', 
    'AMORxG',
    DOINGUD_AMOR_TOKEN.address,
    DOINGUD_CONTROLLER.address
  );

  await DOINGUD_DAMOR.init(
    "DoinGud dAMOR", 
    "DAMOR", 
    setup.roles.operator.address, 
    DOINGUD_AMOR_GUILD_TOKEN.address, 
    GAURDIAN_THRESHOLD
  );

  await DOINGUD_FXAMOR.init(
    "DoinGud FXAMOR", 
    "FXAMOR", 
    DOINGUD_CONTROLLER.address, //controller
    DOINGUD_AMOR_GUILD_TOKEN.address
  );

  await DOINGUD_CONTROLLER.init(
    setup.roles.root.address, // owner
    DOINGUD_AMOR_TOKEN.address,
    DOINGUD_AMOR_GUILD_TOKEN.address, // AMORxGuild
    DOINGUD_FXAMOR.address, // FXAMORxGuild
    DOINGUD_METADAO.address, // MetaDaoController
    setup.roles.root.address // the multisig address of the MetaDAO, which owns the token
  );

  await DOINGUD_AVATAR.init(
    setup.roles.root.address, // owner
    DOINGUD_GOVERNOR.address // governor Address
  );

  await DOINGUD_GOVERNOR.init(
    "DoinGud Governor",
    DOINGUD_AMOR_GUILD_TOKEN.address, //AMORxGuild
    setup.roles.authorizer_adaptor.address, // Snapshot Address
    DOINGUD_AVATAR.address // Avatar Address
  );

  await DOINGUD_METADAO.init(
    DOINGUD_AMOR_TOKEN.address,
    CLONE_FACTORY.address,
    root.address
  );

  /// Setup the Impact Makers for the GuildController
  IMPACT_MAKERS = [user2.address, user3.address, staker.address];
  IMPACT_MAKERS_WEIGHTS = [20, 20, 60];
  await DOINGUD_CONTROLLER.setImpactMakers(IMPACT_MAKERS, IMPACT_MAKERS_WEIGHTS);

  /// Setup the first two Guilds
  await DOINGUD_METADAO.createGuild(user1.address, MOCK_GUILD_NAMES[0], MOCK_GUILD_SYMBOLS[0]);
  let AmorxOne = await CLONE_FACTORY.amorxGuildTokens(0);
  let DAmorxOne = await CLONE_FACTORY.guildComponents(AmorxOne, 0);
  let FXAmorxOne = await CLONE_FACTORY.guildComponents(AmorxOne, 1);
  let ControllerxOne = await CLONE_FACTORY.guildComponents(AmorxOne, 2);
  let GovernorxOne = await CLONE_FACTORY.guildComponents(AmorxOne, 3);
  let AvatarxOne = await CLONE_FACTORY.guildComponents(AmorxOne, 4);

  GUILD_ONE_AMORXGUILD = AMOR_GUILD_TOKEN.attach(AmorxOne);
  GUILD_ONE_DAMORXGUILD = DAMOR_GUILD_TOKEN.attach(DAmorxOne);
  GUILD_ONE_FXAMORXGUILD = FX_AMOR_TOKEN.attach(FXAmorxOne);
  GUILD_ONE_CONTROLLERXGUILD = CONTROLLERXGUILD.attach(ControllerxOne);
  GUILD_ONE_GOVERNORXGUILD = GOVERNORXGUILD.attach(GovernorxOne);
  GUILD_ONE_AVATARXGUILD = AVATARXGUILD.attach(AvatarxOne);

  await DOINGUD_METADAO.createGuild(user1.address, MOCK_GUILD_NAMES[1], MOCK_GUILD_SYMBOLS[1]);
  let AmorxTwo = await CLONE_FACTORY.amorxGuildTokens(1);
  let DAmorxTwo = await CLONE_FACTORY.guildComponents(AmorxTwo, 0);
  let FXAmorxTwo = await CLONE_FACTORY.guildComponents(AmorxTwo, 1);
  let ControllerxTwo = await CLONE_FACTORY.guildComponents(AmorxTwo, 2);
  let GovernorxTwo = await CLONE_FACTORY.guildComponents(AmorxTwo, 3);
  let AvatarxTwo = await CLONE_FACTORY.guildComponents(AmorxTwo, 4);

  GUILD_TWO_AMORXGUILD = AMOR_GUILD_TOKEN.attach(AmorxTwo);
  GUILD_ONE_DAMORXGUILD = DAMOR_GUILD_TOKEN.attach(DAmorxTwo);
  GUILD_TWO_FXAMORXGUILD = FX_AMOR_TOKEN.attach(FXAmorxTwo);
  GUILD_TWO_CONTROLLERXGUILD = CONTROLLERXGUILD.attach(ControllerxTwo);
  GUILD_TWO_GOVERNORXGUILD = GOVERNORXGUILD.attach(GovernorxTwo);
  GUILD_TWO_AVATARXGUILD = AVATARXGUILD.attach(AvatarxTwo);

  /// Setup the initial Fee Index
  const abi = ethers.utils.defaultAbiCoder;
  let encodedIndex = abi.encode(
      ["tuple(address, uint256)"],
      [
      [GUILD_ONE_CONTROLLERXGUILD.address, 100]
      ]
  );
  let encodedIndex2 = abi.encode(
      ["tuple(address, uint256)"],
      [
      [GUILD_TWO_CONTROLLERXGUILD.address, 100]
      ]
  );

  await DOINGUD_METADAO.updateIndex([encodedIndex, encodedIndex2], 0);

});

    beforeEach('setup', async function() {
        await setupTests();
    });

    context("Setup the implementation contracts", () => {
        it("Should transfer AMOR between addresses", async function () {
            const taxDeducted = TEST_TRANSFER*(TAX_RATE/BASIS_POINTS)

            await expect(DOINGUD_AMOR_TOKEN.transfer(user1.address, TEST_TRANSFER)).
                to.emit(DOINGUD_AMOR_TOKEN, "Transfer").
                    withArgs(root.address, user1.address, (TEST_TRANSFER-taxDeducted).toString());
        });

        it("Should accrue taxes correctly", async function () {
            const taxDeducted = TEST_TRANSFER*(TAX_RATE/BASIS_POINTS)
            await DOINGUD_AMOR_TOKEN.transfer(user1.address, TEST_TRANSFER);

            expect(await DOINGUD_AMOR_TOKEN.balanceOf(DOINGUD_METADAO.address)).to.equal(taxDeducted.toString());
            expect(await DOINGUD_AMOR_TOKEN.balanceOf(user1.address)).to.equal(((TEST_TRANSFER - taxDeducted).toString()));
        });
    });

    context("Donate AMOR to the Guild", () => {
      it("Should allow a user to donate AMOR to the GuildController", async function () {
        await DOINGUD_AMOR_TOKEN.transfer(user1.address, TEST_TRANSFER);
        await DOINGUD_AMOR_TOKEN.connect(user1).approve(DOINGUD_CONTROLLER.address, TEST_TRANSFER);
        await expect(DOINGUD_CONTROLLER.connect(user1).donate(FIFTY_ETHER, DOINGUD_AMOR_TOKEN.address)).
          to.emit(DOINGUD_AMOR_TOKEN, "Transfer").
            to.emit(DOINGUD_FXAMOR, "Transfer");

        await expect(DOINGUD_CONTROLLER.connect(user2).claim(user2.address, [DOINGUD_AMOR_TOKEN.address])).
          to.emit(DOINGUD_AMOR_TOKEN, "Transfer");

        expect(await DOINGUD_AMOR_TOKEN.balanceOf(user2.address)).to.equal((FIFTY_ETHER * 0.9 * 0.2 * 0.95).toString());
      });
    });

    context('Donate to the MetaDao', () => {
      it("Should allow a user to donate to the MetaDao", async function () {
        await DOINGUD_METADAO.addWhitelist(ERC20_TOKEN.address);
        await ERC20_TOKEN.approve(DOINGUD_METADAO.address, ONE_HUNDRED_ETHER);
        await DOINGUD_METADAO.donate(ERC20_TOKEN.address, FIFTY_ETHER, 0);
        await GUILD_ONE_CONTROLLERXGUILD.gatherDonation(ERC20_TOKEN.address);
        expect(await ERC20_TOKEN.balanceOf(GUILD_ONE_CONTROLLERXGUILD.address)).to.equal((FIFTY_ETHER/2).toString());
      });
    });

    context('Donate with custom index', () => {
      it("Should allow a user to set their own index", async function () {
        const abi = ethers.utils.defaultAbiCoder;
        let encodedIndex = abi.encode(
            ["tuple(address, uint256)"],
            [
            [GUILD_ONE_CONTROLLERXGUILD.address, 50]
            ]
        );
        let encodedIndex2 = abi.encode(
            ["tuple(address, uint256)"],
            [
            [GUILD_TWO_CONTROLLERXGUILD.address, 100]
            ]
        );
        await DOINGUD_METADAO.addIndex([encodedIndex, encodedIndex2]);
        let newIndex = await DOINGUD_METADAO.indexHashes(1);
        let indexDetails = await DOINGUD_METADAO.indexes(newIndex);
        expect(indexDetails.indexDenominator).to.equal(150);
      });

      it("Should allow a user to donate ERC20 tokens according to the custom index", async function () {
        const abi = ethers.utils.defaultAbiCoder;
        let encodedIndex = abi.encode(
            ["tuple(address, uint256)"],
            [
            [GUILD_ONE_CONTROLLERXGUILD.address, 100]
            ]
        );
        let encodedIndex2 = abi.encode(
            ["tuple(address, uint256)"],
            [
            [GUILD_TWO_CONTROLLERXGUILD.address, 150]
            ]
        );

        await DOINGUD_METADAO.addWhitelist(ERC20_TOKEN.address);
        await DOINGUD_METADAO.addIndex([encodedIndex, encodedIndex2]);
        await ERC20_TOKEN.approve(DOINGUD_METADAO.address, ONE_HUNDRED_ETHER);
        await DOINGUD_METADAO.donate(ERC20_TOKEN.address, FIFTY_ETHER, 1);
        await GUILD_TWO_CONTROLLERXGUILD.gatherDonation(ERC20_TOKEN.address);
        expect(await ERC20_TOKEN.balanceOf(GUILD_TWO_CONTROLLERXGUILD.address)).to.equal((FIFTY_ETHER*150/250).toString());
      });
    });

    context("Change the AMOR implementation address", () => {
      it("Should allow the owner to change the implementation address", async function () {
        await expect(amor_proxy.upgradeImplementation(AMOR_TOKEN_UPGRADE.address))
          .to.emit(amor_proxy, "Upgraded")
            .withArgs(AMOR_TOKEN_UPGRADE.address);

        /// Assert that the AMOR Token and the amor_proxy reference the same address
        expect(await DOINGUD_AMOR_TOKEN.address).to.equal(amor_proxy.address);
        
        /// Let user 1 stake AMOR into AMORxOne
        await DOINGUD_AMOR_TOKEN.transfer(user1.address, ONE_HUNDRED_ETHER);
        await DOINGUD_AMOR_TOKEN.connect(user1).approve(GUILD_ONE_AMORXGUILD.address, FIFTY_ETHER);
        await GUILD_ONE_AMORXGUILD.connect(user1).stakeAmor(user1.address, FIFTY_ETHER);

        /// Let the guilds gather fees
        expect(await DOINGUD_METADAO.guildFees(GUILD_ONE_CONTROLLERXGUILD.address)).to.be.equal(0);
        await DOINGUD_METADAO.distributeFees();
        await expect(DOINGUD_METADAO.claimFees(GUILD_ONE_CONTROLLERXGUILD.address)).to.emit(DOINGUD_AMOR_TOKEN, "Transfer");
      });
    })

    context("Stake AMOR to receive AMORxGuild", () => {
      it("Should allow a user to stake AMOR to receive AMORxGuild", async function () {
        /// Transfer AMOR to user 1
        await DOINGUD_AMOR_TOKEN.transfer(user1.address, ONE_HUNDRED_ETHER);
        /// Connect User 1 and stake AMOR
        await DOINGUD_AMOR_TOKEN.connect(user1).approve(GUILD_ONE_AMORXGUILD.address, FIFTY_ETHER);
        await GUILD_ONE_AMORXGUILD.connect(user1).stakeAmor(user1.address, FIFTY_ETHER);
        /// AMORxGuild = (sqrt(stakedAMOR+tobestakedAMOR) - sqrt(stakedAMOR))
        let expectedAmorxGuild = ethers.BigNumber.from(getSqrt(ethers.BigNumber.from((FIFTY_ETHER*0.95).toString())));
        expect(await GUILD_ONE_AMORXGUILD.balanceOf(user1.address)).to.equal(ethers.BigNumber.from(expectedAmorxGuild).mul(10**9));
      });

      it("Should allow a user to stake AMORxGuild and receive dAMORxGuild", async function () {
        /// Transfer AMOR to user 1
        await DOINGUD_AMOR_TOKEN.transfer(user1.address, ONE_HUNDRED_ETHER);
        /// Connect User 1 and stake AMOR
        await DOINGUD_AMOR_TOKEN.connect(user1).approve(GUILD_ONE_AMORXGUILD.address, FIFTY_ETHER);
        await GUILD_ONE_AMORXGUILD.connect(user1).stakeAmor(user1.address, FIFTY_ETHER);
        /// Stake AMORxONE to receive dAMORxONE
        let amountAmorxOne = await GUILD_ONE_AMORXGUILD.balanceOf(user1.address);
        await GUILD_ONE_AMORXGUILD.connect(user1).approve(GUILD_ONE_DAMORXGUILD.address, amountAmorxOne);
        let oneYear = await time.duration.years(1);
        console.log(amountAmorxOne.toString());
        await GUILD_ONE_DAMORXGUILD.connect(user1).stake(ethers.BigNumber.from(amountAmorxOne.toString()), oneYear.toString());
        
      });
    });

});