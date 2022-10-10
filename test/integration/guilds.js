const { ethers } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");
const init = require('../test-init.js');
const { 
    ONE_HUNDRED_ETHER,
    FIFTY_ETHER,
    MOCK_GUILD_NAMES,
    MOCK_GUILD_SYMBOLS,
    ZERO_ADDRESS,
    BASIS_POINTS,
    TAX_RATE,
    GAURDIAN_THRESHOLD,
    AMOR_TOKEN_NAME, 
    AMOR_TOKEN_SYMBOL,
    TEST_TRANSFER
} = require('../helpers/constants.js');
const { time } = require("@openzeppelin/test-helpers");
const { getFutureTimestamp } = require("../helpers/helpers.js");

use(solidity);


let AMOR_TOKEN;
let AMOR_GUILD_TOKEN;
let FX_AMOR_TOKEN;
let DAMOR_GUILD_TOKEN;

let root;
let user1;
let user2;
let staker;
let operator;
let authorizer_adaptor;

let CONTROLLER;
// let FACTORY;
let CLONE_FACTORY;
let AVATAR;
let GOVERNOR;
// let GUILD_CONTROLLER_ONE;
// let GUILD_CONTROLLER_TWO;

let MOCK_MODULE;

// let encodedIndex;
// let encodedIndex2;

let targets;
let values;
let calldatas;
let firstProposalId;
//const FEE_INDEX = ethers.utils.keccak256(toUtf8Bytes("FEE_INDEX"));


let CONTROLLERXGUILD;
let GOVERNORXGUILD;
let AVATARXGUILD;
// let VESTING;
let ERC20_TOKEN;
// let AMOR_TOKEN_UPGRADE;

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


let GUILD_ONE_AMORXGUILD;
let GUILD_ONE_DAMORXGUILD;
let GUILD_ONE_FXAMORXGUILD;
let GUILD_ONE_CONTROLLERXGUILD;
let GUILD_ONE_GOVERNORXGUILD;
let GUILD_ONE_AVATARXGUILD;


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

        ///   DOINGUD ECOSYSTEM DEPLOYMENT
        ///   STEP 1: Deploy token implementations
        AMOR_TOKEN = setup.tokens.AmorTokenImplementation;
        AMOR_TOKEN_UPGRADE = setup.tokens.AmorTokenMockUpgrade;
        AMOR_GUILD_TOKEN = setup.tokens.AmorGuildToken;
        FX_AMOR_TOKEN = setup.tokens.FXAMORxGuild;
        DAMOR_GUILD_TOKEN = setup.tokens.dAMORxGuild;
        ERC20_TOKEN = setup.tokens.ERC20Token;
        USDC = setup.tokens.ERC20Token;

        ///   STEP 2: Deploy DoinGud Control Structures
        await init.metadao(setup);
        await init.controller(setup);
        await init.avatar(setup);
        await init.governor(setup);

        CONTROLLER = setup.controller;
        GOVERNOR = setup.governor;
        AVATAR = setup.avatars.avatar;

        CONTROLLERXGUILD = setup.controller;
        GOVERNORXGUILD = setup.governor;
        AVATARXGUILD = setup.avatars.avatar;
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
        DOINGUD_AVATAR = AVATARXGUILD.attach(avatar_proxy.address);
        DOINGUD_CONTROLLER = CONTROLLERXGUILD.attach(controller_proxy.address);
        DOINGUD_GOVERNOR = GOVERNORXGUILD.attach(governor_proxy.address);
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
        GUILD_ONE_CONTROLLERXGUILD = CONTROLLERXGUILD.attach(ControllerxOne);
        GUILD_ONE_GOVERNORXGUILD = GOVERNORXGUILD.attach(GovernorxOne);
        GUILD_ONE_AVATARXGUILD = AVATARXGUILD.attach(AvatarxOne);

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
    });

    beforeEach('setup', async function() {
        await setupTests();
    });

    context('» Tests with MetaDAO', () => {

        it("Creation of the guild independently out of MetaDAO: EXECUTE PROPOSAL FROM SNAPSHOT", async function () {
            // Call deployGuildContracts at the GuildFactory.sol
            expect(await CLONE_FACTORY.deployGuildContracts(user1.address, MOCK_GUILD_NAMES[0], MOCK_GUILD_SYMBOLS[0])).
              to.not.equal(ZERO_ADDRESS);

            // // Check that the guild was created with some custom(non-AMOR) token
            const token = await CLONE_FACTORY.amorxGuildTokens(2);
            expect(token).to.not.equal(AMOR_GUILD_TOKEN.address);

            // Try to stake token and receive AMORxGuild
            // Stake it to receive AMORxGuild
            await DOINGUD_AMOR_TOKEN.transfer(user1.address, ONE_HUNDRED_ETHER);
            await DOINGUD_AMOR_TOKEN.connect(user1).approve(GUILD_ONE_AMORXGUILD.address, FIFTY_ETHER);

            await GUILD_ONE_AMORXGUILD.connect(user1).stakeAmor(user1.address, FIFTY_ETHER);
            expect(await GUILD_ONE_AMORXGUILD.balanceOf(DOINGUD_METADAO.address)).to.be.not.null; // tax controller
            expect(await GUILD_ONE_AMORXGUILD.balanceOf(user1.address)).to.be.not.null;
        });
    });

    context('» Add guild to the MetaDAO', () => {

        it("Should Add guild to the MetaDAO: ADD A PROPOSAL IN SNAPSHOT", async function () {          
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

        it("Transfer Guild’s fund from the Avatar contract: VOTE IN SNAPSHOT", async function () {          
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

        it("Donate Guild’s fund from the Avatar contract: VOTE IN SNAPSHOT", async function () {      
            await DOINGUD_AMOR_TOKEN.transfer(authorizer_adaptor.address, ONE_HUNDRED_ETHER);
            await DOINGUD_AMOR_TOKEN.connect(authorizer_adaptor).approve(GUILD_ONE_CONTROLLERXGUILD.address, TEST_TRANSFER);

            guardians = [staker.address, operator.address, user3.address];
            await GUILD_ONE_GOVERNORXGUILD.connect(authorizer_adaptor).setGuardians(guardians);

            expect(await GUILD_ONE_CONTROLLERXGUILD.AMOR()).to.equal(DOINGUD_AMOR_TOKEN.address);

            // Add a proposal in guild’s snapshot to donate guild’s funds to the impact makers
            // propose
            // ???
            // calldatas = [GUILD_ONE_CONTROLLERXGUILD.interface.encodeFunctionData('donate', [FIFTY_ETHER, DOINGUD_AMOR_TOKEN.address])]; // transferCalldata from https://docs.openzeppelin.com/contracts/4.x/governance
            // failed

            // targets = [GUILD_ONE_CONTROLLERXGUILD.address];
            // values = [0];
            // calldatas = [GUILD_ONE_CONTROLLERXGUILD.interface.encodeFunctionData('gatherDonation', [DOINGUD_AMOR_TOKEN.address])]; // transferCalldata from https://docs.openzeppelin.com/contracts/4.x/governance
            // // failed
   
            // await DOINGUD_AMOR_TOKEN.transfer(user2.address, ONE_HUNDRED_ETHER);
            // await DOINGUD_METADAO.addWhitelist(DOINGUD_AMOR_TOKEN.address);
            // await DOINGUD_AMOR_TOKEN.approve(DOINGUD_METADAO.address, ONE_HUNDRED_ETHER);
            // await DOINGUD_METADAO.donate(DOINGUD_AMOR_TOKEN.address, FIFTY_ETHER, 0); //      Error: VM Exception while processing transaction: reverted with an unrecognized custom error
            // await DOINGUD_METADAO.connect(user2).donate(DOINGUD_AMOR_TOKEN.address, FIFTY_ETHER, 0);

            // targets = [GUILD_ONE_CONTROLLERXGUILD.address];
            // values = [0];
            // calldatas = [GUILD_ONE_CONTROLLERXGUILD.interface.encodeFunctionData('gatherDonation', [DOINGUD_AMOR_TOKEN.address])]; // transferCalldata from https://docs.openzeppelin.com/contracts/4.x/governance
            // failed

            // version with AVATAR transfer first
            // await DOINGUD_AMOR_TOKEN.transfer(GUILD_ONE_AVATARXGUILD.address, ONE_HUNDRED_ETHER);

            // targets = [DOINGUD_AMOR_TOKEN.address, GUILD_ONE_CONTROLLERXGUILD.address];
            // values = [0, 0];
            // calldatas = [DOINGUD_AMOR_TOKEN.interface.encodeFunctionData('approve', [GUILD_ONE_CONTROLLERXGUILD.address, FIFTY_ETHER]), GUILD_ONE_CONTROLLERXGUILD.interface.encodeFunctionData('donate', [FIFTY_ETHER, DOINGUD_AMOR_TOKEN.address])]; // transferCalldata from https://docs.openzeppelin.com/contracts/4.x/governance
            // failed

            // await DOINGUD_AMOR_TOKEN.transfer(DOINGUD_AVATAR.address, ONE_HUNDRED_ETHER);

            // targets = [GUILD_ONE_CONTROLLERXGUILD.address];
            // values = [0];
            // calldatas = [GUILD_ONE_CONTROLLERXGUILD.interface.encodeFunctionData('donate', [FIFTY_ETHER, DOINGUD_AMOR_TOKEN.address])]; // transferCalldata from https://docs.openzeppelin.com/contracts/4.x/governance
            // failed
            console.log("GUILD_ONE_FXAMORXGUILD.address is %s", GUILD_ONE_FXAMORXGUILD.address);
            console.log("GUILD_ONE_AVATARXGUILD.address is %s", GUILD_ONE_AVATARXGUILD.address);
            console.log("DOINGUD_AMOR_TOKEN.address is %s", DOINGUD_AMOR_TOKEN.address);
            console.log("GUILD_ONE_CONTROLLERXGUILD.address is %s", GUILD_ONE_CONTROLLERXGUILD.address);
            await DOINGUD_AMOR_TOKEN.transfer(GUILD_ONE_AVATARXGUILD.address, ONE_HUNDRED_ETHER);

            // NEED TO APPROVE FROM AVATAR TO CONTROLLER because safeTransferFrom from donate() is not working
            targets_approve = [DOINGUD_AMOR_TOKEN.address];
            values_approve = [0];
            calldatas_approve = [DOINGUD_AMOR_TOKEN.interface.encodeFunctionData('approve', [GUILD_ONE_CONTROLLERXGUILD.address, FIFTY_ETHER])];

            targets = [GUILD_ONE_CONTROLLERXGUILD.address];
            values = [0];
            calldatas = [GUILD_ONE_CONTROLLERXGUILD.interface.encodeFunctionData('donate', [FIFTY_ETHER, DOINGUD_AMOR_TOKEN.address])]; // transferCalldata from https://docs.openzeppelin.com/contracts/4.x/governance


            await expect(GUILD_ONE_GOVERNORXGUILD.proposals(0)).to.be.reverted;
            await GUILD_ONE_GOVERNORXGUILD.connect(authorizer_adaptor).propose(targets_approve, values_approve, calldatas_approve);
            await GUILD_ONE_GOVERNORXGUILD.connect(authorizer_adaptor).propose(targets, values, calldatas);
            await expect(GUILD_ONE_GOVERNORXGUILD.proposals(2)).to.be.reverted;

            const oldProposalId = firstProposalId;
            approveProposalId = await GUILD_ONE_GOVERNORXGUILD.proposals(0);
            transferProposalId = await GUILD_ONE_GOVERNORXGUILD.proposals(1);

            expect(oldProposalId).to.not.equal(approveProposalId);

            expect((await GUILD_ONE_GOVERNORXGUILD.proposalVoting(approveProposalId)).toString()).to.equals("0");
            expect((await GUILD_ONE_GOVERNORXGUILD.proposalWeight(approveProposalId)).toString()).to.equals("0");
            
            // Pass the proposal on the snapshot
            time.increase(time.duration.days(1));
            // Vote for the proposal in the snapshot
            // TODO: change to SNAPSHOT INTERACTION HERE: CONNECT TO ZODIAC MODULE (CLONE REPO AND RUN HERE)
            // old(current-to-change): Vote as a guardians to pass the proposal locally            
            await GUILD_ONE_GOVERNORXGUILD.connect(staker).castVote(approveProposalId, true);
            await GUILD_ONE_GOVERNORXGUILD.connect(operator).castVote(approveProposalId, true);
            await GUILD_ONE_GOVERNORXGUILD.connect(user3).castVote(approveProposalId, false);
            expect(await GUILD_ONE_GOVERNORXGUILD.proposalVoting(approveProposalId)).to.equals(2);
            expect(await GUILD_ONE_GOVERNORXGUILD.proposalWeight(approveProposalId)).to.equals(3);

            await GUILD_ONE_GOVERNORXGUILD.connect(staker).castVote(transferProposalId, true);
            await GUILD_ONE_GOVERNORXGUILD.connect(operator).castVote(transferProposalId, true);
            await GUILD_ONE_GOVERNORXGUILD.connect(user3).castVote(transferProposalId, false);
            expect(await GUILD_ONE_GOVERNORXGUILD.proposalVoting(transferProposalId)).to.equals(2);
            expect(await GUILD_ONE_GOVERNORXGUILD.proposalWeight(transferProposalId)).to.equals(3);

            // Execute the proposal and for the proposal with guardians
            time.increase(time.duration.days(14));
            const balanceBeforeAvatar = await DOINGUD_AMOR_TOKEN.balanceOf(GUILD_ONE_AVATARXGUILD.address);
            const balanceBefore = await DOINGUD_AMOR_TOKEN.balanceOf(GUILD_ONE_CONTROLLERXGUILD.address);

            await expect(GUILD_ONE_GOVERNORXGUILD.connect(authorizer_adaptor).execute(targets_approve, values_approve, calldatas_approve))
                .to
                .emit(GUILD_ONE_GOVERNORXGUILD, "ProposalExecuted").withArgs(approveProposalId);

            console.log("   passed approval");
            await expect(GUILD_ONE_GOVERNORXGUILD.connect(authorizer_adaptor).execute(targets, values, calldatas))
                .to
                .emit(GUILD_ONE_GOVERNORXGUILD, "ProposalExecuted").withArgs(transferProposalId);
            console.log("   passed transfer");

            const balanceAfterAvatar = await DOINGUD_AMOR_TOKEN.balanceOf(GUILD_ONE_AVATARXGUILD.address);
            const balanceAfter = await DOINGUD_AMOR_TOKEN.balanceOf(GUILD_ONE_CONTROLLERXGUILD.address);

            expect(balanceAfterAvatar).to.be.lt(balanceBeforeAvatar);
            expect(balanceAfter).to.be.gt(balanceBefore);

            firstProposalId = approveProposalId;
            await expect(GUILD_ONE_GOVERNORXGUILD.voters(approveProposalId)).to.be.reverted;
            await expect(GUILD_ONE_GOVERNORXGUILD.voters(transferProposalId)).to.be.reverted;
        });
        it("should deploy new reality module proxy", async () => {
            const saltNonce = "0xfa";
            const timeout = 60;
  const cooldown = 60;
  const expiration = 120;
  const bond = ethers.BigNumber.from(10000);
  const templateId = ethers.BigNumber.from(1);
  const FIRST_ADDRESS = "0x0000000000000000000000000000000000000001";
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  const Factory = await hre.ethers.getContractFactory("ModuleProxyFactory");
  const RealityModuleETH = await hre.ethers.getContractFactory("RealityModuleETH", { from: root });
  const factory = await Factory.deploy();


  const masterCopy = await RealityModuleETH.deploy(
    root.address,
    FIRST_ADDRESS,
    FIRST_ADDRESS,
    ZERO_ADDRESS,
    1,
    0,
    60,
    0,
    0,
    ZERO_ADDRESS,
    {
        gasLimit: 10000000 // 279668, // InvalidInputError: Transaction requires at least 279668 gas but got 100000
    }
  );

console.log("22424 is %s", 22424);

            // const { factory, masterCopy } = await baseSetup();
            // const [safe, oracle] = await ethers.getSigners();
            // const paramsValues = [
            //   safe.address,
            //   safe.address,
            //   safe.address,
            //   oracle.address,
            //   timeout,
            //   cooldown,
            //   expiration,
            //   bond,
            //   templateId,
            //   oracle.address,
            // ];
            // const encodedParams = [new AbiCoder().encode(paramsTypes, paramsValues)];
            // const initParams = masterCopy.interface.encodeFunctionData(
            //   "setUp",
            //   encodedParams
            // );
            // const receipt = await factory
            //   .deployModule(masterCopy.address, initParams, saltNonce)
            //   .then((tx: any) => tx.wait());
        
            // // retrieve new address from event
            // const {
            //   args: [newProxyAddress],
            // } = receipt.events.find(
            //   ({ event }: { event: string }) => event === "ModuleProxyCreation"
            // );
        
            // const newProxy = await hre.ethers.getContractAt(
            //   "RealityModuleETH",
            //   newProxyAddress
            // );
            // expect(await newProxy.questionTimeout()).to.be.eq(timeout);
            // expect(await newProxy.questionCooldown()).to.be.eq(cooldown);
            // expect(await newProxy.answerExpiration()).to.be.eq(expiration);
            // expect(await newProxy.minimumBond()).to.be.eq(BigNumber.from(bond));
            // expect(await newProxy.template()).to.be.eq(BigNumber.from(templateId));
          });
        it("Remove guild from the MetaDAO: VOTE IN SNAPSHOT", async function () {          
            
            const Avatar = await ethers.getContractFactory("TestAvatar");
            const avatar = await Avatar.deploy();
            const Mock = await ethers.getContractFactory("MockContract");
            const mock = await Mock.deploy();
            const oracle = await hre.ethers.getContractAt("RealitioV3ERC20", mock.address);
console.log("oracle.address is %s", oracle.address);
            // const oracle = await hre.ethers.getContractAt("MockContract" /*"RealitioV3ERC20"*/, mock.address);
console.log("0 is %s", 0);

            let Module = await ethers.getContractFactory("RealityModuleERC20")
console.log("3 is %s", 33);
            const module = await Module.deploy(
                avatar.address, avatar.address, user1.address, oracle.address, 1, 10, 0, 0, 0, authorizer_adaptor.address,
                {
                    gasLimit: 10000000, // 279668, // InvalidInputError: Transaction requires at least 279668 gas but got 100000
                }
            )
            await module.deployTransaction.wait()
            console.log("Module deployed to:", module.address);

            let module_proxy = await init.proxy();
            await module_proxy.initProxy(module.address);
            Module = Module.attach(module_proxy.address);
console.log("Module.address is %s", Module.address);

            // constructor(
            //     address _owner,
            //     address _avatar,
            //     address _target,
            //     RealitioV3 _oracle,
            //     uint32 timeout,
            //     uint32 cooldown,
            //     uint32 expiration,
            //     uint256 bond,
            //     uint256 templateId,
            //     address arbitrator
            // )

            // const module = await Module.deploy(
            //     avatar.address,
            //     avatar.address,
            //     avatar.address,
            //     root.address,
            //     42,
            //     23,
            //     0,
            //     0,
            //     1337,
            //     root.address,
            //     {
            //         gasLimit: 300000, // 279668, // InvalidInputError: Transaction requires at least 279668 gas but got 100000
            //     }
            // );
console.log("module_proxy.address is %s", module_proxy.address);
            // Add a proposal in Metadao’s snapshot to remove guild from the metadao
            // propose
            // targets = [root.address]; //DOINGUD_METADAO.address];
            // calldatas = [DOINGUD_METADAO.interface.encodeFunctionData('removeGuild', [GUILD_TWO_CONTROLLERXGUILD.address])]; // transferCalldata from https://docs.openzeppelin.com/contracts/4.x/governance
            const id = 1;//"some_random_id";
            // const txHash = ethers.utils.solidityKeccak256(["string"], ["some_tx_data"]);
            const tx = { to: DOINGUD_METADAO.address, value: 0, data: DOINGUD_METADAO.interface.encodeFunctionData('removeGuild', [GUILD_TWO_CONTROLLERXGUILD.address]), operation: 0, nonce: 0 }
            // const tx = { to: user1.address, value: 0, data: "0xbaddad", operation: 0, nonce: 0 }
            const txHash = await module.getTransactionHash(tx.to, tx.value, tx.data, tx.operation, tx.nonce)
console.log("2 is %s", 2);

            const question = await module.buildQuestion(id, [txHash]);
            const questionId = await module.getQuestionId(question, 0)
console.log("3 is %s", 3);
            await mock.givenMethodReturnUint(oracle.interface.getSighash("askQuestionWithMinBondERC20"), questionId)
            await module.addProposal(id, [txHash])
console.log("4 is %s", 4);
            const setMinimumBond = module.interface.encodeFunctionData(
                "setMinimumBond",
                [7331]
            )
            await avatar.exec(module.address, 0, setMinimumBond)
            await avatar.setModule(module.address)
console.log("5 is %s", 5);
            const block = await ethers.provider.getBlock("latest")
            await mock.reset()
            await mock.givenMethodReturnUint(oracle.interface.getSighash("getBond"), 7331)
            await mock.givenMethodReturnBool(oracle.interface.getSighash("resultFor"), true)
            await mock.givenMethodReturnUint(oracle.interface.getSighash("getFinalizeTS"), block.timestamp)
console.log("6 is %s", 6);
            await getFutureTimestamp(24); // await nextBlockTime(hre, block.timestamp + 24) // ts

            time.increase(time.duration.days(24));

            await module.executeProposal(id, [txHash], tx.to, tx.value, tx.data, tx.operation);
console.log("7 is %s", 7);
            expect(
                await module.executedProposalTransactions(ethers.utils.solidityKeccak256(["string"], [question]), txHash)
            ).to.be.equals(true)

            // const question = await module.buildQuestion(id, [txHash]);
            // const questionId = await module.getQuestionId(question, 0);
            // await mock.givenMethodReturnUint(oracle.interface.getSighash("askQuestionWithMinBondERC20"), questionId);

            // await module.addProposal(id, [txHash])

            // const updateQuestionTimeout = module.interface.encodeFunctionData(
            //     "setQuestionTimeout",
            //     [31]
            // )
            // await avatar.exec(module.address, 0, updateQuestionTimeout)





            

            // await expect(GUILD_ONE_GOVERNORXGUILD.proposals(0)).to.be.reverted;
            // await GUILD_ONE_GOVERNORXGUILD.connect(authorizer_adaptor).propose(targets, values, calldatas);
            // await expect(GUILD_ONE_GOVERNORXGUILD.proposals(1)).to.be.reverted;

            // const oldProposalId = firstProposalId;
            // firstProposalId = await GUILD_ONE_GOVERNORXGUILD.proposals(0);
            // expect(oldProposalId).to.not.equal(firstProposalId);

            // expect((await GUILD_ONE_GOVERNORXGUILD.proposalVoting(firstProposalId)).toString()).to.equals("0");
            // expect((await GUILD_ONE_GOVERNORXGUILD.proposalWeight(firstProposalId)).toString()).to.equals("0");
            
            // // Pass the proposal on the snapshot
            // time.increase(time.duration.days(1));
            // // Vote for the proposal in the snapshot
            // // TODO: add SNAPSHOT INTERACTION HERE
            // // old(current-to-change): Vote as a guardians to pass the proposal locally            
            // await GUILD_ONE_GOVERNORXGUILD.connect(staker).castVote(firstProposalId, true);
            // await GUILD_ONE_GOVERNORXGUILD.connect(operator).castVote(firstProposalId, true);
            // await GUILD_ONE_GOVERNORXGUILD.connect(user3).castVote(firstProposalId, false);
            // expect(await GUILD_ONE_GOVERNORXGUILD.proposalVoting(firstProposalId)).to.equals(2);
            // expect(await GUILD_ONE_GOVERNORXGUILD.proposalWeight(firstProposalId)).to.equals(3);


            // // Execute the proposal and for the proposal with guardians
            // time.increase(time.duration.days(14));
            // // const balanceBefore = await DOINGUD_AMOR_TOKEN.balanceOf(operator.address);

            // await expect(GUILD_ONE_GOVERNORXGUILD.execute(targets, values, calldatas))
            //     .to
            //     .emit(GUILD_ONE_GOVERNORXGUILD, "ProposalExecuted").withArgs(firstProposalId);

            // const balanceAfter = await DOINGUD_AMOR_TOKEN.balanceOf(operator.address);
            // expect(balanceAfter).to.be.gt(balanceBefore);

        
            expect(await DOINGUD_METADAO.guilds(GUILD_TWO_CONTROLLERXGUILD.address)).to.equal(ONE_ADDRESS);  

            // Add a proposal in Metadao’s snapshot to remove guild from the metadao
            
            // Vote for the proposal in the snapshot
            
            // Execute the proposal and for the proposal with guardians\
            
            // Execute the proposal
        

        });
        it("Add report to the Guild", async function () {          

            // Gain some amount of donations
            await DOINGUD_AMOR_TOKEN.transfer(user1.address, ONE_HUNDRED_ETHER);
            await DOINGUD_AMOR_TOKEN.transfer(user2.address, ONE_HUNDRED_ETHER);

            await DOINGUD_AMOR_TOKEN.connect(user2).approve(DOINGUD_CONTROLLER.address, FIFTY_ETHER);
            await DOINGUD_AMOR_TOKEN.connect(user1).approve(DOINGUD_CONTROLLER.address, FIFTY_ETHER);

            await expect(DOINGUD_CONTROLLER.connect(user2).donate(FIFTY_ETHER, DOINGUD_AMOR_TOKEN.address)).
            to.emit(DOINGUD_AMOR_TOKEN, "Transfer").
                to.emit(DOINGUD_FXAMOR, "Transfer");

            await expect(DOINGUD_CONTROLLER.connect(user1).donate(FIFTY_ETHER, DOINGUD_AMOR_TOKEN.address)).
            to.emit(DOINGUD_AMOR_TOKEN, "Transfer").
                to.emit(DOINGUD_FXAMOR, "Transfer");


            // Prepare a report for the guild and add it using GuildController
            // await AMORxGuild.connect(operator).approve(controller.address, TEST_TRANSFER);

            const timestamp = Date.now();

            // building hash has to come from system address
            // 32 bytes of data
            let messageHash = ethers.utils.solidityKeccak256(
                ["address", "uint", "string"],
                [operator.address, timestamp, "report info"]
            );

            // 32 bytes of data in Uint8Array
            let messageHashBinary = ethers.utils.arrayify(messageHash);
            
            // To sign the 32 bytes of data, make sure you pass in the data
            let signature = await operator.signMessage(messageHashBinary);

            // split signature
            r = signature.slice(0, 66);
            s = "0x" + signature.slice(66, 130);
            v = parseInt(signature.slice(130, 132), 16);
                    
            report = messageHash;

            await DOINGUD_CONTROLLER.connect(operator).addReport(report, v, r, s);
            expect((await DOINGUD_CONTROLLER.queueReportsAuthors(0))).to.equal(operator.address);
        });
        it("Vote for the report at the Guild with FXAMOR", async function () {                    
            
            // Gain some amount of donations
            await DOINGUD_AMOR_TOKEN.transfer(user1.address, ONE_HUNDRED_ETHER);
            await DOINGUD_AMOR_TOKEN.transfer(user2.address, ONE_HUNDRED_ETHER);

            await DOINGUD_AMOR_TOKEN.connect(user2).approve(DOINGUD_CONTROLLER.address, FIFTY_ETHER);
            await DOINGUD_AMOR_TOKEN.connect(user1).approve(DOINGUD_CONTROLLER.address, FIFTY_ETHER);

            await expect(DOINGUD_CONTROLLER.connect(user2).donate(FIFTY_ETHER, DOINGUD_AMOR_TOKEN.address)).
            to.emit(DOINGUD_AMOR_TOKEN, "Transfer").
                to.emit(DOINGUD_FXAMOR, "Transfer");

            await expect(DOINGUD_CONTROLLER.connect(user1).donate(FIFTY_ETHER, DOINGUD_AMOR_TOKEN.address)).
            to.emit(DOINGUD_AMOR_TOKEN, "Transfer").
                to.emit(DOINGUD_FXAMOR, "Transfer");
            
            // Prepare a report for the guild and add it using GuildController
                    
            await DOINGUD_CONTROLLER.connect(operator).addReport(report, v, r, s);

            // add 9 more reports
            await DOINGUD_CONTROLLER.connect(operator).addReport(report, v, r, s); // 1
            await DOINGUD_CONTROLLER.connect(operator).addReport(report, v, r, s); // 2
            await DOINGUD_CONTROLLER.connect(operator).addReport(report, v, r, s); // 3
            await DOINGUD_CONTROLLER.connect(operator).addReport(report, v, r, s); // 4
            await DOINGUD_CONTROLLER.connect(operator).addReport(report, v, r, s); // 5
            await DOINGUD_CONTROLLER.connect(operator).addReport(report, v, r, s); // 6
            await DOINGUD_CONTROLLER.connect(operator).addReport(report, v, r, s); // 7
            await DOINGUD_CONTROLLER.connect(operator).addReport(report, v, r, s); // 8
            await DOINGUD_CONTROLLER.connect(operator).addReport(report, v, r, s); // 9

            time.increase(time.duration.days(2));
            await DOINGUD_CONTROLLER.connect(root).startVoting();
            expect(await DOINGUD_CONTROLLER.trigger()).to.equal(true);

            // Support the report using FXAmor 
            const id = 0;
            const amount = 2;

            time.increase(time.duration.days(1));

            await DOINGUD_CONTROLLER.connect(user2).voteForReport(id, amount, true);
            await DOINGUD_CONTROLLER.connect(user1).voteForReport(id, amount, true);
            await DOINGUD_CONTROLLER.connect(user2).voteForReport(id, 1, false);
            expect(await DOINGUD_CONTROLLER.reportsVoting(0)).to.equals(3);
            expect(await DOINGUD_CONTROLLER.reportsWeight(0)).to.equals(5);
        });
        it("Finalize report vote for the Guild with no reports passing", async function () {          
            // Gain some amount of donations
            await DOINGUD_AMOR_TOKEN.transfer(user1.address, ONE_HUNDRED_ETHER);
            await DOINGUD_AMOR_TOKEN.transfer(user2.address, ONE_HUNDRED_ETHER);

            await DOINGUD_AMOR_TOKEN.connect(user2).approve(DOINGUD_CONTROLLER.address, FIFTY_ETHER);
            await DOINGUD_AMOR_TOKEN.connect(user1).approve(DOINGUD_CONTROLLER.address, FIFTY_ETHER);

            await expect(DOINGUD_CONTROLLER.connect(user2).donate(FIFTY_ETHER, DOINGUD_AMOR_TOKEN.address)).
            to.emit(DOINGUD_AMOR_TOKEN, "Transfer").
                to.emit(DOINGUD_FXAMOR, "Transfer");

            await expect(DOINGUD_CONTROLLER.connect(user1).donate(FIFTY_ETHER, DOINGUD_AMOR_TOKEN.address)).
            to.emit(DOINGUD_AMOR_TOKEN, "Transfer").
                to.emit(DOINGUD_FXAMOR, "Transfer");

            // Prepare a report for the guild and add it using GuildController
                    
            await DOINGUD_CONTROLLER.connect(operator).addReport(report, v, r, s);

            // add 9 more reports
            await DOINGUD_CONTROLLER.connect(operator).addReport(report, v, r, s); // 1
            await DOINGUD_CONTROLLER.connect(operator).addReport(report, v, r, s); // 2
            await DOINGUD_CONTROLLER.connect(operator).addReport(report, v, r, s); // 3
            await DOINGUD_CONTROLLER.connect(operator).addReport(report, v, r, s); // 4
            await DOINGUD_CONTROLLER.connect(operator).addReport(report, v, r, s); // 5
            await DOINGUD_CONTROLLER.connect(operator).addReport(report, v, r, s); // 6
            await DOINGUD_CONTROLLER.connect(operator).addReport(report, v, r, s); // 7
            await DOINGUD_CONTROLLER.connect(operator).addReport(report, v, r, s); // 8
            await DOINGUD_CONTROLLER.connect(operator).addReport(report, v, r, s); // 9

            time.increase(time.duration.days(2));
            await DOINGUD_CONTROLLER.connect(root).startVoting();
            expect(await DOINGUD_CONTROLLER.trigger()).to.equal(true);

            // Support the report using FXAmor 
            const id = 0;
            const amount = 2; // all amount = 6

            time.increase(time.duration.days(1));

            await DOINGUD_CONTROLLER.connect(user2).voteForReport(id, amount, false);
            await DOINGUD_CONTROLLER.connect(user1).voteForReport(id, amount, false);
            await DOINGUD_CONTROLLER.connect(user2).voteForReport(id, amount, false);
            expect(await DOINGUD_CONTROLLER.reportsVoting(0)).to.equals(-6);
            expect(await DOINGUD_CONTROLLER.reportsWeight(0)).to.equals(6);

            // 50% of tokens used in voting should be sent to the voters
            
            const balanceBefore1 = await DOINGUD_AMOR_GUILD_TOKEN.balanceOf(user1.address);
            const balanceBefore2 = await DOINGUD_AMOR_GUILD_TOKEN.balanceOf(user2.address);

            time.increase(time.duration.days(14));
            await DOINGUD_CONTROLLER.connect(operator).finalizeVoting();
            const balanceAfter1 = balanceBefore1.add(1);
            const balanceAfter2 = balanceBefore2.add(2);
            expect((await DOINGUD_AMOR_GUILD_TOKEN.balanceOf(user1.address)).toString()).to.equal(balanceAfter1.toString());
            expect((await DOINGUD_AMOR_GUILD_TOKEN.balanceOf(user2.address)).toString()).to.equal(balanceAfter2.toString());

            // 50% of tokens should be saved until next report voting
            const balanceAfter3 = amount * 3 / 2;
            expect((await DOINGUD_AMOR_GUILD_TOKEN.balanceOf(DOINGUD_CONTROLLER.address)).toString()).to.equal(balanceAfter3.toString());
        });

        it("Finalize report vote for the Guild with part of reports passing", async function () {          
            // Gain some amount of donations
            await DOINGUD_AMOR_TOKEN.transfer(user1.address, ONE_HUNDRED_ETHER);
            await DOINGUD_AMOR_TOKEN.transfer(user2.address, ONE_HUNDRED_ETHER);

            await DOINGUD_AMOR_TOKEN.connect(user2).approve(DOINGUD_CONTROLLER.address, FIFTY_ETHER);
            await DOINGUD_AMOR_TOKEN.connect(user1).approve(DOINGUD_CONTROLLER.address, FIFTY_ETHER);

            await expect(DOINGUD_CONTROLLER.connect(user2).donate(FIFTY_ETHER, DOINGUD_AMOR_TOKEN.address)).
            to.emit(DOINGUD_AMOR_TOKEN, "Transfer").
                to.emit(DOINGUD_FXAMOR, "Transfer");

            await expect(DOINGUD_CONTROLLER.connect(user1).donate(FIFTY_ETHER, DOINGUD_AMOR_TOKEN.address)).
            to.emit(DOINGUD_AMOR_TOKEN, "Transfer").
                to.emit(DOINGUD_FXAMOR, "Transfer");

            // Prepare reports for the guild and add it using GuildController
                    
            await DOINGUD_CONTROLLER.connect(operator).addReport(report, v, r, s);

            // add 9 more reports
            await DOINGUD_CONTROLLER.connect(operator).addReport(report, v, r, s); // 1
            await DOINGUD_CONTROLLER.connect(operator).addReport(report, v, r, s); // 2
            await DOINGUD_CONTROLLER.connect(operator).addReport(report, v, r, s); // 3
            await DOINGUD_CONTROLLER.connect(operator).addReport(report, v, r, s); // 4
            await DOINGUD_CONTROLLER.connect(operator).addReport(report, v, r, s); // 5
            await DOINGUD_CONTROLLER.connect(operator).addReport(report, v, r, s); // 6
            await DOINGUD_CONTROLLER.connect(operator).addReport(report, v, r, s); // 7
            await DOINGUD_CONTROLLER.connect(operator).addReport(report, v, r, s); // 8
            await DOINGUD_CONTROLLER.connect(operator).addReport(report, v, r, s); // 9

            time.increase(time.duration.days(2));
            await DOINGUD_CONTROLLER.connect(root).startVoting();
            expect(await DOINGUD_CONTROLLER.trigger()).to.equal(true);

            // Vote for 2 reports using FXAmor and against 1 report

            // Support the report using FXAmor 
            let id = 0;
            const amount = 2; // all amount = 6

            time.increase(time.duration.days(1));

            await DOINGUD_CONTROLLER.connect(user2).voteForReport(id, amount, true);
            await DOINGUD_CONTROLLER.connect(user1).voteForReport(id, amount, true);
            await DOINGUD_CONTROLLER.connect(user2).voteForReport(id, amount, true);
            expect(await DOINGUD_CONTROLLER.reportsVoting(id)).to.equals(6);
            expect(await DOINGUD_CONTROLLER.reportsWeight(id)).to.equals(6);

            id = 1;
            await DOINGUD_CONTROLLER.connect(user2).voteForReport(id, amount, true);
            await DOINGUD_CONTROLLER.connect(user1).voteForReport(id, amount, true);
            await DOINGUD_CONTROLLER.connect(user2).voteForReport(id, amount, true);
            expect(await DOINGUD_CONTROLLER.reportsVoting(id)).to.equals(6);
            expect(await DOINGUD_CONTROLLER.reportsWeight(id)).to.equals(6);

            id = 2;
            await DOINGUD_CONTROLLER.connect(user2).voteForReport(id, amount, true);
            await DOINGUD_CONTROLLER.connect(user1).voteForReport(id, amount, true);
            await DOINGUD_CONTROLLER.connect(user2).voteForReport(id, amount, true);
            expect(await DOINGUD_CONTROLLER.reportsVoting(id)).to.equals(6);
            expect(await DOINGUD_CONTROLLER.reportsWeight(id)).to.equals(6);

            id = 3;
            await DOINGUD_CONTROLLER.connect(user2).voteForReport(id, amount, true);
            await DOINGUD_CONTROLLER.connect(user1).voteForReport(id, amount, true);
            await DOINGUD_CONTROLLER.connect(user2).voteForReport(id, amount, true);
            expect(await DOINGUD_CONTROLLER.reportsVoting(id)).to.equals(6);
            expect(await DOINGUD_CONTROLLER.reportsWeight(id)).to.equals(6);

            id = 4;
            await DOINGUD_CONTROLLER.connect(user2).voteForReport(id, amount, true);
            await DOINGUD_CONTROLLER.connect(user1).voteForReport(id, amount, true);
            await DOINGUD_CONTROLLER.connect(user2).voteForReport(id, amount, true);
            expect(await DOINGUD_CONTROLLER.reportsVoting(id)).to.equals(6);
            expect(await DOINGUD_CONTROLLER.reportsWeight(id)).to.equals(6);

            id = 5;
            await DOINGUD_CONTROLLER.connect(user2).voteForReport(id, amount, true);
            await DOINGUD_CONTROLLER.connect(user1).voteForReport(id, amount, true);
            await DOINGUD_CONTROLLER.connect(user2).voteForReport(id, amount, true);
            expect(await DOINGUD_CONTROLLER.reportsVoting(id)).to.equals(6);
            expect(await DOINGUD_CONTROLLER.reportsWeight(id)).to.equals(6);

            id = 6;
            await DOINGUD_CONTROLLER.connect(user2).voteForReport(id, amount, true);
            await DOINGUD_CONTROLLER.connect(user1).voteForReport(id, amount, true);
            await DOINGUD_CONTROLLER.connect(user2).voteForReport(id, amount, true);
            expect(await DOINGUD_CONTROLLER.reportsVoting(id)).to.equals(6);
            expect(await DOINGUD_CONTROLLER.reportsWeight(id)).to.equals(6);

            id = 7;
            await DOINGUD_CONTROLLER.connect(user2).voteForReport(id, amount, false);
            await DOINGUD_CONTROLLER.connect(user1).voteForReport(id, amount, true);
            await DOINGUD_CONTROLLER.connect(user2).voteForReport(id, amount, false);
            // id=7: 6 = 4 + 2 where 4 goes to DOINGUD_CONTROLLER and 2 distributed to negative-voters
            expect(await DOINGUD_CONTROLLER.reportsVoting(id)).to.equals(-2);
            expect(await DOINGUD_CONTROLLER.reportsWeight(id)).to.equals(6);

            id = 8;
            await DOINGUD_CONTROLLER.connect(user2).voteForReport(id, amount, false);
            await DOINGUD_CONTROLLER.connect(user1).voteForReport(id, amount, true);
            await DOINGUD_CONTROLLER.connect(user2).voteForReport(id, amount, false);
            expect(await DOINGUD_CONTROLLER.reportsVoting(id)).to.equals(-2);
            expect(await DOINGUD_CONTROLLER.reportsWeight(id)).to.equals(6);

            id = 9;
            await DOINGUD_CONTROLLER.connect(user2).voteForReport(id, amount, false);
            await DOINGUD_CONTROLLER.connect(user1).voteForReport(id, amount, true);
            await DOINGUD_CONTROLLER.connect(user2).voteForReport(id, amount, false);
            expect(await DOINGUD_CONTROLLER.reportsVoting(id)).to.equals(-2);
            expect(await DOINGUD_CONTROLLER.reportsWeight(id)).to.equals(6);

            // Finalize the voting and check that:
            //     The tokens are distributed based on the weight
            //     50% of the tokens goes to the people who voted for passing reports and against failed report
            //     50% of the tokens at the failing report gets distributed between passing reports based on their weight
            //     Remaining tokens are distributed between passed reports

            const balanceBefore1 = await DOINGUD_AMOR_GUILD_TOKEN.balanceOf(user1.address);
            const balanceBefore2 = await DOINGUD_AMOR_GUILD_TOKEN.balanceOf(user2.address);
            const balanceBefore3 = await DOINGUD_AMOR_GUILD_TOKEN.balanceOf(operator.address);

            // 18 = 3 * 6, where 6 = 4 negative + 2 positive; 3 = amount of non passed reports
            let amountToController = 3 * 4; // 4 negative; 3 = amount of non passed reports

            time.increase(time.duration.days(14));
            await DOINGUD_CONTROLLER.connect(operator).finalizeVoting();

            // 50% of the tokens goes to the people who voted for passing reports and against failed report
            const balanceAfter1 = balanceBefore1.add(8).sub(1); // where voted 'for' in failed report
            const balanceAfter2 = balanceBefore2.add(20);
            expect((await DOINGUD_AMOR_GUILD_TOKEN.balanceOf(user1.address)).toString()).to.equal(balanceAfter1.toString());
            expect((await DOINGUD_AMOR_GUILD_TOKEN.balanceOf(user2.address)).toString()).to.equal(balanceAfter2.toString());

            // 50% of tokens should be saved until next report voting
            const balanceAfterForController = amountToController;
            expect((await DOINGUD_AMOR_GUILD_TOKEN.balanceOf(DOINGUD_CONTROLLER.address)).toString()).to.equal(balanceAfterForController.toString());
        
            // Remaining tokens are distributed between passed reports
            const fiftyToCreator = amount * 3 * 7 / 2;
            const balanceAfter3 = balanceBefore3.add(fiftyToCreator);
            expect((await DOINGUD_AMOR_GUILD_TOKEN.balanceOf(operator.address)).toString()).to.equal(balanceAfter3.toString());
        });
        it("Finalize report vote for the Guild with all of the reports passing", async function () {          
            // Gain some amount of donations
            await DOINGUD_AMOR_TOKEN.transfer(user1.address, ONE_HUNDRED_ETHER);
            await DOINGUD_AMOR_TOKEN.transfer(user2.address, ONE_HUNDRED_ETHER);

            await DOINGUD_AMOR_TOKEN.connect(user2).approve(DOINGUD_CONTROLLER.address, FIFTY_ETHER);
            await DOINGUD_AMOR_TOKEN.connect(user1).approve(DOINGUD_CONTROLLER.address, FIFTY_ETHER);

            await expect(DOINGUD_CONTROLLER.connect(user2).donate(FIFTY_ETHER, DOINGUD_AMOR_TOKEN.address)).
            to.emit(DOINGUD_AMOR_TOKEN, "Transfer").
                to.emit(DOINGUD_FXAMOR, "Transfer");

            await expect(DOINGUD_CONTROLLER.connect(user1).donate(FIFTY_ETHER, DOINGUD_AMOR_TOKEN.address)).
            to.emit(DOINGUD_AMOR_TOKEN, "Transfer").
                to.emit(DOINGUD_FXAMOR, "Transfer");

            // Prepare reports for the guild and add it using GuildController
                    
            await DOINGUD_CONTROLLER.connect(operator).addReport(report, v, r, s);

            // add 9 more reports
            await DOINGUD_CONTROLLER.connect(operator).addReport(report, v, r, s); // 1
            await DOINGUD_CONTROLLER.connect(operator).addReport(report, v, r, s); // 2
            await DOINGUD_CONTROLLER.connect(operator).addReport(report, v, r, s); // 3
            await DOINGUD_CONTROLLER.connect(operator).addReport(report, v, r, s); // 4
            await DOINGUD_CONTROLLER.connect(operator).addReport(report, v, r, s); // 5
            await DOINGUD_CONTROLLER.connect(operator).addReport(report, v, r, s); // 6
            await DOINGUD_CONTROLLER.connect(operator).addReport(report, v, r, s); // 7
            await DOINGUD_CONTROLLER.connect(operator).addReport(report, v, r, s); // 8
            await DOINGUD_CONTROLLER.connect(operator).addReport(report, v, r, s); // 9

            time.increase(time.duration.days(2));
            await DOINGUD_CONTROLLER.connect(root).startVoting();
            expect(await DOINGUD_CONTROLLER.trigger()).to.equal(true);

            // Vote for 2 reports using FXAmor and against 1 report

            // Support the report using FXAmor 
            let id = 0;
            const amount = 2; // all amount for each report = 6

            time.increase(time.duration.days(1));

            await DOINGUD_CONTROLLER.connect(user2).voteForReport(id, amount, true);
            await DOINGUD_CONTROLLER.connect(user1).voteForReport(id, amount, true);
            await DOINGUD_CONTROLLER.connect(user2).voteForReport(id, amount, true);
            expect(await DOINGUD_CONTROLLER.reportsVoting(id)).to.equals(6);
            expect(await DOINGUD_CONTROLLER.reportsWeight(id)).to.equals(6);

            id = 1;
            await DOINGUD_CONTROLLER.connect(user2).voteForReport(id, amount, true);
            await DOINGUD_CONTROLLER.connect(user1).voteForReport(id, amount, true);
            await DOINGUD_CONTROLLER.connect(user2).voteForReport(id, amount, true);
            expect(await DOINGUD_CONTROLLER.reportsVoting(id)).to.equals(6);
            expect(await DOINGUD_CONTROLLER.reportsWeight(id)).to.equals(6);

            id = 2;
            await DOINGUD_CONTROLLER.connect(user2).voteForReport(id, amount, true);
            await DOINGUD_CONTROLLER.connect(user1).voteForReport(id, amount, true);
            await DOINGUD_CONTROLLER.connect(user2).voteForReport(id, amount, true);
            expect(await DOINGUD_CONTROLLER.reportsVoting(id)).to.equals(6);
            expect(await DOINGUD_CONTROLLER.reportsWeight(id)).to.equals(6);

            id = 3;
            await DOINGUD_CONTROLLER.connect(user2).voteForReport(id, amount, true);
            await DOINGUD_CONTROLLER.connect(user1).voteForReport(id, amount, true);
            await DOINGUD_CONTROLLER.connect(user2).voteForReport(id, amount, true);
            expect(await DOINGUD_CONTROLLER.reportsVoting(id)).to.equals(6);
            expect(await DOINGUD_CONTROLLER.reportsWeight(id)).to.equals(6);

            id = 4;
            await DOINGUD_CONTROLLER.connect(user2).voteForReport(id, amount, true);
            await DOINGUD_CONTROLLER.connect(user1).voteForReport(id, amount, true);
            await DOINGUD_CONTROLLER.connect(user2).voteForReport(id, amount, true);
            expect(await DOINGUD_CONTROLLER.reportsVoting(id)).to.equals(6);
            expect(await DOINGUD_CONTROLLER.reportsWeight(id)).to.equals(6);

            id = 5;
            await DOINGUD_CONTROLLER.connect(user2).voteForReport(id, amount, true);
            await DOINGUD_CONTROLLER.connect(user1).voteForReport(id, amount, true);
            await DOINGUD_CONTROLLER.connect(user2).voteForReport(id, amount, true);
            expect(await DOINGUD_CONTROLLER.reportsVoting(id)).to.equals(6);
            expect(await DOINGUD_CONTROLLER.reportsWeight(id)).to.equals(6);

            id = 6;
            await DOINGUD_CONTROLLER.connect(user2).voteForReport(id, amount, true);
            await DOINGUD_CONTROLLER.connect(user1).voteForReport(id, amount, true);
            await DOINGUD_CONTROLLER.connect(user2).voteForReport(id, amount, true);
            expect(await DOINGUD_CONTROLLER.reportsVoting(id)).to.equals(6);
            expect(await DOINGUD_CONTROLLER.reportsWeight(id)).to.equals(6);

            id = 7;
            await DOINGUD_CONTROLLER.connect(user2).voteForReport(id, amount, true);
            await DOINGUD_CONTROLLER.connect(user1).voteForReport(id, amount, true);
            await DOINGUD_CONTROLLER.connect(user2).voteForReport(id, amount, true);
            expect(await DOINGUD_CONTROLLER.reportsVoting(id)).to.equals(6);
            expect(await DOINGUD_CONTROLLER.reportsWeight(id)).to.equals(6);

            id = 8;
            await DOINGUD_CONTROLLER.connect(user2).voteForReport(id, amount, true);
            await DOINGUD_CONTROLLER.connect(user1).voteForReport(id, amount, true);
            await DOINGUD_CONTROLLER.connect(user2).voteForReport(id, amount, true);
            expect(await DOINGUD_CONTROLLER.reportsVoting(id)).to.equals(6);
            expect(await DOINGUD_CONTROLLER.reportsWeight(id)).to.equals(6);

            id = 9;
            await DOINGUD_CONTROLLER.connect(user2).voteForReport(id, amount, true);
            await DOINGUD_CONTROLLER.connect(user1).voteForReport(id, amount, true);
            await DOINGUD_CONTROLLER.connect(user2).voteForReport(id, amount, true);
            expect(await DOINGUD_CONTROLLER.reportsVoting(id)).to.equals(6);
            expect(await DOINGUD_CONTROLLER.reportsWeight(id)).to.equals(6);

            // Finalize the voting and check that:
            //     The tokens are distributed based on the weight
            //     50% of the tokens goes to the people who voted for passing reports
            //     Remaining tokens are distributed between passed reports

            const balanceBefore1 = await DOINGUD_AMOR_GUILD_TOKEN.balanceOf(user1.address);
            const balanceBefore2 = await DOINGUD_AMOR_GUILD_TOKEN.balanceOf(user2.address);
            const balanceBefore3 = await DOINGUD_AMOR_GUILD_TOKEN.balanceOf(operator.address);

            let allAmount = 2 * 3 * 10;
            let amountToVoter = allAmount / 2 / 3;
            time.increase(time.duration.days(14));
            await DOINGUD_CONTROLLER.connect(operator).finalizeVoting();

            // 50% of the tokens goes to the people who voted for passing reports
            const balanceAfter1 = balanceBefore1.add(amountToVoter);
            const balanceAfter2 = balanceBefore2.add(amountToVoter * 2);
            expect((await DOINGUD_AMOR_GUILD_TOKEN.balanceOf(user1.address)).toString()).to.equal(balanceAfter1.toString());
            expect((await DOINGUD_AMOR_GUILD_TOKEN.balanceOf(user2.address)).toString()).to.equal(balanceAfter2.toString());
        
            // Remaining tokens are distributed between passed reports
            const fiftyToCreator = allAmount / 2;
            const balanceAfter3 = balanceBefore3.add(fiftyToCreator);
            expect((await DOINGUD_AMOR_GUILD_TOKEN.balanceOf(operator.address)).toString()).to.equal(balanceAfter3.toString());       
        });
    });
});