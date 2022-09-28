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
        BASIS_POINTS
      } = require('../helpers/constants.js');
const init = require('../test-init.js');
const ether = require("@openzeppelin/test-helpers/src/ether.js");

use(solidity);

/// The users
let root;
let multisig;
let user1;
let AMOR_TOKEN;
let AMOR_GUILD_TOKEN;
let CLONE_FACTORY;
let FX_AMOR_TOKEN;
let DAMOR_GUILD_TOKEN;
let CONTROLLERXGUILD;
let GOVERNORXGUILD;
let AVATARXGUILD;
let VESTING;

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

/// The Guild Control Structures
let GUILD_ONE_AMORXGUILD;
let GUILD_ONE_DAMORXGUILD;
let GUILD_ONE_FXAMORXGUILD;
let GUILD_ONE_CONTROLLERXGUILD;
let GUILD_ONE_AVATARXGUILD;
let GUILD_ONE_GOVERNORXGUILD;

describe("Integration Tests", function () {

const setupTests = deployments.createFixture(async () => {
  const signers = await ethers.getSigners();
  const setup = await init.initialize(signers);
  await init.getTokens(setup);

  root = setup.roles.root;
  multisig = setup.roles.doingud_multisig;
  user1 = setup.roles.user1;

  ///   DOINGUD ECOSYSTEM DEPLOYMENT
  ///   STEP 1: Deploy token implementations
  AMOR_TOKEN = setup.tokens.AmorTokenImplementation;
  AMOR_GUILD_TOKEN = setup.tokens.AmorGuildToken;
  FX_AMOR_TOKEN = setup.tokens.FXAMORxGuild;
  DAMOR_GUILD_TOKEN = setup.tokens.dAMORxGuild;

  ///   STEP 2: Deploy DoinGud Control Structures
  await init.metadao(setup);
  await init.controller(setup);
  await init.avatar(setup);
  await init.governor(setup);
  await init.getGuildFactory(setup);
  await init.vestingContract(setup);

  CLONE_FACTORY = setup.factory;
  CONTROLLERXGUILD = setup.controller;
  GOVERNORXGUILD = setup.governor;
  AVATARXGUILD = setup.avatars.avatar;
  METADAO = setup.metadao;

  ///   STEP 3: Deploy the proxies for the tokens and the control structures
  let amor_proxy = await init.proxy();
  let amor_guild_token_proxy = await init.proxy();
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

});

    beforeEach('setup', async function() {
        await setupTests();

        await AMOR_TOKEN.approve(AMOR_GUILD_TOKEN.address, MOCK_TEST_AMOUNT);

        /// Setup the guilds through the METADAO
        await METADAO.createGuild(user2.address, MOCK_GUILD_NAMES[0], MOCK_GUILD_SYMBOLS[0]);
        await METADAO.createGuild(user1.address, MOCK_GUILD_NAMES[1], MOCK_GUILD_SYMBOLS[1]);
        GUILD_CONTROLLER_ONE = await METADAO.guilds(ONE_ADDRESS);
        GUILD_CONTROLLER_ONE = CONTROLLER.attach(GUILD_CONTROLLER_ONE);
        GUILD_CONTROLLER_TWO = await METADAO.guilds(GUILD_CONTROLLER_ONE.address);
        GUILD_CONTROLLER_TWO = CONTROLLER.attach(GUILD_CONTROLLER_TWO);

        await METADAO.addWhitelist(USDC.address);
        await AMOR_TOKEN.approve(METADAO.address, ONE_HUNDRED_ETHER);
        await USDC.approve(METADAO.address, ONE_HUNDRED_ETHER);
        const abi = ethers.utils.defaultAbiCoder;
        encodedIndex = abi.encode(
            ["tuple(address, uint256)"],
            [
            [GUILD_CONTROLLER_ONE.address, 100]
            ]
        );
        encodedIndex2 = abi.encode(
            ["tuple(address, uint256)"],
            [
            [GUILD_CONTROLLER_TWO.address, 100]
            ]
        );

        await METADAO.updateIndex([encodedIndex, encodedIndex2], 0);
    });

    context('» Tests with MetaDAO', () => {

        it("Creation of the guild independently out of MetaDAO", async function () {
            // Call deployGuildContracts at the GuildFactory.sol
            expect(await FACTORY.deployGuildContracts(user1.address, MOCK_GUILD_NAMES[0], MOCK_GUILD_SYMBOLS[0])).
              to.not.equal(ZERO_ADDRESS);
      
            this.guildOneAmorXGuild = await FACTORY.amorxGuildTokens(0);
            this.guildOneDAmorXGuild = await FACTORY.dAMORxGuildTokens(this.guildOneAmorXGuild);
            this.guildOneFXAmorXGuild = await FACTORY.fxAMORxGuildTokens(this.guildOneAmorXGuild);
            this.guildOneControllerxGuild = await FACTORY.guildControllers(this.guildOneAmorXGuild);
      
            // Check that the guild was created with some custom(non-AMOR) token
            expect(AMOR_GUILD_TOKEN).to.be.not.equal(this.guildOneAmorXGuild);

            GUILD_ONE_AMORXGUILD = AMOR_GUILD_TOKEN.attach(this.guildOneAmorXGuild);
            GUILD_ONE_DAMORXGUILD = DAMOR_GUILD_TOKEN.attach(this.guildOneDAmorXGuild);
            GUILD_ONE_FXAMORXGUILD = FX_AMOR_TOKEN.attach(this.guildOneFXAmorXGuild);
            GUILD_ONE_CONTROLLERXGUILD = CONTROLLER.attach(this.guildOneControllerxGuild);
        
            // Try to stake token and receive AMORxGuild
            // Stake it to receive AMORxGuild

            await AMOR_GUILD_TOKEN.setTax(2000);
            expect(await AMOR_GUILD_TOKEN.stakingTaxRate()).to.equal(2000);

            expect(await AMOR_GUILD_TOKEN.stakeAmor(root.address, MOCK_TEST_AMOUNT)).
                to.emit(AMOR_TOKEN, "Transfer").
                withArgs(
                    root.address, 
                    AMOR_GUILD_TOKEN.address, 
                    ethers.utils.parseEther((100*(BASIS_POINTS-TAX_RATE)/BASIS_POINTS).toString())
                );

            expect(await AMOR_TOKEN.balanceOf(root.address)).to.equal(ethers.utils.parseEther((10000000-100).toString()));
            expect(await AMOR_GUILD_TOKEN.balanceOf(root.address)).to.be.not.null;
            expect(await AMOR_GUILD_TOKEN.balanceOf(user2.address)).to.be.not.null;
        });


        it("Should Add guild to the MetaDAO", async function () {          
            // Get a deployed guild with default AMOR token            
            // GUILD_ONE_AMORXGUILD

            await AVATAR.connect(root).setGovernor(GOVERNOR.address);
            expect(await AVATAR.governor()).to.equals(GOVERNOR.address);

            // set guardians
            guardians = [staker.address, operator.address, user3.address];
            await GOVERNOR.connect(authorizer_adaptor).setGuardians(guardians);
            expect(await GOVERNOR.guardians(0)).to.equals(staker.address);
            expect(await GOVERNOR.guardians(1)).to.equals(operator.address);
            expect(await GOVERNOR.guardians(2)).to.equals(user3.address);

            // Add a proposal on the Snapshot to add guild to the Metadao
            // propose
            targets = [MOCK_MODULE.address];
            values = [0];
            calldatas = [MOCK_MODULE.interface.encodeFunctionData("testInteraction", [20])]; // transferCalldata from https://docs.openzeppelin.com/contracts/4.x/governance

            await expect(GOVERNOR.proposals(0)).to.be.reverted;
            await GOVERNOR.connect(authorizer_adaptor).propose(targets, values, calldatas);
            
            await expect(GOVERNOR.proposals(1)).to.be.reverted;
            firstProposalId = await GOVERNOR.proposals(0);
            await GOVERNOR.connect(authorizer_adaptor).state(firstProposalId);
            expect((await GOVERNOR.proposalVoting(firstProposalId)).toString()).to.equals("0");
            expect((await GOVERNOR.proposalWeight(firstProposalId)).toString()).to.equals("0");

            
            // Pass the proposal on the snapshot
            time.increase(time.duration.days(1));
            // Vote as a guardians to pass the proposal locally            
            await GOVERNOR.connect(staker).castVote(firstProposalId, true);
            await GOVERNOR.connect(operator).castVote(firstProposalId, true);
            await GOVERNOR.connect(user3).castVote(firstProposalId, false);
            expect(await GOVERNOR.proposalVoting(firstProposalId)).to.equals(2);
            expect(await GOVERNOR.proposalWeight(firstProposalId)).to.equals(3);

            // Execute the passed proposal
            time.increase(time.duration.days(14));
            expect(await MOCK_MODULE.testValues()).to.equal(0);

            await expect(GOVERNOR.connect(authorizer_adaptor).execute(targets, values, calldatas))
                .to
                .emit(GOVERNOR, "ProposalExecuted").withArgs(firstProposalId);

            expect(await MOCK_MODULE.testValues()).to.equal(20);
            await expect(GOVERNOR.voters(firstProposalId)).to.be.reverted;

            // Check that guild is added and functionning propperly

            // TODO: change moduleMock of Snapshot using or executeAfterSuccessfulVote
        });

        it("Gather taxes from the MetaDAO", async function () {
            const NEW_ADDRESS = METADAO.address;
            await AMOR_TOKEN.updateController(NEW_ADDRESS);
    
            expect(await AMOR_TOKEN.taxController()).
                to.equal(NEW_ADDRESS);

            // Transfer AMOR tokens between Accounts
            const taxDeducted = TEST_TRANSFER*(TAX_RATE/BASIS_POINTS);

            await AMOR_TOKEN.approve(root.address, TEST_TRANSFER);
            expect(await AMOR_TOKEN.transferFrom(root.address, user1.address, TEST_TRANSFER))
              .to.emit(AMOR_TOKEN, "Transfer")
                .withArgs(root.address, user1.address, (TEST_TRANSFER-taxDeducted).toString());

            expect(await AMOR_TOKEN.balanceOf(user1.address)).to.equal((TEST_TRANSFER-taxDeducted).toString());

            // Call distribute function in the MetaDAO controller        
            // await AMOR_TOKEN.transfer(METADAO.address, ONE_HUNDRED_ETHER);
            expect(await METADAO.guildFees(GUILD_CONTROLLER_ONE.address)).to.equal(0);
            await METADAO.distributeFees();
            expect(await METADAO.guildFees(GUILD_CONTROLLER_ONE.address)).to.equal((taxDeducted * 0.5).toString());


            // Call claimFees function in one of the guilds
            // await AMOR_TOKEN.transfer(METADAO.address, ONE_HUNDRED_ETHER);

            await METADAO.distributeFees();
            let guildAmor = await METADAO.guildFees(GUILD_CONTROLLER_ONE.address);
            await expect(METADAO.claimFees(GUILD_CONTROLLER_ONE.address)).
                to.emit(AMOR_TOKEN, "Transfer").
                withArgs(METADAO.address, GUILD_CONTROLLER_ONE.address, (guildAmor * 0.95).toString());
            expect(await METADAO.guildFees(GUILD_CONTROLLER_ONE.address)).to.equal(0);

            // Check that guild treasury claimed the required fees
            expect(await AMOR_TOKEN.balanceOf(GUILD_CONTROLLER_ONE.address)).to.equal((guildAmor * 0.95).toString());
        });

        it("Transfer Guild’s fund from the Avatar contract", async function () {          
            expect(await AMOR_TOKEN.balanceOf(GUILD_CONTROLLER_ONE.address)).to.equal((guildAmor * 0.95).toString());

           
            // Add a proposal in guild’s snapshot to transfer guild’s funds somewhere
            
            // Vote for the proposal in the snapshot
            
            // Execute the proposal and for the proposal with guardians
            
            // Execute the proposal

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

});