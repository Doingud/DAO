const { ethers } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");
const init = require('../test-init.js');
const { 
    ONE_HUNDRED_ETHER,
    FIFTY_ETHER,
    ONE_ADDRESS,
    MOCK_GUILD_NAMES,
    MOCK_GUILD_SYMBOLS,
    ZERO_ADDRESS,
    BASIS_POINTS,
    TAX_RATE,
    GAURDIAN_THRESHOLD,
    AMOR_TOKEN_NAME, 
    AMOR_TOKEN_SYMBOL,
    MOCK_TEST_AMOUNT,
    TEST_TRANSFER
  } = require('../helpers/constants.js');
const { time } = require("@openzeppelin/test-helpers");

use(solidity);

let AMOR_TOKEN;
let AMOR_GUILD_TOKEN;
let FX_AMOR_TOKEN;
let DAMOR_GUILD_TOKEN;
let METADAO;
let USDC;

let user1;
let user2;
let staker;
let operator;
let authorizer_adaptor;

let CONTROLLER;
let FACTORY;
let CLONE_FACTORY;
let AVATAR;
let GOVERNOR;
let GUILD_CONTROLLER_ONE;
let GUILD_CONTROLLER_TWO;

let MOCK_MODULE;

let GUILD_ONE_AMORXGUILD;
let GUILD_ONE_DAMORXGUILD;
let GUILD_ONE_FXAMORXGUILD;
let GUILD_ONE_CONTROLLERXGUILD;
let GUILD_ONE_GOVERNORXGUILD;
let GUILD_ONE_AVATARXGUILD;

let encodedIndex;
let encodedIndex2;

let targets;
let values;
let calldatas;
let firstProposalId;
//const FEE_INDEX = ethers.utils.keccak256(toUtf8Bytes("FEE_INDEX"));


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
let DOINGUD_CONTROLLER;
let DOINGUD_GOVERNOR;
let DOINGUD_AVATAR;
let DOINGUD_METADAO;


let GUILD_TWO_CONTROLLERXGUILD;
/*  The below variables are required in later integration
let GUILD_TWO_AMORXGUILD;
let GUILD_TWO_DAMORXGUILD;
let GUILD_TWO_FXAMORXGUILD;
let GUILD_TWO_AVATARXGUILD;
let GUILD_TWO_GOVERNORXGUILD;
*/

/// Required variables
let IMPACT_MAKERS;
let IMPACT_MAKERS_WEIGHTS;

describe("Integration: DoinGud guilds ecosystem", function () {

    const setupTests = deployments.createFixture(async () => {
        const signers = await ethers.getSigners();
        const setup = await init.initialize(signers);
        ///   Setup token contracts
        await init.getTokens(setup);
        ///   DOINGUD ECOSYSTEM DEPLOYMENT
        ///   STEP 1: Deploy token implementations
        AMOR_TOKEN = setup.tokens.AmorTokenImplementation;
        AMOR_TOKEN_UPGRADE = setup.tokens.AmorTokenMockUpgrade;
        AMOR_GUILD_TOKEN = setup.tokens.AmorGuildToken;
        FX_AMOR_TOKEN = setup.tokens.FXAMORxGuild;
        DAMOR_GUILD_TOKEN = setup.tokens.dAMORxGuild;
        ERC20_TOKEN = setup.tokens.ERC20Token;
        USDC = setup.tokens.ERC20Token;

        ///   Setup signer accounts
        root = setup.roles.root;
        multisig = setup.roles.doingud_multisig;    
        user1 = setup.roles.user1;
        user2 = setup.roles.user2;
        user3 = setup.roles.user3;
        pool = setup.roles.pool;
        staker = setup.roles.staker;
        operator = setup.roles.operator;
        authorizer_adaptor = setup.roles.authorizer_adaptor;

        ///   STEP 2: Deploy DoinGud Control Structures
        await init.metadao(setup);
        await init.controller(setup);
        await init.avatar(setup);
        await init.governor(setup);

        CONTROLLER = setup.controller;
        GOVERNOR = setup.governor;
        AVATAR = setup.avatars.avatar;
        METADAO = setup.metadao;

        MOCK_MODULE = setup.avatars.module;

///   STEP 3: Deploy the proxies for the tokens and the control structures
  ///   `amor_proxy` is declared earlier to allow upgrade testing
  amor_proxy = await init.proxy();
  /// For testing we need to use proxy address of the implementation contract
  setup.amor_storage = amor_proxy;
  amor_guild_token_proxy = await init.proxy();
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
  await controller_proxy.initProxy(CONTROLLER.address);
  await avatar_proxy.initProxy(AVATAR.address);
  await governor_proxy.initProxy(GOVERNOR.address);
  await metadao_proxy.initProxy(METADAO.address);
  
  ///   STEP 5: Init the storage of the tokens and control contracts
  DOINGUD_AMOR_TOKEN = AMOR_TOKEN.attach(amor_proxy.address);
  DOINGUD_AMOR_GUILD_TOKEN = AMOR_GUILD_TOKEN.attach(amor_guild_token_proxy.address);
  DOINGUD_DAMOR = DAMOR_GUILD_TOKEN.attach(dAmor_proxy.address);
  DOINGUD_FXAMOR = FX_AMOR_TOKEN.attach(fxAmor_proxy.address);
  DOINGUD_AVATAR = AVATAR.attach(avatar_proxy.address);
  DOINGUD_CONTROLLER = CONTROLLER.attach(controller_proxy.address);
  DOINGUD_GOVERNOR = GOVERNOR.attach(governor_proxy.address);
  DOINGUD_METADAO = METADAO.attach(metadao_proxy.address);

  setup.metadao = DOINGUD_METADAO;

  await init.getGuildFactory(setup);
  await init.vestingContract(setup);
  CLONE_FACTORY = setup.factory.guildFactory;
  VESTING = setup.vesting;

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
  GUILD_ONE_CONTROLLERXGUILD = CONTROLLER.attach(ControllerxOne);
  GUILD_ONE_GOVERNORXGUILD = GOVERNOR.attach(GovernorxOne);
  GUILD_ONE_AVATARXGUILD = AVATAR.attach(AvatarxOne);

  await DOINGUD_METADAO.createGuild(user1.address, MOCK_GUILD_NAMES[1], MOCK_GUILD_SYMBOLS[1]);
  let AmorxTwo = await CLONE_FACTORY.amorxGuildTokens(1);
  let ControllerxTwo = await CLONE_FACTORY.guildComponents(AmorxTwo, 2);
  /* The below objects are required in later integration testing PRs
  let DAmorxTwo = await CLONE_FACTORY.guildComponents(AmorxTwo, 0);
  let FXAmorxTwo = await CLONE_FACTORY.guildComponents(AmorxTwo, 1);
  let GovernorxTwo = await CLONE_FACTORY.guildComponents(AmorxTwo, 3);
  let AvatarxTwo = await CLONE_FACTORY.guildComponents(AmorxTwo, 4);
  */

  GUILD_TWO_CONTROLLERXGUILD = CONTROLLER.attach(ControllerxTwo);
  /* The below GUILD_TWO objects will be required later on
  GUILD_TWO_AMORXGUILD = AMOR_GUILD_TOKEN.attach(AmorxTwo);
  GUILD_TWO_DAMORXGUILD = DAMOR_GUILD_TOKEN.attach(DAmorxTwo);
  GUILD_TWO_FXAMORXGUILD = FX_AMOR_TOKEN.attach(FXAmorxTwo);
  GUILD_TWO_GOVERNORXGUILD = GOVERNORXGUILD.attach(GovernorxTwo);
  GUILD_TWO_AVATARXGUILD = AVATARXGUILD.attach(AvatarxTwo);
  */

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

        // /// Setup the MetaDao first
        // await init.metadao(setup);
        // METADAO = setup.metadao;
        // TEST_ZERO_METADAO = setup.metadao;
        // ///   Setup the Controller
        // await init.controller(setup);
        // CONTROLLER = setup.controller;

        // await init.avatar(setup);
        // AVATAR = setup.avatars.avatar;
        // MOCK_MODULE = setup.avatars.module;
        // GOVERNOR = await init.governor(setup);
        // ///   Setup the guild factory
        // await init.getGuildFactory(setup);
        // FACTORY = setup.factory.guildFactory;

        // await METADAO.init(AMOR_TOKEN.address, FACTORY.address);


    });

    beforeEach('setup', async function() {
        await setupTests();
        // await AMOR_TOKEN.approve(AMOR_GUILD_TOKEN.address, MOCK_TEST_AMOUNT);

        // /// Setup the guilds through the METADAO
        // await METADAO.createGuild(user2.address, MOCK_GUILD_NAMES[0], MOCK_GUILD_SYMBOLS[0]);
        // await METADAO.createGuild(user1.address, MOCK_GUILD_NAMES[1], MOCK_GUILD_SYMBOLS[1]);
        // GUILD_CONTROLLER_ONE = await METADAO.guilds(ONE_ADDRESS);
        // GUILD_CONTROLLER_ONE = CONTROLLER.attach(GUILD_CONTROLLER_ONE);
        // GUILD_CONTROLLER_TWO = await METADAO.guilds(GUILD_CONTROLLER_ONE.address);
        // GUILD_CONTROLLER_TWO = CONTROLLER.attach(GUILD_CONTROLLER_TWO);

        // await METADAO.addWhitelist(USDC.address);
        // await AMOR_TOKEN.approve(METADAO.address, ONE_HUNDRED_ETHER);
        // await USDC.approve(METADAO.address, ONE_HUNDRED_ETHER);
        // const abi = ethers.utils.defaultAbiCoder;
        // encodedIndex = abi.encode(
        //     ["tuple(address, uint256)"],
        //     [
        //     [GUILD_CONTROLLER_ONE.address, 100]
        //     ]
        // );
        // encodedIndex2 = abi.encode(
        //     ["tuple(address, uint256)"],
        //     [
        //     [GUILD_CONTROLLER_TWO.address, 100]
        //     ]
        // );

        // await METADAO.updateIndex([encodedIndex, encodedIndex2], 0);
    });

    context('» Tests with MetaDAO', () => {

        it("Creation of the guild independently out of MetaDAO", async function () {
            // Call deployGuildContracts at the GuildFactory.sol
            expect(await CLONE_FACTORY.deployGuildContracts(user1.address, MOCK_GUILD_NAMES[0], MOCK_GUILD_SYMBOLS[0])).
              to.not.equal(ZERO_ADDRESS);
      

            // this.guildOneDAmorXGuild = await FACTORY.dAMORxGuildTokens(this.guildOneAmorXGuild);
            // this.guildOneFXAmorXGuild = await FACTORY.fxAMORxGuildTokens(this.guildOneAmorXGuild);
            // this.guildOneControllerxGuild = await FACTORY.guildControllers(this.guildOneAmorXGuild);
      
            // // Check that the guild was created with some custom(non-AMOR) token
            const token = await CLONE_FACTORY.amorxGuildTokens(2);
            expect(token).to.not.equal(AMOR_GUILD_TOKEN.address);

            // GUILD_ONE_AMORXGUILD = AMOR_GUILD_TOKEN.attach(this.guildOneAmorXGuild);
            // GUILD_ONE_DAMORXGUILD = DAMOR_GUILD_TOKEN.attach(this.guildOneDAmorXGuild);
            // GUILD_ONE_FXAMORXGUILD = FX_AMOR_TOKEN.attach(this.guildOneFXAmorXGuild);
            // GUILD_ONE_CONTROLLERXGUILD = CONTROLLER.attach(this.guildOneControllerxGuild);
        
            // Try to stake token and receive AMORxGuild
            // Stake it to receive AMORxGuild
            await DOINGUD_AMOR_TOKEN.transfer(user1.address, ONE_HUNDRED_ETHER);
            await DOINGUD_AMOR_TOKEN.connect(user1).approve(GUILD_ONE_AMORXGUILD.address, FIFTY_ETHER);

            await GUILD_ONE_AMORXGUILD.connect(user1).stakeAmor(user1.address, FIFTY_ETHER);
// console.log("(FIFTY_ETHER*(BASIS_POINTS-TAX_RATE)/BASIS_POINTS) is %s", (FIFTY_ETHER*(BASIS_POINTS-TAX_RATE)/BASIS_POINTS));
            expect(await GUILD_ONE_AMORXGUILD.balanceOf(DOINGUD_METADAO.address)).to.be.not.null; // tax controller
            expect(await GUILD_ONE_AMORXGUILD.balanceOf(user1.address)).to.be.not.null;
            // expect((await DOINGUD_AMOR_TOKEN.balanceOf(user1.address)).toString()).to.equal(ONE_HUNDRED_ETHER.sub(FIFTY_ETHER).toString());

        });

    });

    context('» Add guild to the MetaDAO', () => {

        it("Should Add guild to the MetaDAO", async function () {          
            // Get a deployed guild with default AMOR token            
            expect(await GUILD_ONE_CONTROLLERXGUILD.AMOR()).to.equals(DOINGUD_AMOR_TOKEN.address);
            expect(await GUILD_ONE_CONTROLLERXGUILD.AMORxGuild()).to.equals(GUILD_ONE_AMORXGUILD.address);
            expect(await GUILD_ONE_GOVERNORXGUILD.avatarAddress()).to.equals(GUILD_ONE_AVATARXGUILD.address);
            expect(await GUILD_ONE_GOVERNORXGUILD.token()).to.equals(GUILD_ONE_AMORXGUILD.address);

            expect(await GUILD_ONE_AVATARXGUILD.governor()).to.equals(GUILD_ONE_GOVERNORXGUILD.address);

            // set guardians
            guardians = [staker.address, operator.address, user3.address];
            await GUILD_ONE_GOVERNORXGUILD.connect(authorizer_adaptor).setGuardians(guardians);
            expect(await GUILD_ONE_GOVERNORXGUILD.guardians(0)).to.equals(staker.address);
            expect(await GUILD_ONE_GOVERNORXGUILD.guardians(1)).to.equals(operator.address);
            expect(await GUILD_ONE_GOVERNORXGUILD.guardians(2)).to.equals(user3.address);

            // Add a proposal on the Snapshot to add guild to the Metadao
            // propose
            targets = [MOCK_MODULE.address];
            values = [0];
            calldatas = [MOCK_MODULE.interface.encodeFunctionData("testInteraction", [20])]; // transferCalldata from https://docs.openzeppelin.com/contracts/4.x/governance

            await expect(GUILD_ONE_GOVERNORXGUILD.proposals(0)).to.be.reverted;
            await GUILD_ONE_GOVERNORXGUILD.connect(authorizer_adaptor).propose(targets, values, calldatas);
            
            await expect(GUILD_ONE_GOVERNORXGUILD.proposals(1)).to.be.reverted;
            firstProposalId = await GUILD_ONE_GOVERNORXGUILD.proposals(0);
            await GUILD_ONE_GOVERNORXGUILD.connect(authorizer_adaptor).state(firstProposalId);
            expect((await GUILD_ONE_GOVERNORXGUILD.proposalVoting(firstProposalId)).toString()).to.equals("0");
            expect((await GUILD_ONE_GOVERNORXGUILD.proposalWeight(firstProposalId)).toString()).to.equals("0");

            
            // Pass the proposal on the snapshot
            time.increase(time.duration.days(1));
            // Vote as a guardians to pass the proposal locally            
            await GUILD_ONE_GOVERNORXGUILD.connect(staker).castVote(firstProposalId, true);
            await GUILD_ONE_GOVERNORXGUILD.connect(operator).castVote(firstProposalId, true);
            await GUILD_ONE_GOVERNORXGUILD.connect(user3).castVote(firstProposalId, false);
            expect(await GUILD_ONE_GOVERNORXGUILD.proposalVoting(firstProposalId)).to.equals(2);
            expect(await GUILD_ONE_GOVERNORXGUILD.proposalWeight(firstProposalId)).to.equals(3);

            // Execute the passed proposal
            time.increase(time.duration.days(14));
            expect(await MOCK_MODULE.testValues()).to.equal(0);

            await expect(GUILD_ONE_GOVERNORXGUILD.connect(authorizer_adaptor).execute(targets, values, calldatas))
                .to
                .emit(GUILD_ONE_GOVERNORXGUILD, "ProposalExecuted").withArgs(firstProposalId);

            expect(await MOCK_MODULE.testValues()).to.equal(20);
            await expect(GUILD_ONE_GOVERNORXGUILD.voters(firstProposalId)).to.be.reverted;

            // Check that guild is added and functionning propperly

            // TODO: change moduleMock of Snapshot using or executeAfterSuccessfulVote
        });

        it("Gather taxes from the MetaDAO", async function () {
            // Transfer AMOR tokens between Accounts
            const taxDeducted = TEST_TRANSFER*(TAX_RATE/BASIS_POINTS);

            await DOINGUD_AMOR_TOKEN.approve(root.address, TEST_TRANSFER);
            expect(await DOINGUD_AMOR_TOKEN.transferFrom(root.address, user1.address, TEST_TRANSFER))
              .to.emit(DOINGUD_AMOR_TOKEN, "Transfer")
                .withArgs(root.address, user1.address, (TEST_TRANSFER-taxDeducted).toString());

            expect(await DOINGUD_AMOR_TOKEN.balanceOf(user1.address)).to.equal((TEST_TRANSFER-taxDeducted).toString());

            // Call distribute function in the MetaDAO controller        
            // await AMOR_TOKEN.transfer(METADAO.address, ONE_HUNDRED_ETHER);
            expect(await DOINGUD_METADAO.guildFees(GUILD_ONE_CONTROLLERXGUILD.address)).to.equal(0);
            await DOINGUD_METADAO.distributeFees();
            expect(await DOINGUD_METADAO.guildFees(GUILD_ONE_CONTROLLERXGUILD.address)).to.equal((taxDeducted * 0.5).toString());

            // Call claimFees function in one of the guilds
            await DOINGUD_METADAO.distributeFees();
            let guildAmor = await DOINGUD_METADAO.guildFees(GUILD_ONE_CONTROLLERXGUILD.address);
            await expect(DOINGUD_METADAO.claimFees(GUILD_ONE_CONTROLLERXGUILD.address)).
                to.emit(DOINGUD_AMOR_TOKEN, "Transfer").
                withArgs(DOINGUD_METADAO.address, GUILD_ONE_CONTROLLERXGUILD.address, (guildAmor * 0.95).toString());
            expect(await DOINGUD_METADAO.guildFees(GUILD_ONE_CONTROLLERXGUILD.address)).to.equal(0);

            // Check that guild treasury claimed the required fees
            expect(await DOINGUD_AMOR_TOKEN.balanceOf(GUILD_ONE_CONTROLLERXGUILD.address)).to.equal((guildAmor * 0.95).toString());
        });

        it("Transfer Guild’s fund from the Avatar contract", async function () {          
            await DOINGUD_AMOR_TOKEN.transfer(GUILD_ONE_AVATARXGUILD.address, ONE_HUNDRED_ETHER);
           
            guardians = [staker.address, operator.address, user3.address];
            await GUILD_ONE_GOVERNORXGUILD.connect(authorizer_adaptor).setGuardians(guardians);

            // Add a proposal in guild’s snapshot to transfer guild’s funds somewhere
            // propose
            targets = [DOINGUD_AMOR_TOKEN.address];
            values = [0];
            calldatas = [DOINGUD_AMOR_TOKEN.interface.encodeFunctionData('transfer', [user3.address, 20])]; // transferCalldata from https://docs.openzeppelin.com/contracts/4.x/governance

            await expect(GUILD_ONE_GOVERNORXGUILD.proposals(0)).to.be.reverted;
            await GUILD_ONE_GOVERNORXGUILD.connect(authorizer_adaptor).propose(targets, values, calldatas);
            await expect(GUILD_ONE_GOVERNORXGUILD.proposals(1)).to.be.reverted;

            const oldProposalId = firstProposalId;
            firstProposalId = await GUILD_ONE_GOVERNORXGUILD.proposals(0);
            expect(oldProposalId).to.not.equal(firstProposalId);

            expect((await GUILD_ONE_GOVERNORXGUILD.proposalVoting(firstProposalId)).toString()).to.equals("0");
            expect((await GUILD_ONE_GOVERNORXGUILD.proposalWeight(firstProposalId)).toString()).to.equals("0");
            
            // Pass the proposal on the snapshot
            time.increase(time.duration.days(1));
            // Vote for the proposal in the snapshot
            // TODO: add SNAPSHOT INTERACTION HERE
            // old(current-to-change): Vote as a guardians to pass the proposal locally            
            await GUILD_ONE_GOVERNORXGUILD.connect(staker).castVote(firstProposalId, true);
            await GUILD_ONE_GOVERNORXGUILD.connect(operator).castVote(firstProposalId, true);
            await GUILD_ONE_GOVERNORXGUILD.connect(user3).castVote(firstProposalId, false);
            expect(await GUILD_ONE_GOVERNORXGUILD.proposalVoting(firstProposalId)).to.equals(2);
            expect(await GUILD_ONE_GOVERNORXGUILD.proposalWeight(firstProposalId)).to.equals(3);


            // Execute the proposal and for the proposal with guardians
            time.increase(time.duration.days(14));
            const balanceBefore = await DOINGUD_AMOR_TOKEN.balanceOf(user3.address);

            await expect(GUILD_ONE_GOVERNORXGUILD.connect(authorizer_adaptor).execute(targets, values, calldatas))
                .to
                .emit(GUILD_ONE_GOVERNORXGUILD, "ProposalExecuted").withArgs(firstProposalId);

            const balanceAfter = await DOINGUD_AMOR_TOKEN.balanceOf(user3.address);
            expect(balanceAfter).to.be.gt(balanceBefore);

            await expect(GUILD_ONE_GOVERNORXGUILD.voters(firstProposalId)).to.be.reverted;    
        });

        it("Donate Guild’s fund from the Avatar contract", async function () {             

            
            // Add a proposal in guild’s snapshot to donate guild’s funds to the impact makers
            
            // Vote for the proposal in the snapshot
            
            // Execute the proposal and for the proposal with guardians\
            
            // Execute the proposal

        });
        it("Remove guild from the MetaDAO", async function () {          

            
            // Add a proposal in Metadao’s snapshot to remove guild from the metadao
            
            // Vote for the proposal in the snapshot
            
            // Execute the proposal and for the proposal with guardians\
            
            // Execute the proposal
        

        });
        it("Add report to the Guild", async function () {          


            
            // Gain some amount of donations
            
            // Prepare a report for the guild and add it using GuildController
     
        
        });
        it("Vote for the report at the Guild with FXAMOR", async function () {                    

            
            // Gain some amount of donations
            
            // Prepare a report for the guild and add it using GuildController
            
            // Support the report using FXAmor        
        
        });
        it("Finalize report vote for the Guild with no reports passing", async function () {          


            
            // Gain some amount of donations
            
            // Prepare a report for the guild and add it using GuildController
            
            // Vote against the report using FXAmor
            
            // 50% of tokens used in voting should be sent to the voters
            
            // 50% of tokens should be saved until next report voting        
     
        
        });
        it("Finalize report vote for the Guild with part of reports passing", async function () {          


            
            // Gain some amount of donations
            
            // Prepare 3 reports for the guild and add it using GuildController
            
            // Vote for 2 reports using FXAmor and against 1 report
            
            // Finalize the voting and check that:
            //     The tokens are distributed based on the weight
            //     50% of the tokens goes to the people who voted for passing reports and against failed report
            //     50% of the tokens at the failing report gets distributed between passing reports based on their weight
            //     Remaining tokens are distributed between passed reports
        
        });
        it("Finalize report vote for the Guild with all of the reports passing", async function () {          

            
            // Gain some amount of donations
            
            // Prepare 2 reports for the guild and add it using GuildController
            
            // Vote for 2 reports using FXAmor
            
            // Finalize the voting and check that:
            //     The tokens are distributed based on the weight
            //     50% of the tokens goes to the people who voted for passing reports
            //     Remaining tokens are distributed between passed reports
        

        });
    });

    context('» Add guild to the MetaDAO', () => {



    });
});