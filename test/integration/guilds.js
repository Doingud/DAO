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
    ZERO_ADDRESS
  } = require('../helpers/constants.js');

use(solidity);

let AMOR_TOKEN;
let AMOR_GUILD_TOKEN;
let FX_AMOR_TOKEN;
let DAMOR_GUILD_TOKEN;
let METADAO;
let USDC;
let user1;
let user2;
let CONTROLLER;
let FACTORY;
let GUILD_CONTROLLER_ONE;
let GUILD_CONTROLLER_TWO;

let GUILD_ONE_AMORXGUILD;
let GUILD_ONE_DAMORXGUILD;
let GUILD_ONE_FXAMORXGUILD;
let GUILD_ONE_CONTROLLERXGUILD;

let encodedIndex;
let encodedIndex2;

//const FEE_INDEX = ethers.utils.keccak256(toUtf8Bytes("FEE_INDEX"));

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
        user3 = setup.roles.user3;
        pool = setup.roles.pool;
        /// Setup the MetaDao first
        await init.metadao(setup);
        METADAO = setup.metadao;
        TEST_ZERO_METADAO = setup.metadao;
        ///   Setup the Controller
        await init.controller(setup);
        CONTROLLER = setup.controller;
        ///   Setup the guild factory
        await init.getGuildFactory(setup);
        FACTORY = setup.factory.guildFactory;

        await METADAO.init(AMOR_TOKEN.address, FACTORY.address);
    });

    beforeEach('setup', async function() {
        await setupTests();
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

    context('» Creation of the guild as a part of MetaDAO', () => {

        it("Should ", async function () {
            // await expect(controller.init(
            //     root.address, // owner
            //     AMOR.address,
            //     AMORxGuild.address,
            //     FXAMORxGuild.address,
            //     root.address,
            //     root.address
            // )).to.be.revertedWith("AlreadyInitialized()");

            // Create proposal at the snapshot to execute createGuild function in the MetaDAOController.sol

            // Vote for the proposal

            // Execute the proposal from the snapshot

            // Proposal should go the the Governor contract

            // Pass the proposal at the Governor contract

            // Execute the proposal at the Governor contract, it will call createGuild through the Avatar.sol
        
            // await METADAO.createGuild(user3.address, MOCK_GUILD_NAMES[2], MOCK_GUILD_SYMBOLS[2]);
            // expect(await METADAO.guilds(GUILD_CONTROLLER_TWO.address)).to.not.equal(ONE_ADDRESS);
       
        });
    });

    context('» Creation of the guild independently out of MetaDAO', () => {
        // it('initialized variables check', async function () {
        //     expect(await controller.owner()).to.equals(root.address);
        //     expect(await controller.FXAMORxGuild()).to.equals(FXAMORxGuild.address);
        // });

        it("Should deploy the Guild Token Contracts", async function () {
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
            // ??? stake?? to recieve AMORxGuild?? not dAmor?? not FxAmor??

            // Stake it to receive AMORxGuild
        });

        it("Should ", async function () {

            
            // Call deployGuildContracts at the GuildFactory.sol

            // Check that the guild was created with some custom(non-AMOR) token

            // Try to stake token and receive AMORxGuild

            // Stake it to receive AMORxGuild

        });
    });

    context('» Add guild to the MetaDAO', () => {

        it("Should deploy the Guild Token Contracts", async function () {
         
        });

        it("Should ", async function () {          
            
            // Get a deployed guild with default AMOR token
            
            // Add a proposal on the Snapshot to add guild to the Metadao
            
            // Pass the proposal on the snapshot
            
            // Vote as a guardians to pass the proposal locally
            
            // Execute the passed proposal
            
            // Check that guild is added and functionning propperly

        });
    });
});