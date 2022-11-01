const { expect } = require('chai');
const { ethers } = require('hardhat');
const { ZERO_ADDRESS, ONE_ADDRESS } = require("../helpers/constants.js");
const init = require('../test-init.js');

let avatar;
let governor;
let authorizer_adaptor;
let operator;
let mockModule;
let root;
let user2;
let user1;

let iface;
let encoded;

describe('unit - Contract: Avatar', function () {

    const setupTests = deployments.createFixture(async () => {
        const signers = await ethers.getSigners();
        const setup = await init.initialize(signers);
        avatar = await init.proxy();
        governor = await init.proxy();
        await init.getTokens(setup);
        AMORxGuild = setup.tokens.AmorGuildToken;
        await init.avatar(setup);
        await avatar.initProxy(setup.avatars.avatar.address);
        let AVATAR = setup.avatars.avatar;
        await init.governor(setup);
        await governor.initProxy(setup.governor.address);
        let GOVERNOR = setup.governor;
        avatar = AVATAR.attach(avatar.address);
        governor = GOVERNOR.attach(governor.address);
        await avatar.init(setup.roles.root.address, setup.roles.authorizer_adaptor.address);
        await governor.init(AMORxGuild.address, avatar.address, setup.roles.user1.address);
        mockModule = setup.avatars.module;
        root = setup.roles.root;
        staker = setup.roles.staker;
        operator = setup.roles.operator;
        authorizer_adaptor = setup.roles.authorizer_adaptor;
        user1 = setup.roles.user1;
        user2 = setup.roles.user2;

    });

    before('>>> setup', async function() {
        await setupTests();
    });

    context('» init testing', () => {
        it('initialized variables check', async function () {
            expect(await avatar.isModuleEnabled(ONE_ADDRESS)).to.equals(false);
        });

        it("Should fail if called more than once", async function () {
            await expect(avatar.init(
                authorizer_adaptor.address,
                authorizer_adaptor.address
            )).to.be.revertedWith("AlreadyInitialized()");
        });
    });

    context('» setGovernor testing', () => {
        it('it fails to setGovernor if not the owner', async function () {
            await expect(avatar.connect(user2).setGovernor(ZERO_ADDRESS)).to.be.revertedWith(
                'Unauthorized()'
            );
        });

        it('it succeeds in setting the governor', async function () {
            let transactionData = avatar.interface.encodeFunctionData("setGovernor", [user1.address]);
            await avatar.connect(authorizer_adaptor).executeProposal(avatar.address, 0, transactionData, 0);
            expect(await avatar.governor()).to.equal(user1.address);

            transactionData = avatar.interface.encodeFunctionData("setGovernor", [authorizer_adaptor.address]);
            await avatar.connect(user1).executeProposal(avatar.address, 0, transactionData, 0);
        });

    });

    context('» enableModule testing', () => {
        it('it fails to enableModule if InvalidParameters', async function () {
            let transactionData = avatar.interface.encodeFunctionData("enableModule", [ZERO_ADDRESS]);
            await expect(avatar.connect(authorizer_adaptor).executeProposal(avatar.address, 0, transactionData, 0))
                .to.emit(avatar, "ExecutionFromGovernorFailure")
                .withArgs(authorizer_adaptor.address);

            expect(await avatar.isModuleEnabled(ZERO_ADDRESS)).to.be.false;
        });

        it('it enables Module', async function () {
            
            expect(await avatar.isModuleEnabled(operator.address)).to.equals(false);
            let transactionData = avatar.interface.encodeFunctionData("enableModule", [operator.address]);
            await avatar.connect(authorizer_adaptor).executeProposal(avatar.address, 0, transactionData, 0);

            expect(await avatar.isModuleEnabled(operator.address)).to.equals(true);
        });

        it('it fails to enableModule if trying to add twice', async function () {
            let enabledModulesBefore = await avatar.getModulesPaginated(ONE_ADDRESS, 5);
            let transactionData = avatar.interface.encodeFunctionData("enableModule", [operator.address]);
            await expect(avatar.connect(authorizer_adaptor).executeProposal(avatar.address, 0, transactionData, 0)).to.emit(avatar, "ExecutionFromGovernorFailure");

            let enabledModulesAfter = await avatar.getModulesPaginated(ONE_ADDRESS, 5);
            expect(enabledModulesBefore.array.length).to.equal(enabledModulesAfter.array.length);
            
        });
    });

    context('» disableModule testing', () => {
        it('it fails to disableModule if InvalidParameters', async function () {
            let enabledModulesBefore = await avatar.getModulesPaginated(ONE_ADDRESS, 5);
            let transactionData = avatar.interface.encodeFunctionData("disableModule", [ONE_ADDRESS, ZERO_ADDRESS]);
            await avatar.connect(authorizer_adaptor).executeProposal(avatar.address, 0, transactionData, 0);

            let enabledModulesAfter = await avatar.getModulesPaginated(ONE_ADDRESS, 5);
            expect(enabledModulesBefore.array.length).to.equal(enabledModulesAfter.array.length);
        });

        it('it disable Module', async function () {
            expect(await avatar.isModuleEnabled(operator.address)).to.equals(true);
            const prevModule = ONE_ADDRESS;
            let transactionData = avatar.interface.encodeFunctionData("disableModule", [prevModule, operator.address]);
            await avatar.connect(authorizer_adaptor).executeProposal(avatar.address, 0, transactionData, 0);

            expect(await avatar.isModuleEnabled(operator.address)).to.equals(false);
        });

        it('it fails to disableModule if trying to add twice', async function () {
            let enabledModulesBefore = await avatar.getModulesPaginated(ONE_ADDRESS, 5);
            const prevModule = ONE_ADDRESS;
            let transactionData = avatar.interface.encodeFunctionData("disableModule", [prevModule, operator.address]);
            await avatar.connect(authorizer_adaptor).executeProposal(avatar.address, 0, transactionData, 0);

            let enabledModulesAfter = await avatar.getModulesPaginated(ONE_ADDRESS, 5);
            expect(enabledModulesBefore.array.length).to.equal(enabledModulesAfter.array.length);
        });
    });

    context('» execTransactionFromModule testing', () => {
        it('it fails to execTransactionFromModule if NotWhitelisted', async function () {
            expect(await avatar.isModuleEnabled(operator.address)).to.be.false;
            let transactionCallData = avatar.interface.encodeFunctionData("setGovernor", [operator.address]);
            await expect(avatar.connect(operator).execTransactionFromModule(avatar.address, 0, transactionCallData, 0)).to.be.revertedWith("NotWhitelisted()");
        });

        it('it emits fail in execTransactionFromModule', async function () {
            let transactionData = avatar.interface.encodeFunctionData("enableModule", [authorizer_adaptor.address]);
            await avatar.connect(authorizer_adaptor).executeProposal(avatar.address, 0, transactionData, 0);

            let encodedFail = "0x";
            await expect(avatar.connect(authorizer_adaptor).execTransactionFromModule(avatar.address, 0, encodedFail, 0)).
                to.emit(avatar, "ExecutionFromModuleFailure").
                withArgs(authorizer_adaptor.address);
        });

        it('it emits success in execTransactionFromModule', async function () {
            let encoded = "0x";

            let transactionCallData = avatar.interface.encodeFunctionData("enableModule", [root.address]);

            // call test
            await expect(avatar.connect(authorizer_adaptor).execTransactionFromModule(avatar.address, 0, transactionCallData, 0))
                .to
                .emit(avatar, "ExecutionFromModuleSuccess").withArgs(authorizer_adaptor.address);

            // delegate call
            await expect(avatar.connect(authorizer_adaptor).execTransactionFromModule(governor.address, 0, encoded, 1))
                .to.emit(avatar, "ExecutionFromModuleSuccess").withArgs(authorizer_adaptor.address);
        });
    });

    context('» execTransactionFromModuleReturnData testing', () => {
        it('it fails to execTransactionFromModuleReturnData if NotWhitelisted', async function () {
            expect(await avatar.isModuleEnabled(user2.address)).to.be.false;
            let transactionCallData = avatar.interface.encodeFunctionData("setGovernor", [operator.address]);
            await expect(avatar.connect(user2).execTransactionFromModule(avatar.address, 0, transactionCallData, 0)).to.be.revertedWith("NotWhitelisted()");
        });

        it('it emits fail in execTransactionFromModuleReturnData', async function () {
            expect(await avatar.isModuleEnabled(root.address)).to.equals(true);

            let encodedFail = "0x";
            await expect(avatar.execTransactionFromModuleReturnData(avatar.address, 0, encodedFail, 0))
                .to.emit(avatar, "ExecutionFromModuleFailure").withArgs(root.address);
        });

        it('it emits success in execTransactionFromModuleReturnData', async function () {
            let encoded = mockModule.interface.encodeFunctionData("testInteraction", [1]);
            expect(await mockModule.testValues()).to.equal(0);

            expect(await avatar.isModuleEnabled(root.address)).to.equals(true);
            // call
            await expect(avatar.connect(root).execTransactionFromModuleReturnData(mockModule.address, 0, encoded, 0))
                .to.emit(avatar, "ExecutionFromModuleSuccess").withArgs(root.address);
        });
    });

    context('» getModulesPaginated testing', () => {
        it("returns array of enabled modules", async () => {
            let transactionCallData = avatar.interface.encodeFunctionData("enableModule", [operator.address]);
            await avatar.execTransactionFromModuleReturnData(avatar.address, 0, transactionCallData, 0)
            let array;
            [array, ] = await avatar.getModulesPaginated(ONE_ADDRESS, 5);
            expect(array).to.contain(operator.address);
            expect(array).to.contain(root.address);
            expect(array).to.contain(authorizer_adaptor.address);
            expect(array.length).to.equal(4);
        });
    });

    context('» executeProposal testing', () => {
        it('it emits fail in executeProposal if not guardian', async function () {
            let encoded = "0x";
            await expect(avatar.connect(user2).executeProposal(avatar.address, 0, encoded, 0))
                .to.be.revertedWith(
                    "Unauthorized()"
                );
        });

        it('it emits fail in executeProposal', async function () {
            let transactionData = avatar.interface.encodeFunctionData("setGovernor", [authorizer_adaptor.address]);
            await avatar.execTransactionFromModule(avatar.address, 0, transactionData, 0);
            expect(await avatar.governor()).to.equals(authorizer_adaptor.address);
            let encodedFail = "0x";
            await expect(avatar.connect(authorizer_adaptor).executeProposal(mockModule.address, 0, encodedFail, 0))
                .to
                .emit(avatar, "ExecutionFromGovernorFailure").withArgs(authorizer_adaptor.address);
        });

        it('it emits success in executeProposal', async function () {
            iface = new ethers.utils.Interface([
                "function testInteraction(uint256 value)"
            ]);
            encoded = iface.encodeFunctionData("testInteraction", ["1"]);

            // call
            await expect(avatar.connect(authorizer_adaptor).executeProposal(mockModule.address, 0, encoded, 0))
                .to
                .emit(avatar, "ExecutionFromGovernorSuccess").withArgs(authorizer_adaptor.address);

            // delegate call
            await expect(avatar.connect(authorizer_adaptor).executeProposal(mockModule.address, 0, encoded, 1))
                .to
                .emit(avatar, "ExecutionFromGovernorSuccess").withArgs(authorizer_adaptor.address);
        });
    });

    context("function: proposeAfterVote()", () => {
        it("Should fail when not called by the `reality` address", async function () {
            let transactionData = mockModule.interface.encodeFunctionData("testInteraction", [1]);
            await expect(avatar.connect(user2).proposeAfterVote([mockModule.address], [0], [transactionData])).
                to.be.revertedWith("Unauthorized()");
        });
    });
});