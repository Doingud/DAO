const { expect } = require('chai');
const { ethers } = require('hardhat');
const { ZERO_ADDRESS, ONE_ADDRESS } = require("../helpers/constants.js");
const init = require('../test-init.js');

let avatar;
let authorizer_adaptor;
let operator;
let mockModule;

let iface;
let encoded;

describe('unit - Contract: Avatar', function () {

    const setupTests = deployments.createFixture(async () => {
        const signers = await ethers.getSigners();
        const setup = await init.initialize(signers);
        await init.getTokens(setup);
        AMORxGuild = setup.tokens.AmorGuildToken;
        await init.avatar(setup);
        avatar = setup.avatars.avatar;
        mockModule = setup.avatars.module;
        await init.governor(setup);
        await init.governor(setup);
        root = setup.roles.root;
        staker = setup.roles.staker;
        operator = setup.roles.operator;
        authorizer_adaptor = setup.roles.authorizer_adaptor;
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
            await expect(avatar.connect(user).setGovernor(ZERO_ADDRESS)).to.be.revertedWith(
                'Unauthorized()'
            );
        });

        it('it sets Governor', async function () {
            expect(await avatar.governor()).to.equals(authorizer_adaptor.address);
            await avatar.connect(root).setGovernor(ZERO_ADDRESS);
            expect(await avatar.governor()).to.equals(ZERO_ADDRESS);
        });

        it('it fails to setGovernor if trying to add same address twice', async function () {
            await expect(avatar.connect(root).setGovernor(ZERO_ADDRESS)).to.be.revertedWith(
                'AlreadyInitialized()'
            );

            await avatar.connect(root).setGovernor(authorizer_adaptor.address);
        });
    });

    context('» enableModule testing', () => {
        it('it fails to enableModule if InvalidParameters', async function () {
            /// Low level calls to other contracts does not cause `execTransactionFromModule` to revert
            let transactionCallData = avatar.interface.encodeFunctionData("enableModule", [ZERO_ADDRESS]);
            await avatar.execTransactionFromModule(avatar.address, 0, transactionCallData, 0);
            expect(await avatar.isModuleEnabled(ZERO_ADDRESS)).to.be.false;
        });

        it('it enables Module', async function () {
            expect(await avatar.isModuleEnabled(operator.address)).to.equals(false);
            let transactionCallData = avatar.interface.encodeFunctionData("enableModule", [operator.address]);
            await avatar.execTransactionFromModule(avatar.address, 0, transactionCallData, 0);
            //await avatar.enableModule(operator.address);
            expect(await avatar.isModuleEnabled(operator.address)).to.equals(true);
        });

        it('it fails to enableModule if trying to add twice', async function () {
            let enabledModulesBefore = await avatar.getModulesPaginated(ONE_ADDRESS, 5);
            /// This revert cannot be observed by hardhat
            let transactionCallData = avatar.interface.encodeFunctionData("enableModule", [operator.address]);
            await avatar.execTransactionFromModule(avatar.address, 0, transactionCallData, 0);
            //  But we can check the length of the linked list of enabled modules
            let enabledModulesAfter = await avatar.getModulesPaginated(ONE_ADDRESS, 5);
            expect(enabledModulesBefore.array.length).to.equal(enabledModulesAfter.array.length);
            
        });
    });

    context('» disableModule testing', () => {
        it('it fails to disableModule if InvalidParameters', async function () {
            let enabledModulesBefore = await avatar.getModulesPaginated(ONE_ADDRESS, 5);
            let transactionCallData = avatar.interface.encodeFunctionData("disableModule", [ONE_ADDRESS, ZERO_ADDRESS]);
            await avatar.execTransactionFromModule(avatar.address, 0, transactionCallData, 0);
            //  But we can check the length of the linked list of enabled modules
            let enabledModulesAfter = await avatar.getModulesPaginated(ONE_ADDRESS, 5);
            expect(enabledModulesBefore.array.length).to.equal(enabledModulesAfter.array.length);
        });

        it('it disable Module', async function () {
            expect(await avatar.isModuleEnabled(operator.address)).to.equals(true);
            const prevModule = ONE_ADDRESS;
            let transactionCallData = avatar.interface.encodeFunctionData("disableModule", [prevModule, operator.address]);
            await avatar.execTransactionFromModule(avatar.address, 0, transactionCallData, 0);
            expect(await avatar.isModuleEnabled(operator.address)).to.equals(false);
        });

        it('it fails to disableModule if trying to add twice', async function () {
            let enabledModulesBefore = await avatar.getModulesPaginated(ONE_ADDRESS, 5);
            const prevModule = ONE_ADDRESS;
            let transactionCallData = avatar.interface.encodeFunctionData("disableModule", [prevModule, operator.address]);
            await avatar.execTransactionFromModule(avatar.address, 0, transactionCallData, 0);
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
            let encodedFail = "0x";
            await expect(avatar.execTransactionFromModule(avatar.address, 0, encodedFail, 0)).
                to.emit(avatar, "ExecutionFromModuleFailure").
                withArgs(root.address);
        });

        it('it emits success in execTransactionFromModule', async function () {
            expect(await avatar.isModuleEnabled(root.address)).to.be.true;
            let transactionCallData = avatar.interface.encodeFunctionData("enableModule", [operator.address]);

            // call test
            await expect(avatar.execTransactionFromModule(avatar.address, 0, transactionCallData, 0))
                .to
                .emit(avatar, "ExecutionFromModuleSuccess").withArgs(root.address);

            // delegate call
            await expect(avatar.connect(root).execTransactionFromModule(governor.address, 0, encoded, 1))
                .to
                .emit(avatar, "ExecutionFromModuleSuccess").withArgs(root.address);
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
            let transactionCallData = avatar.interface.encodeFunctionData("disableModule", [ONE_ADDRESS, operator.address]);
            await expect(avatar.execTransactionFromModuleReturnData(avatar.address, 0, transactionCallData, 0))
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
            expect(array.length).to.equal(2);
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
});