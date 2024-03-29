const { ethers } = require("hardhat");
const { use, expect } = require("chai");
const { _TypedDataEncoder } =require('@ethersproject/hash');
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
    TEST_TRANSFER,
    ONE_ADDRESS
} = require('../helpers/constants.js');
const { time } = require("@openzeppelin/test-helpers");
const EIP712_TYPES = {
    Transaction: [
      {
        name: 'to',
        type: 'address',
      },
      {
        name: 'value',
        type: 'uint256',
      },
      {
        name: 'data',
        type: 'bytes',
      },
      {
        name: 'operation',
        type: 'uint8',
      },
      {
        name: 'nonce',
        type: 'uint256',
      },
    ],
};

use(solidity);

/// The Implementation Contracts
let AMOR_TOKEN;
let AMOR_GUILD_TOKEN;
let FX_AMOR_TOKEN;
let DAMOR_GUILD_TOKEN;
let CLONE_FACTORY;
let CONTROLLERXGUILD;
let GOVERNORXGUILD;
let AVATARXGUILD;

/// Signers
let root;
let user1;
let user2;
let staker;
let operator;
let authorizer_adaptor;

let proposalsCounter;

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


/// The Newly Deployed Guild 1
let GUILD_ONE_AMORXGUILD;
let GUILD_ONE_CONTROLLERXGUILD;
let GUILD_ONE_AVATARXGUILD;
let GUILD_ONE_GOVERNORXGUILD;
/// The Newly Deployed Guild 2
let GUILD_TWO_CONTROLLERXGUILD;
let GUILD_TWO_AVATARXGUILD;
let GUILD_TWO_GOVERNORXGUILD;

/// Required variables
let IMPACT_MAKERS;
let IMPACT_MAKERS_WEIGHTS;

let domain;
let snapshotModule;
let GUILD_THREE_CONTROLLERXGUILD;
let ControllerxTwo;
let ControllerxThree;
let avatar;

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
        AMOR_GUILD_TOKEN = setup.tokens.AmorGuildToken;
        FX_AMOR_TOKEN = setup.tokens.FXAMORxGuild;
        DAMOR_GUILD_TOKEN = setup.tokens.dAMORxGuild;

        ///   STEP 2: Deploy DoinGud Control Structures
        await init.metadao(setup);
        await init.controller(setup);
        await init.avatar(setup);
        await init.governor(setup);

        AVATARXGUILD = setup.avatars.avatar;
        CONTROLLERXGUILD = setup.controller;
        GOVERNORXGUILD = setup.governor;
        METADAO = setup.metadao;

        /// STEP 4: Setup the Beacons
        let BEACON_AMOR = await init.beacon(AMOR_TOKEN.address, METADAO.address);
        let BEACON_AMOR_GUILD_TOKEN = await init.beacon(AMOR_GUILD_TOKEN.address, METADAO.address);
        let BEACON_DAMOR = await init.beacon(DAMOR_GUILD_TOKEN.address, METADAO.address);
        let BEACON_FXAMOR = await init.beacon(FX_AMOR_TOKEN.address, METADAO.address);
        let BEACON_CONTROLLER = await init.beacon(CONTROLLERXGUILD.address, METADAO.address);
        let BEACON_GOVERNOR = await init.beacon(GOVERNORXGUILD.address, METADAO.address);
        let BEACON_AVATAR = await init.beacon(AVATARXGUILD.address, METADAO.address);

            ///   `amor_proxy` is declared earlier to allow upgrade testing
        amor_proxy = await init.proxy(BEACON_AMOR.address);
        /// For testing we need to use proxy address of the implementation contract
        setup.amor_storage = amor_proxy;
        amor_guild_token_proxy = await init.proxy(BEACON_AMOR_GUILD_TOKEN.address);
        setup.amorxGuild_storage = amor_guild_token_proxy;
        let dAmor_proxy = await init.proxy(BEACON_DAMOR.address);
        let fxAmor_proxy = await init.proxy(BEACON_FXAMOR.address);
        let controller_proxy = await init.proxy(BEACON_CONTROLLER.address);
        let avatar_proxy = await init.proxy(BEACON_AVATAR.address);
        let governor_proxy = await init.proxy(BEACON_GOVERNOR.address);
  
        setup.b_amorGuildToken = BEACON_AMOR_GUILD_TOKEN;
        setup.b_damor = BEACON_DAMOR;
        setup.b_fxamor = BEACON_FXAMOR;
        setup.b_controller = BEACON_CONTROLLER;
        setup.b_governor = BEACON_GOVERNOR;
        setup.b_avatar = BEACON_AVATAR;

        ///   STEP 6: Init the storage of the tokens and control contracts
        DOINGUD_AMOR_TOKEN = AMOR_TOKEN.attach(amor_proxy.address);
        DOINGUD_AMOR_GUILD_TOKEN = AMOR_GUILD_TOKEN.attach(amor_guild_token_proxy.address);
        DOINGUD_DAMOR = DAMOR_GUILD_TOKEN.attach(dAmor_proxy.address);
        DOINGUD_FXAMOR = FX_AMOR_TOKEN.attach(fxAmor_proxy.address);
        DOINGUD_AVATAR = AVATARXGUILD.attach(avatar_proxy.address);
        DOINGUD_CONTROLLER = CONTROLLERXGUILD.attach(controller_proxy.address);
        DOINGUD_GOVERNOR = GOVERNORXGUILD.attach(governor_proxy.address);
        DOINGUD_METADAO = setup.metadao;
        setup.metadao = DOINGUD_METADAO;

        await init.getGuildFactory(setup);
        await init.vestingContract(setup);
        CLONE_FACTORY = setup.factory;
        VESTING = setup.vesting;

        // setup reality.eth
        // RealityModuleERC20
        
        // output node, aka GnosisSafe Avatar
        const Avatar = await hre.ethers.getContractFactory("TestAvatar");
        // as GnosisSafe Avatar is the contract that interacts with our Avatar
        avatar = await Avatar.deploy();
        console.log("realityModule avatar.address is %s", avatar.address);
        console.log("DOINGUD_AVATAR.address is %s", DOINGUD_AVATAR.address);
        const mock = pool;
        const oracle = await hre.ethers.getContractAt("RealitioV3ERC20", mock.address);
        console.log("Oracle address is %s", oracle.address);
        
        // middle node
        let realityModule = await ethers.getContractFactory("RealityModuleERC20")
        const module = await realityModule.deploy(
            DOINGUD_AVATAR.address,
            avatar.address, // avatar Safe authorizer_adaptor.address
            avatar.address, // target DOINGUD_AVATAR
            oracle.address,
            1, 10, 0, 0, 0,
            authorizer_adaptor.address,
            {
                gasLimit: 10000000, // InvalidInputError: Transaction requires at least 279668 gas but got 100000
            }
        )
        await module.deployTransaction.wait()
        console.log("realityModule deployed to:", module.address);
        realityModule = module;
        
        // setup Snapshot
        const wallets = await ethers.getSigners();
        const safeSigner = wallets[0]; // One 1 signer on the safe

        const GnosisSafeL2 = await ethers.getContractFactory(
          '@gnosis.pm/safe-contracts/contracts/GnosisSafeL2.sol:GnosisSafeL2'
        );
        const FactoryContract = await ethers.getContractFactory(
          '@gnosis.pm/safe-contracts/contracts/proxies/GnosisSafeProxyFactory.sol:GnosisSafeProxyFactory'
        );
        const singleton = await GnosisSafeL2.deploy();
        const factory = await FactoryContract.deploy();

        const template = await factory.callStatic.createProxy(singleton.address, '0x');
        await factory.createProxy(singleton.address, '0x');

        const safe = GnosisSafeL2.attach(template);
        safe.setup([safeSigner.address], 1, ZERO_ADDRESS, '0x', ZERO_ADDRESS, ZERO_ADDRESS, 0, ZERO_ADDRESS);

        // input node, as users will be interacting with our contracts via Snapshot
        const SnapshotXContract = await ethers.getContractFactory('SnapshotXL1Executor');

        //deploying singleton master contract
        const masterzodiacModule = await SnapshotXContract.deploy(
            DOINGUD_AVATAR.address,
            realityModule.address, // avatar reality.eth
            // avatar aka GnosisSafe Avatar as we need interaction user-input node and output-DOINGUD_AVATAR node
            avatar.address, // target
            DOINGUD_AVATAR.address,
            1,
            []
        );

        snapshotModule = masterzodiacModule;
        await avatar.setModule(snapshotModule.address);

        domain = {
            chainId: ethers.BigNumber.from(network.config.chainId),
            verifyingContract: snapshotModule.address,
        };

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
            DOINGUD_METADAO.address
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
            DOINGUD_AVATAR.address, // owner
            DOINGUD_AMOR_TOKEN.address,
            DOINGUD_AMOR_GUILD_TOKEN.address, // AMORxGuild
            DOINGUD_FXAMOR.address, // FXAMORxGuild
            DOINGUD_METADAO.address, // MetaDaoController
        );

        await DOINGUD_AVATAR.init(
            avatar.address, // owner
            DOINGUD_GOVERNOR.address // governor Address
        );

        await DOINGUD_GOVERNOR.init(
            DOINGUD_AMOR_GUILD_TOKEN.address, //AMORxGuild
            DOINGUD_AVATAR.address, // Avatar Address
            root.address
        );

        await DOINGUD_METADAO.init(
            DOINGUD_AMOR_TOKEN.address,
            CLONE_FACTORY.address,
            DOINGUD_AVATAR.address
        );
console.log("Flag1")
        /// Step 7: Set the Guardians for the MetaDAO
        /// Probably the first step after any new guild
        let guardians = [user1.address, user2.address, user3.address];
        let proposal = DOINGUD_GOVERNOR.interface.encodeFunctionData("setGuardians", [guardians]);
        let TARGETS = [DOINGUD_GOVERNOR.address];
        let VALUES = [0];
        let PROPOSALS = [proposal];
        
        let dataToReality = DOINGUD_AVATAR.interface.encodeFunctionData("proposeAfterVote", [TARGETS, VALUES, PROPOSALS]);
        let dataToSnapshot = avatar.interface.encodeFunctionData("exec", [DOINGUD_AVATAR.address, 0, dataToReality]);
        let txToSnapshot = {
            to: avatar.address,
            value: 0,
            data: dataToSnapshot,
            operation: 1,
            nonce: 0,
        };
        let txHash1 = _TypedDataEncoder.hash(domain, EIP712_TYPES, txToSnapshot);

        let abiCoder = new ethers.utils.AbiCoder();
        let executionHash = ethers.utils.keccak256(
            abiCoder.encode(['bytes32[]'], [[txHash1]])
        );
        let proposal_outcome = 1;

        await snapshotModule.receiveProposalTest(authorizer_adaptor.address, executionHash, proposal_outcome, [
            txHash1,
        ]);

        expect(await snapshotModule.getNumOfTxInProposal(0)).to.equal(1);
        await snapshotModule.executeProposalTx(0, txToSnapshot.to, txToSnapshot.value, txToSnapshot.data, txToSnapshot.operation);

        proposalsCounter = await DOINGUD_GOVERNOR.proposalsCounter();
        let proposalId = await DOINGUD_GOVERNOR.hashProposal(TARGETS, VALUES, PROPOSALS, proposalsCounter);
        await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
        time.increase(time.duration.days(5));

        await DOINGUD_GOVERNOR.connect(root).castVote(proposalId, true);

        await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
        time.increase(time.duration.days(10));
        let version = DOINGUD_GOVERNOR.currentGuardianVersion();
        await DOINGUD_GOVERNOR.execute(TARGETS, VALUES, PROPOSALS, proposalsCounter);
        expect(await DOINGUD_GOVERNOR.guardians(version, guardians[0])).to.be.true;
        expect(await DOINGUD_GOVERNOR.guardians(version, guardians[1])).to.be.true;
        expect(await DOINGUD_GOVERNOR.guardians(version, guardians[2])).to.be.true;

        console.log("Flag2")
        /// Step 8: Propose to create a new guild
        proposal = DOINGUD_METADAO.interface.encodeFunctionData("createGuild", [avatar.address, root.address, MOCK_GUILD_NAMES[0], MOCK_GUILD_SYMBOLS[0]]);

        TARGETS = [DOINGUD_METADAO.address];
        VALUES = [0];
        PROPOSALS = [proposal];

        dataToReality = DOINGUD_AVATAR.interface.encodeFunctionData("proposeAfterVote", [TARGETS, VALUES, PROPOSALS]);
        dataToSnapshot = avatar.interface.encodeFunctionData("exec", [DOINGUD_AVATAR.address, 0, dataToReality]);

        txToSnapshot = {
            to: avatar.address,
            value: 0,
            data: dataToSnapshot,
            operation: 1,
            nonce: 0,
        };
        txHash1 = _TypedDataEncoder.hash(domain, EIP712_TYPES, txToSnapshot);

        abiCoder = new ethers.utils.AbiCoder();
        executionHash = ethers.utils.keccak256(
            abiCoder.encode(['bytes32[]'], [[txHash1]])
        );
        proposal_outcome = 1;

        await snapshotModule.receiveProposalTest(authorizer_adaptor.address, executionHash, proposal_outcome, [
            txHash1,
        ]);
        await snapshotModule.executeProposalTx(1, txToSnapshot.to, txToSnapshot.value, txToSnapshot.data, txToSnapshot.operation);

        proposalsCounter = await DOINGUD_GOVERNOR.proposalsCounter();
        proposalId = await DOINGUD_GOVERNOR.hashProposal(TARGETS, VALUES, PROPOSALS, proposalsCounter);
        await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
        time.increase(time.duration.days(5));

        await DOINGUD_GOVERNOR.connect(user1).castVote(proposalId, true);
        await DOINGUD_GOVERNOR.connect(user2).castVote(proposalId, true);

        await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
        time.increase(time.duration.days(10));
        await DOINGUD_GOVERNOR.execute(TARGETS, VALUES, PROPOSALS, proposalsCounter);


        /// Setup the first two Guilds
        let guildOne = await DOINGUD_METADAO.guilds(ONE_ADDRESS);
        let ControllerxOne = guildOne;
        guildOne = await CLONE_FACTORY.guilds(guildOne);
        let AvatarxOne = guildOne.AvatarxGuild;
        let GovernorxOne = guildOne.GovernorxGuild;
        let AmorxGuildOne = guildOne.AmorGuildToken;

        GUILD_ONE_AMORXGUILD = AMOR_GUILD_TOKEN.attach(AmorxGuildOne);
        GUILD_ONE_CONTROLLERXGUILD = CONTROLLERXGUILD.attach(ControllerxOne);
        GUILD_ONE_AVATARXGUILD = AVATARXGUILD.attach(AvatarxOne);
        GUILD_ONE_GOVERNORXGUILD = GOVERNORXGUILD.attach(GovernorxOne);

        /// Setup the Impact Makers for the GuildController
        proposal = GUILD_ONE_GOVERNORXGUILD.interface.encodeFunctionData("setGuardians", [guardians]);

        TARGETS = [GUILD_ONE_GOVERNORXGUILD.address];
        VALUES = [0];
        PROPOSALS = [proposal];
        
        dataToReality = GUILD_ONE_AVATARXGUILD.interface.encodeFunctionData("proposeAfterVote", [TARGETS, VALUES, PROPOSALS]);
        dataToSnapshot = avatar.interface.encodeFunctionData("exec", [GUILD_ONE_AVATARXGUILD.address, 0, dataToReality]);

        txToSnapshot = {
            to: avatar.address,
            value: 0,
            data: dataToSnapshot,
            operation: 1,
            nonce: 0,
        };
        txHash1 = _TypedDataEncoder.hash(domain, EIP712_TYPES, txToSnapshot);

        abiCoder = new ethers.utils.AbiCoder();
        executionHash = ethers.utils.keccak256(
            abiCoder.encode(['bytes32[]'], [[txHash1]])
        );
        proposal_outcome = 1;

        await snapshotModule.receiveProposalTest(authorizer_adaptor.address, executionHash, proposal_outcome, [
            txHash1,
        ]);

        await snapshotModule.executeProposalTx(2, txToSnapshot.to, txToSnapshot.value, txToSnapshot.data, txToSnapshot.operation);
        proposalsCounter = await GUILD_ONE_GOVERNORXGUILD.proposalsCounter();
        proposalId = await GUILD_ONE_GOVERNORXGUILD.hashProposal(TARGETS, VALUES, PROPOSALS, proposalsCounter);
        await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
        time.increase(time.duration.days(5));

        await GUILD_ONE_GOVERNORXGUILD.connect(root).castVote(proposalId, true);

        await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
        time.increase(time.duration.days(10));
        await GUILD_ONE_GOVERNORXGUILD.execute(TARGETS, VALUES, PROPOSALS, proposalsCounter);

        
        IMPACT_MAKERS = [user2.address, user3.address, staker.address];
        IMPACT_MAKERS_WEIGHTS = [20, 20, 60];
        let impactMakersData = GUILD_ONE_CONTROLLERXGUILD.interface.encodeFunctionData("setImpactMakers", [IMPACT_MAKERS, IMPACT_MAKERS_WEIGHTS]);
        TARGETS = [GUILD_ONE_CONTROLLERXGUILD.address];
        VALUES = [0];
        PROPOSALS = [impactMakersData];

        dataToReality = GUILD_ONE_AVATARXGUILD.interface.encodeFunctionData("proposeAfterVote", [TARGETS, VALUES, PROPOSALS]);
        dataToSnapshot = avatar.interface.encodeFunctionData("exec", [GUILD_ONE_AVATARXGUILD.address, 0, dataToReality]);

        txToSnapshot = {
            to: avatar.address,
            value: 0,
            data: dataToSnapshot,
            operation: 1,
            nonce: 0,
        };
        txHash1 = _TypedDataEncoder.hash(domain, EIP712_TYPES, txToSnapshot);

        abiCoder = new ethers.utils.AbiCoder();
        executionHash = ethers.utils.keccak256(
            abiCoder.encode(['bytes32[]'], [[txHash1]])
        );
        proposal_outcome = 1;

        await snapshotModule.receiveProposalTest(authorizer_adaptor.address, executionHash, proposal_outcome, [
            txHash1,
        ]);
        await snapshotModule.executeProposalTx(3, txToSnapshot.to, txToSnapshot.value, txToSnapshot.data, txToSnapshot.operation);
        proposalsCounter = await GUILD_ONE_GOVERNORXGUILD.proposalsCounter();
        proposalId = await GUILD_ONE_GOVERNORXGUILD.hashProposal(TARGETS, VALUES, PROPOSALS, proposalsCounter);
        await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
        time.increase(time.duration.days(5));

        await GUILD_ONE_GOVERNORXGUILD.connect(user1).castVote(proposalId, true);
        await GUILD_ONE_GOVERNORXGUILD.connect(user2).castVote(proposalId, true);

        await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
        time.increase(time.duration.days(10));
        await GUILD_ONE_GOVERNORXGUILD.execute(TARGETS, VALUES, PROPOSALS, proposalsCounter);
        console.log("Flag3")
        /// Setup Guild Two
        proposal = DOINGUD_METADAO.interface.encodeFunctionData("createGuild", [avatar.address, root.address, MOCK_GUILD_NAMES[0], MOCK_GUILD_SYMBOLS[0]]);
        TARGETS = [DOINGUD_METADAO.address];
        VALUES = [0];
        PROPOSALS = [proposal];
        
        dataToReality = DOINGUD_AVATAR.interface.encodeFunctionData("proposeAfterVote", [TARGETS, VALUES, PROPOSALS]);
        dataToSnapshot = avatar.interface.encodeFunctionData("exec", [DOINGUD_AVATAR.address, 0, dataToReality]);

        txToSnapshot = {
            to: avatar.address,
            value: 0,
            data: dataToSnapshot,
            operation: 1,
            nonce: 0,
        };
        txHash1 = _TypedDataEncoder.hash(domain, EIP712_TYPES, txToSnapshot);

        abiCoder = new ethers.utils.AbiCoder();
        executionHash = ethers.utils.keccak256(
            abiCoder.encode(['bytes32[]'], [[txHash1]])
        );
        proposal_outcome = 1;

        await snapshotModule.receiveProposalTest(authorizer_adaptor.address, executionHash, proposal_outcome, [
            txHash1,
        ]);

        await snapshotModule.executeProposalTx(4, txToSnapshot.to, txToSnapshot.value, txToSnapshot.data, txToSnapshot.operation);

        proposalsCounter = await DOINGUD_GOVERNOR.proposalsCounter();
        proposalId = await DOINGUD_GOVERNOR.hashProposal(TARGETS, VALUES, PROPOSALS, proposalsCounter);
        await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
        time.increase(time.duration.days(5));

        await DOINGUD_GOVERNOR.connect(user1).castVote(proposalId, true);
        await DOINGUD_GOVERNOR.connect(user2).castVote(proposalId, true);

        await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
        time.increase(time.duration.days(10));
        await DOINGUD_GOVERNOR.execute(TARGETS, VALUES, PROPOSALS, proposalsCounter);

        // await DOINGUD_METADAO.createGuild(user1.address, MOCK_GUILD_NAMES[1], MOCK_GUILD_SYMBOLS[1]);
        let guildTwo = await DOINGUD_METADAO.guilds(ControllerxOne);
        ControllerxTwo = guildTwo;
        guildTwo = await CLONE_FACTORY.guilds(ControllerxTwo);
        let AvatarxTwo = guildTwo.AvatarxGuild;
        let GovernorxTwo = guildTwo.GovernorxGuild;
        /* The below objects are required in later integration testing PRs
        let AmorxTwo = guildTwo.AmorGuildToken;
        let DAmorxTwo = guildTwo.DAmorxGuild;
        let FXAmorxTwo = guildTwo.FXAMORxGuild;
        */
      
        /// Attach the implementations to the deployed proxies
        GUILD_TWO_CONTROLLERXGUILD = CONTROLLERXGUILD.attach(ControllerxTwo);
        GUILD_TWO_AVATARXGUILD = AVATARXGUILD.attach(AvatarxTwo); 
        GUILD_TWO_GOVERNORXGUILD = GOVERNORXGUILD.attach(GovernorxTwo);
        /* The below GUILD_TWO objects will be required later on
        GUILD_TWO_AMORXGUILD = AMOR_GUILD_TOKEN.attach(AmorxTwo);
        GUILD_TWO_DAMORXGUILD = DAMOR_GUILD_TOKEN.attach(DAmorxTwo);
        GUILD_TWO_FXAMORXGUILD = FX_AMOR_TOKEN.attach(FXAmorxTwo);
        */

        // await metaHelper([GUILD_TWO_GOVERNORXGUILD.address], [0], [proposal], [root], authorizer_adaptor, GUILD_TWO_AVATARXGUILD.address, GUILD_TWO_GOVERNORXGUILD.address);
        proposal = GUILD_TWO_GOVERNORXGUILD.interface.encodeFunctionData("setGuardians", [[user1.address, user2.address, user3.address]]);                
        TARGETS = [GUILD_TWO_GOVERNORXGUILD.address];
        VALUES = [0];
        PROPOSALS = [proposal];
        
        dataToReality = GUILD_TWO_AVATARXGUILD.interface.encodeFunctionData("proposeAfterVote", [TARGETS, VALUES, PROPOSALS]);
        dataToSnapshot = avatar.interface.encodeFunctionData("exec", [GUILD_TWO_AVATARXGUILD.address, 0, dataToReality]);

        txToSnapshot = {
            to: avatar.address,
            value: 0,
            data: dataToSnapshot,
            operation: 1,
            nonce: 0,
        };
        txHash1 = _TypedDataEncoder.hash(domain, EIP712_TYPES, txToSnapshot);

        abiCoder = new ethers.utils.AbiCoder();
        executionHash = ethers.utils.keccak256(
            abiCoder.encode(['bytes32[]'], [[txHash1]])
        );
        proposal_outcome = 1;

        await snapshotModule.receiveProposalTest(authorizer_adaptor.address, executionHash, proposal_outcome, [
            txHash1,
        ]);

        await snapshotModule.executeProposalTx(5, txToSnapshot.to, txToSnapshot.value, txToSnapshot.data, txToSnapshot.operation);
        proposalsCounter = await GUILD_TWO_GOVERNORXGUILD.proposalsCounter();
        proposalId = await GUILD_TWO_GOVERNORXGUILD.hashProposal(TARGETS, VALUES, PROPOSALS, proposalsCounter);
        await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
        time.increase(time.duration.days(5));

        await GUILD_TWO_GOVERNORXGUILD.connect(root).castVote(proposalId, true);

        await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
        time.increase(time.duration.days(10));
        await GUILD_TWO_GOVERNORXGUILD.execute(TARGETS, VALUES, PROPOSALS, proposalsCounter);


        // await metaHelper([GUILD_TWO_CONTROLLERXGUILD.address], [0], [setImpactMakersData], [user1, user2], authorizer_adaptor, GUILD_TWO_AVATARXGUILD.address, GUILD_TWO_GOVERNORXGUILD.address)
        impactMakersData = GUILD_TWO_CONTROLLERXGUILD.interface.encodeFunctionData("setImpactMakers", [IMPACT_MAKERS, IMPACT_MAKERS_WEIGHTS]);
        TARGETS = [GUILD_TWO_CONTROLLERXGUILD.address];
        VALUES = [0];
        PROPOSALS = [impactMakersData];

        dataToReality = GUILD_TWO_AVATARXGUILD.interface.encodeFunctionData("proposeAfterVote", [TARGETS, VALUES, PROPOSALS]);
        dataToSnapshot = avatar.interface.encodeFunctionData("exec", [GUILD_TWO_AVATARXGUILD.address, 0, dataToReality]);
        txToSnapshot = {
            to: avatar.address,
            value: 0,
            data: dataToSnapshot,
            operation: 1,
            nonce: 0,
        };
        txHash1 = _TypedDataEncoder.hash(domain, EIP712_TYPES, txToSnapshot);

        abiCoder = new ethers.utils.AbiCoder();
        executionHash = ethers.utils.keccak256(
            abiCoder.encode(['bytes32[]'], [[txHash1]])
        );
        proposal_outcome = 1;

        await snapshotModule.receiveProposalTest(authorizer_adaptor.address, executionHash, proposal_outcome, [
            txHash1,
        ]);
        await snapshotModule.executeProposalTx(6, txToSnapshot.to, txToSnapshot.value, txToSnapshot.data, txToSnapshot.operation);
        proposalsCounter = await GUILD_TWO_GOVERNORXGUILD.proposalsCounter();
        proposalId = await GUILD_TWO_GOVERNORXGUILD.hashProposal(TARGETS, VALUES, PROPOSALS, proposalsCounter);
        await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
        time.increase(time.duration.days(5));

        await GUILD_TWO_GOVERNORXGUILD.connect(user1).castVote(proposalId, true);
        await GUILD_TWO_GOVERNORXGUILD.connect(user2).castVote(proposalId, true);

        await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
        time.increase(time.duration.days(10));
        await GUILD_TWO_GOVERNORXGUILD.execute(TARGETS, VALUES, PROPOSALS, proposalsCounter);

        let guilds = [GUILD_ONE_CONTROLLERXGUILD.address, GUILD_TWO_CONTROLLERXGUILD.address];
        let weights = [100, 100];

        let transactionData = DOINGUD_METADAO.interface.encodeFunctionData("updateIndex", [guilds, weights, 0]);
        TARGETS = [DOINGUD_METADAO.address];
        VALUES = [0];
        PROPOSALS = [transactionData];

        dataToReality = DOINGUD_AVATAR.interface.encodeFunctionData("proposeAfterVote", [TARGETS, VALUES, PROPOSALS]);
        dataToSnapshot = avatar.interface.encodeFunctionData("exec", [DOINGUD_AVATAR.address, 0, dataToReality]);
        txToSnapshot = {
            to: avatar.address,
            value: 0,
            data: dataToSnapshot,
            operation: 1,
            nonce: 0,
        };
        txHash1 = _TypedDataEncoder.hash(domain, EIP712_TYPES, txToSnapshot);

        abiCoder = new ethers.utils.AbiCoder();
        executionHash = ethers.utils.keccak256(
            abiCoder.encode(['bytes32[]'], [[txHash1]])
        );
        proposal_outcome = 1;

        await snapshotModule.receiveProposalTest(authorizer_adaptor.address, executionHash, proposal_outcome, [
            txHash1,
        ]);
        await snapshotModule.executeProposalTx(7, txToSnapshot.to, txToSnapshot.value, txToSnapshot.data, txToSnapshot.operation);
        proposalsCounter = await DOINGUD_GOVERNOR.proposalsCounter();
        proposalId = await DOINGUD_GOVERNOR.hashProposal(TARGETS, VALUES, PROPOSALS, proposalsCounter);
        await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
        time.increase(time.duration.days(5));

        await DOINGUD_GOVERNOR.connect(user1).castVote(proposalId, true);
        await DOINGUD_GOVERNOR.connect(user2).castVote(proposalId, true);

        await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
        time.increase(time.duration.days(10));
        await DOINGUD_GOVERNOR.execute(TARGETS, VALUES, PROPOSALS, proposalsCounter);
    });

    beforeEach('setup', async function() {
        await setupTests();
    });

    context('» Tests with MetaDAO', () => {

        it("Creation of the guild independently out of MetaDAO: EXECUTE PROPOSAL FROM SNAPSHOT", async function () {
            // Call deployGuildContracts at the GuildFactory.sol
            expect(await CLONE_FACTORY.deployGuildContracts(authorizer_adaptor.address, user1.address, MOCK_GUILD_NAMES[0], MOCK_GUILD_SYMBOLS[0])).
              to.not.equal(ZERO_ADDRESS);

            // // Check that the guild was created with some custom(non-AMOR) token
            let guildThree = await DOINGUD_METADAO.guilds(ControllerxTwo);
            ControllerxThree = guildThree;
            const token = guildThree.AmorGuildToken;
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
            proposal = GUILD_ONE_AVATARXGUILD.interface.encodeFunctionData("enableModule", [authorizer_adaptor.address]);
            let TARGETS = [GUILD_ONE_AVATARXGUILD.address];
            let VALUES = [0];
            let PROPOSALS = [proposal];
    
            dataToReality = GUILD_ONE_AVATARXGUILD.interface.encodeFunctionData("proposeAfterVote", [TARGETS, VALUES, PROPOSALS]);
            dataToSnapshot = avatar.interface.encodeFunctionData("exec", [GUILD_ONE_AVATARXGUILD.address, 0, dataToReality]);
            txToSnapshot = {
                to: avatar.address,
                value: 0,
                data: dataToSnapshot,
                operation: 1,
                nonce: 0,
            };
            txHash1 = _TypedDataEncoder.hash(domain, EIP712_TYPES, txToSnapshot);
    
            abiCoder = new ethers.utils.AbiCoder();
            executionHash = ethers.utils.keccak256(
                abiCoder.encode(['bytes32[]'], [[txHash1]])
            );
            proposal_outcome = 1;
    
            await snapshotModule.receiveProposalTest(authorizer_adaptor.address, executionHash, proposal_outcome, [
                txHash1,
            ]);
            await snapshotModule.executeProposalTx(8, txToSnapshot.to, txToSnapshot.value, txToSnapshot.data, txToSnapshot.operation);

            proposalsCounter = await GUILD_ONE_GOVERNORXGUILD.proposalsCounter();
            proposalId = await GUILD_ONE_GOVERNORXGUILD.hashProposal(TARGETS, VALUES, PROPOSALS, proposalsCounter);
            await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
            time.increase(time.duration.days(5));
    
            await GUILD_ONE_GOVERNORXGUILD.connect(user1).castVote(proposalId, true);
            await GUILD_ONE_GOVERNORXGUILD.connect(user2).castVote(proposalId, true);
    
            await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
            time.increase(time.duration.days(10));
            await GUILD_ONE_GOVERNORXGUILD.execute(TARGETS, VALUES, PROPOSALS, proposalsCounter);

            // Get a deployed guild with default AMOR token            
            expect(await GUILD_ONE_CONTROLLERXGUILD.AMOR()).to.equals(DOINGUD_AMOR_TOKEN.address);
            expect(await GUILD_ONE_CONTROLLERXGUILD.AMORxGuild()).to.equals(GUILD_ONE_AMORXGUILD.address);
            expect(await GUILD_ONE_GOVERNORXGUILD.avatarAddress()).to.equals(GUILD_ONE_AVATARXGUILD.address);
            expect(await GUILD_ONE_AVATARXGUILD.governor()).to.equals(GUILD_ONE_GOVERNORXGUILD.address);

            // Add a proposal on the Snapshot to add guild to the Metadao
            await DOINGUD_AMOR_TOKEN.connect(authorizer_adaptor).approve(GUILD_ONE_CONTROLLERXGUILD.address, TEST_TRANSFER);
            expect(await GUILD_ONE_CONTROLLERXGUILD.AMOR()).to.equal(DOINGUD_AMOR_TOKEN.address);
            // await DOINGUD_AMOR_TOKEN.connect(authorizer_adaptor).transfer(GUILD_ONE_AVATARXGUILD.address, ONE_HUNDRED_ETHER);

            proposal = DOINGUD_METADAO.interface.encodeFunctionData("createGuild", [authorizer_adaptor.address, user2.address, MOCK_GUILD_NAMES[2], MOCK_GUILD_SYMBOLS[2]]);
            TARGETS = [DOINGUD_METADAO.address];
            VALUES = [0];
            PROPOSALS = [proposal];
            
            dataToReality = DOINGUD_AVATAR.interface.encodeFunctionData("proposeAfterVote", [TARGETS, VALUES, PROPOSALS]);
            dataToSnapshot = avatar.interface.encodeFunctionData("exec", [DOINGUD_AVATAR.address, 0, dataToReality]);
    
            txToSnapshot = {
                to: avatar.address,
                value: 0,
                data: dataToSnapshot,
                operation: 1,
                nonce: 0,
            };
            txHash1 = _TypedDataEncoder.hash(domain, EIP712_TYPES, txToSnapshot);
    
            abiCoder = new ethers.utils.AbiCoder();
            executionHash = ethers.utils.keccak256(
                abiCoder.encode(['bytes32[]'], [[txHash1]])
            );
            proposal_outcome = 1;
    
            // Add a proposal in guild’s snapshot to donate guild’s funds to the impact makers
            await snapshotModule.receiveProposalTest(authorizer_adaptor.address, executionHash, proposal_outcome, [
                txHash1,
            ]);    
            await snapshotModule.executeProposalTx(9, txToSnapshot.to, txToSnapshot.value, txToSnapshot.data, txToSnapshot.operation);
    
            proposalsCounter = await DOINGUD_GOVERNOR.proposalsCounter();
            proposalId = await DOINGUD_GOVERNOR.hashProposal(TARGETS, VALUES, PROPOSALS, proposalsCounter);
            await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
            time.increase(time.duration.days(5));
    
            await DOINGUD_GOVERNOR.connect(user1).castVote(proposalId, true);
            await DOINGUD_GOVERNOR.connect(user2).castVote(proposalId, true);
    
            await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
            time.increase(time.duration.days(10));
            await DOINGUD_GOVERNOR.execute(TARGETS, VALUES, PROPOSALS, proposalsCounter);

            // Check that the guild was created with some custom(non-AMOR) token
            let ControllerxFour = await DOINGUD_METADAO.guilds(ControllerxThree);
            GUILD_THREE_CONTROLLERXGUILD = CONTROLLERXGUILD.attach(ControllerxFour);
            proposal = DOINGUD_METADAO.interface.encodeFunctionData("removeGuild", [GUILD_THREE_CONTROLLERXGUILD.address]);
            TARGETS = [DOINGUD_METADAO.address];
            VALUES = [0];
            PROPOSALS = [proposal];
            
            dataToReality = DOINGUD_AVATAR.interface.encodeFunctionData("proposeAfterVote", [TARGETS, VALUES, PROPOSALS]);
            dataToSnapshot = avatar.interface.encodeFunctionData("exec", [DOINGUD_AVATAR.address, 0, dataToReality]);
    
            txToSnapshot = {
                to: avatar.address,
                value: 0,
                data: dataToSnapshot,
                operation: 1,
                nonce: 0,
            };
            txHash1 = _TypedDataEncoder.hash(domain, EIP712_TYPES, txToSnapshot);
    
            abiCoder = new ethers.utils.AbiCoder();
            executionHash = ethers.utils.keccak256(
                abiCoder.encode(['bytes32[]'], [[txHash1]])
            );
            proposal_outcome = 1;
    
            // Add a proposal in guild’s snapshot to donate guild’s funds to the impact makers
            await snapshotModule.receiveProposalTest(authorizer_adaptor.address, executionHash, proposal_outcome, [
                txHash1,
            ]);    
            await snapshotModule.executeProposalTx(10, txToSnapshot.to, txToSnapshot.value, txToSnapshot.data, txToSnapshot.operation);
    
            proposalsCounter = await DOINGUD_GOVERNOR.proposalsCounter();
            proposalId = await DOINGUD_GOVERNOR.hashProposal(TARGETS, VALUES, PROPOSALS, proposalsCounter);
            await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
            time.increase(time.duration.days(5));
    
            await DOINGUD_GOVERNOR.connect(user1).castVote(proposalId, true);
            await DOINGUD_GOVERNOR.connect(user2).castVote(proposalId, true);
    
            await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
            time.increase(time.duration.days(10));
            await DOINGUD_GOVERNOR.execute(TARGETS, VALUES, PROPOSALS, proposalsCounter);

            expect(await DOINGUD_METADAO.guilds(GUILD_THREE_CONTROLLERXGUILD.address)).to.equal(ZERO_ADDRESS);

            // // Add a proposal in guild’s snapshot to donate guild’s funds to the impact makers
            // snapshot proposal to createGuild 
            // -> Snapshot proposal passed
            // -> Governor propose called via the Avatar 
            // -> Guardians vote -> Guardians vote passes 
            // -> execute called on Governor 
            // -> Proposed transaction passed to Avatar and executed 
            // -> createGuild called on MetaDAO via Avatar

            proposal = DOINGUD_METADAO.interface.encodeFunctionData("addExternalGuild", [GUILD_THREE_CONTROLLERXGUILD.address]);
            TARGETS = [DOINGUD_METADAO.address];
            VALUES = [0];
            PROPOSALS = [proposal];
            
            dataToReality = DOINGUD_AVATAR.interface.encodeFunctionData("proposeAfterVote", [TARGETS, VALUES, PROPOSALS]);
            dataToSnapshot = avatar.interface.encodeFunctionData("exec", [DOINGUD_AVATAR.address, 0, dataToReality]);
    
            txToSnapshot = {
                to: avatar.address,
                value: 0,
                data: dataToSnapshot,
                operation: 1,
                nonce: 0,
            };
            txHash1 = _TypedDataEncoder.hash(domain, EIP712_TYPES, txToSnapshot);
    
            abiCoder = new ethers.utils.AbiCoder();
            executionHash = ethers.utils.keccak256(
                abiCoder.encode(['bytes32[]'], [[txHash1]])
            );
            proposal_outcome = 1;
    
            // Add a proposal in guild’s snapshot to donate guild’s funds to the impact makers
            await snapshotModule.receiveProposalTest(authorizer_adaptor.address, executionHash, proposal_outcome, [
                txHash1,
            ]);    
            await snapshotModule.executeProposalTx(11, txToSnapshot.to, txToSnapshot.value, txToSnapshot.data, txToSnapshot.operation);
    
            proposalsCounter = await DOINGUD_GOVERNOR.proposalsCounter();
            proposalId = await DOINGUD_GOVERNOR.hashProposal(TARGETS, VALUES, PROPOSALS, proposalsCounter);
            await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
            time.increase(time.duration.days(5));
    
            await DOINGUD_GOVERNOR.connect(user1).castVote(proposalId, true);
            await DOINGUD_GOVERNOR.connect(user2).castVote(proposalId, true);
    
            await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
            time.increase(time.duration.days(10));
            await DOINGUD_GOVERNOR.execute(TARGETS, VALUES, PROPOSALS, proposalsCounter);


            // Check that guild is added and functionning propperly
            expect(await DOINGUD_METADAO.guilds(GUILD_THREE_CONTROLLERXGUILD.address)).to.not.equal(ZERO_ADDRESS);
        });

        it("Gather taxes from the MetaDAO", async function () {
            // Transfer AMOR tokens between Accounts
            const taxDeducted = TEST_TRANSFER*(TAX_RATE/BASIS_POINTS);

            await DOINGUD_AMOR_TOKEN.approve(root.address, TEST_TRANSFER);
            await expect(DOINGUD_AMOR_TOKEN.transferFrom(root.address, user1.address, TEST_TRANSFER))
              .to.emit(DOINGUD_AMOR_TOKEN, "Transfer")
                .withArgs(root.address, user1.address, (TEST_TRANSFER-taxDeducted).toString());

            expect(await DOINGUD_AMOR_TOKEN.balanceOf(user1.address)).to.equal((TEST_TRANSFER-taxDeducted).toString());

            // Call distribute function in the MetaDAO controller        
            expect(await DOINGUD_METADAO.guildFees(GUILD_ONE_CONTROLLERXGUILD.address)).to.equal(0);
            await DOINGUD_METADAO.distributeFees(DOINGUD_AMOR_TOKEN.address);
            expect(await DOINGUD_METADAO.guildFees(GUILD_ONE_CONTROLLERXGUILD.address)).to.equal((taxDeducted * 0.5).toString());

            // Call claimFees function in one of the guilds
            await DOINGUD_METADAO.distributeFees(DOINGUD_AMOR_TOKEN.address);
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
            const balanceBefore = await DOINGUD_AMOR_TOKEN.balanceOf(user3.address);

            // Execute the proposal
            proposal = DOINGUD_AMOR_TOKEN.interface.encodeFunctionData('transfer', [user3.address, 20]);
            TARGETS = [DOINGUD_AMOR_TOKEN.address];
            VALUES = [0];
            PROPOSALS = [proposal];            
            dataToReality = GUILD_ONE_AVATARXGUILD.interface.encodeFunctionData("proposeAfterVote", [TARGETS, VALUES, PROPOSALS]);
            dataToSnapshot = avatar.interface.encodeFunctionData("exec", [GUILD_ONE_AVATARXGUILD.address, 0, dataToReality]);
            txToSnapshot = {
                to: avatar.address,
                value: 0,
                data: dataToSnapshot,
                operation: 1,
                nonce: 0,
            };
            txHash1 = _TypedDataEncoder.hash(domain, EIP712_TYPES, txToSnapshot);
    
            abiCoder = new ethers.utils.AbiCoder();
            executionHash = ethers.utils.keccak256(
                abiCoder.encode(['bytes32[]'], [[txHash1]])
            );
            proposal_outcome = 1;
            await snapshotModule.receiveProposalTest(authorizer_adaptor.address, executionHash, proposal_outcome, [
                txHash1,
            ]);    
            await snapshotModule.executeProposalTx(8, txToSnapshot.to, txToSnapshot.value, txToSnapshot.data, txToSnapshot.operation);
    
            proposalsCounter = await GUILD_ONE_GOVERNORXGUILD.proposalsCounter();
            proposalId = await GUILD_ONE_GOVERNORXGUILD.hashProposal(TARGETS, VALUES, PROPOSALS, proposalsCounter);
            await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
            time.increase(time.duration.days(5));
    
            await GUILD_ONE_GOVERNORXGUILD.connect(user1).castVote(proposalId, true);
            await GUILD_ONE_GOVERNORXGUILD.connect(user2).castVote(proposalId, true);
    
            await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
            time.increase(time.duration.days(10));
            await GUILD_ONE_GOVERNORXGUILD.execute(TARGETS, VALUES, PROPOSALS, proposalsCounter);

            const balanceAfter = await DOINGUD_AMOR_TOKEN.balanceOf(user3.address);
            expect(balanceAfter).to.be.gt(balanceBefore);
        });

        it("Donate Guild’s fund from the Avatar contract: VOTE IN SNAPSHOT", async function () {  
            await DOINGUD_AMOR_TOKEN.transfer(GUILD_ONE_AVATARXGUILD.address, ONE_HUNDRED_ETHER);

            // Execute the proposal
            proposal = DOINGUD_AMOR_TOKEN.interface.encodeFunctionData('transfer', [user3.address, 20]);
            TARGETS = [DOINGUD_AMOR_TOKEN.address];
            VALUES = [0];
            PROPOSALS = [proposal];            
            dataToReality = GUILD_ONE_AVATARXGUILD.interface.encodeFunctionData("proposeAfterVote", [TARGETS, VALUES, PROPOSALS]);
            dataToSnapshot = avatar.interface.encodeFunctionData("exec", [GUILD_ONE_AVATARXGUILD.address, 0, dataToReality]);
            txToSnapshot = {
                to: avatar.address,
                value: 0,
                data: dataToSnapshot,
                operation: 1,
                nonce: 0,
            };
            txHash1 = _TypedDataEncoder.hash(domain, EIP712_TYPES, txToSnapshot);
            abiCoder = new ethers.utils.AbiCoder();
            executionHash = ethers.utils.keccak256(
                abiCoder.encode(['bytes32[]'], [[txHash1]])
            );
            proposal_outcome = 1;
            await snapshotModule.receiveProposalTest(authorizer_adaptor.address, executionHash, proposal_outcome, [
                txHash1,
            ]);
            await snapshotModule.executeProposalTx(8, txToSnapshot.to, txToSnapshot.value, txToSnapshot.data, txToSnapshot.operation);
            proposalsCounter = await GUILD_ONE_GOVERNORXGUILD.proposalsCounter();
            proposalId = await GUILD_ONE_GOVERNORXGUILD.hashProposal(TARGETS, VALUES, PROPOSALS, proposalsCounter);
            await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
            time.increase(time.duration.days(5));
            await GUILD_ONE_GOVERNORXGUILD.connect(user1).castVote(proposalId, true);
            await GUILD_ONE_GOVERNORXGUILD.connect(user2).castVote(proposalId, true);
            await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
            time.increase(time.duration.days(10));
            await GUILD_ONE_GOVERNORXGUILD.execute(TARGETS, VALUES, PROPOSALS, proposalsCounter);
            await DOINGUD_AMOR_TOKEN.transfer(authorizer_adaptor.address, ONE_HUNDRED_ETHER);
            await DOINGUD_AMOR_TOKEN.connect(authorizer_adaptor).approve(GUILD_ONE_CONTROLLERXGUILD.address, TEST_TRANSFER);

            expect(await GUILD_ONE_CONTROLLERXGUILD.AMOR()).to.equal(DOINGUD_AMOR_TOKEN.address);

            await DOINGUD_AMOR_TOKEN.transfer(GUILD_ONE_AVATARXGUILD.address, ONE_HUNDRED_ETHER);

            const balanceBeforeAvatar = await DOINGUD_AMOR_TOKEN.balanceOf(GUILD_ONE_AVATARXGUILD.address);
            const balanceBefore = await DOINGUD_AMOR_TOKEN.balanceOf(GUILD_ONE_CONTROLLERXGUILD.address);

            proposal = DOINGUD_AMOR_TOKEN.interface.encodeFunctionData('approve', [GUILD_ONE_CONTROLLERXGUILD.address, FIFTY_ETHER]);
            TARGETS = [DOINGUD_AMOR_TOKEN.address];
            VALUES = [0];
            PROPOSALS = [proposal];            
            dataToReality = GUILD_ONE_AVATARXGUILD.interface.encodeFunctionData("proposeAfterVote", [TARGETS, VALUES, PROPOSALS]);
            dataToSnapshot = avatar.interface.encodeFunctionData("exec", [GUILD_ONE_AVATARXGUILD.address, 0, dataToReality]);
            txToSnapshot = {
                to: avatar.address,
                value: 0,
                data: dataToSnapshot,
                operation: 1,
                nonce: 0,
            };
            txHash1 = _TypedDataEncoder.hash(domain, EIP712_TYPES, txToSnapshot);
            abiCoder = new ethers.utils.AbiCoder();
            executionHash = ethers.utils.keccak256(
                abiCoder.encode(['bytes32[]'], [[txHash1]])
            );
            proposal_outcome = 1;
            await snapshotModule.receiveProposalTest(authorizer_adaptor.address, executionHash, proposal_outcome, [
                txHash1,
            ]);
            await snapshotModule.executeProposalTx(9, txToSnapshot.to, txToSnapshot.value, txToSnapshot.data, txToSnapshot.operation);
            proposalsCounter = await GUILD_ONE_GOVERNORXGUILD.proposalsCounter();
            proposalId = await GUILD_ONE_GOVERNORXGUILD.hashProposal(TARGETS, VALUES, PROPOSALS, proposalsCounter);
            await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
            time.increase(time.duration.days(5));
            await GUILD_ONE_GOVERNORXGUILD.connect(user1).castVote(proposalId, true);
            await GUILD_ONE_GOVERNORXGUILD.connect(user2).castVote(proposalId, true);
            await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
            time.increase(time.duration.days(10));
            await GUILD_ONE_GOVERNORXGUILD.execute(TARGETS, VALUES, PROPOSALS, proposalsCounter);


            proposal = GUILD_ONE_CONTROLLERXGUILD.interface.encodeFunctionData('donate', [FIFTY_ETHER, DOINGUD_AMOR_TOKEN.address]);
            TARGETS = [GUILD_ONE_CONTROLLERXGUILD.address];
            VALUES = [0];
            PROPOSALS = [proposal];            
            dataToReality = GUILD_ONE_AVATARXGUILD.interface.encodeFunctionData("proposeAfterVote", [TARGETS, VALUES, PROPOSALS]);
            dataToSnapshot = avatar.interface.encodeFunctionData("exec", [GUILD_ONE_AVATARXGUILD.address, 0, dataToReality]);
            txToSnapshot = {
                to: avatar.address,
                value: 0,
                data: dataToSnapshot,
                operation: 1,
                nonce: 0,
            };
            txHash1 = _TypedDataEncoder.hash(domain, EIP712_TYPES, txToSnapshot);
            abiCoder = new ethers.utils.AbiCoder();
            executionHash = ethers.utils.keccak256(
                abiCoder.encode(['bytes32[]'], [[txHash1]])
            );
            proposal_outcome = 1;
            await snapshotModule.receiveProposalTest(authorizer_adaptor.address, executionHash, proposal_outcome, [
                txHash1,
            ]);
            await snapshotModule.executeProposalTx(10, txToSnapshot.to, txToSnapshot.value, txToSnapshot.data, txToSnapshot.operation);
            proposalsCounter = await GUILD_ONE_GOVERNORXGUILD.proposalsCounter();
            proposalId = await GUILD_ONE_GOVERNORXGUILD.hashProposal(TARGETS, VALUES, PROPOSALS, proposalsCounter);
            await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
            time.increase(time.duration.days(5));
            await GUILD_ONE_GOVERNORXGUILD.connect(user1).castVote(proposalId, true);
            await GUILD_ONE_GOVERNORXGUILD.connect(user2).castVote(proposalId, true);
            await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
            time.increase(time.duration.days(10));
            await GUILD_ONE_GOVERNORXGUILD.execute(TARGETS, VALUES, PROPOSALS, proposalsCounter);

            const balanceAfterAvatar = await DOINGUD_AMOR_TOKEN.balanceOf(GUILD_ONE_AVATARXGUILD.address);
            const balanceAfter = await DOINGUD_AMOR_TOKEN.balanceOf(GUILD_ONE_CONTROLLERXGUILD.address);

            expect(balanceAfterAvatar).to.be.lt(balanceBeforeAvatar);
            expect(balanceAfter).to.be.gt(balanceBefore);
        });

        it("Remove guild from the MetaDAO: VOTE IN SNAPSHOT", async function () {          
            proposal = DOINGUD_METADAO.interface.encodeFunctionData('removeGuild', [GUILD_TWO_CONTROLLERXGUILD.address]);
            TARGETS = [DOINGUD_METADAO.address];
            VALUES = [0];
            PROPOSALS = [proposal];
            
            dataToReality = DOINGUD_AVATAR.interface.encodeFunctionData("proposeAfterVote", [TARGETS, VALUES, PROPOSALS]);
            dataToSnapshot = avatar.interface.encodeFunctionData("exec", [DOINGUD_AVATAR.address, 0, dataToReality]);
            txToSnapshot = {
                to: avatar.address,
                value: 0,
                data: dataToSnapshot,
                operation: 1,
                nonce: 0,
            };
            txHash1 = _TypedDataEncoder.hash(domain, EIP712_TYPES, txToSnapshot);
            abiCoder = new ethers.utils.AbiCoder();
            executionHash = ethers.utils.keccak256(
                abiCoder.encode(['bytes32[]'], [[txHash1]])
            );
            proposal_outcome = 1;
    
            // Add a proposal in guild’s snapshot to donate guild’s funds to the impact makers
            await snapshotModule.receiveProposalTest(authorizer_adaptor.address, executionHash, proposal_outcome, [
                txHash1,
            ]);
            await snapshotModule.executeProposalTx(8, txToSnapshot.to, txToSnapshot.value, txToSnapshot.data, txToSnapshot.operation);
            proposalsCounter = await DOINGUD_GOVERNOR.proposalsCounter();
            proposalId = await DOINGUD_GOVERNOR.hashProposal(TARGETS, VALUES, PROPOSALS, proposalsCounter);
            await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
            time.increase(time.duration.days(5));
    
            await DOINGUD_GOVERNOR.connect(user1).castVote(proposalId, true);
            await DOINGUD_GOVERNOR.connect(user2).castVote(proposalId, true);
    
            await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
            time.increase(time.duration.days(10));
            await DOINGUD_GOVERNOR.execute(TARGETS, VALUES, PROPOSALS, proposalsCounter);
    
            expect(await DOINGUD_METADAO.guilds(GUILD_TWO_CONTROLLERXGUILD.address)).to.equal(ZERO_ADDRESS);  
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