const { expect } = require('chai');
const { ethers } = require('hardhat');
const { ZERO_ADDRESS, ONE_ADDRESS, TWO_ADDRESS } = require("../helpers/constants.js");
const init = require('../test-init.js');

let avatar;
let governor;
let authorizer_adaptor;
let operator;
let user;
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
        governor = await init.governor(setup);
        root = setup.roles.root;
        staker = setup.roles.staker;
        operator = setup.roles.operator;
        authorizer_adaptor = setup.roles.authorizer_adaptor;
        user = setup.roles.user3;
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

    context('» enableModule testing', () => {
        it('it fails to enableModule if InvalidParameters', async function () {
            await expect(avatar.connect(user).enableModule(ZERO_ADDRESS)).to.be.revertedWith(
                'NotEnabled()'
            );
        });

        it('it enables Module', async function () {
            expect(await avatar.isModuleEnabled(operator.address)).to.equals(false);
            await avatar.connect(authorizer_adaptor).enableModule(operator.address);
            expect(await avatar.isModuleEnabled(operator.address)).to.equals(true);
        });

        it('it fails to enableModule if trying to add twice', async function () {
            await expect(avatar.connect(authorizer_adaptor).enableModule(operator.address)).to.be.revertedWith(
                'InvalidParameters()'
            );
        });
    });

    context('» disableModule testing', () => {
        it('it fails to disableModule if InvalidParameters', async function () {
            await expect(avatar.connect(user).disableModule(ONE_ADDRESS, ZERO_ADDRESS)).to.be.revertedWith(
                'NotDisabled()'
            );
        });

        it('it disable Module', async function () {
            expect(await avatar.isModuleEnabled(operator.address)).to.equals(true);
            const prevModule = ONE_ADDRESS;
            await avatar.connect(authorizer_adaptor).disableModule(prevModule, operator.address);
            expect(await avatar.isModuleEnabled(operator.address)).to.equals(false);
        });

        it('it fails to disableModule if trying to add twice', async function () {
            await expect(avatar.connect(authorizer_adaptor).disableModule(ONE_ADDRESS, operator.address)).to.be.revertedWith(
                'InvalidParameters()'
            );
        });
    });

    context('» execTransactionFromModule testing', () => {
        it('it fails to execTransactionFromModule if NotWhitelisted', async function () {
            expect(await avatar.isModuleEnabled(root.address)).to.be.false;

            iface = new ethers.utils.Interface([
                "function testInteraction(uint256 value)"
            ]);
            encoded = iface.encodeFunctionData("testInteraction", ["1"]);

            await expect(avatar.connect(root).execTransactionFromModule(mockModule.address, 0, encoded, 0))
                .to.be.revertedWith(
                    'NotWhitelisted()'
            );
        });

        it('it emits fail in execTransactionFromModule', async function () {
            await avatar.connect(authorizer_adaptor).enableModule(root.address);

            let encodedFail = "0x";
            await expect(avatar.connect(root).execTransactionFromModule(mockModule.address, 0, encodedFail, 0))
                .to
                .emit(avatar, "ExecutionFromModuleFailure").withArgs(root.address);
            expect(await mockModule.testValues()).to.equal(0);
        });

        it('it emits success in execTransactionFromModule', async function () {
            expect(await avatar.isModuleEnabled(root.address)).to.be.true;

            // call test
            await expect(avatar.connect(root).execTransactionFromModule(mockModule.address, 0, encoded, 0))
                .to
                .emit(avatar, "ExecutionFromModuleSuccess").withArgs(root.address);
            expect(await mockModule.testValues()).to.equal(1);

            targets = [authorizer_adaptor.address];
            values = [20];
            calldatas = [AMORxGuild.interface.encodeFunctionData('transfer', [authorizer_adaptor.address, 0])]; // transferCalldata from https://docs.openzeppelin.com/contracts/4.x/governance
            iface = new ethers.utils.Interface([
                "function execute(address[] memory targets, uint256[] memory values, bytes[] memory calldatas)"
            ]);
            encoded = iface.encodeFunctionData("execute", [targets, values, calldatas]);

            // governor test
            await expect(avatar.connect(root).execTransactionFromModule(governor.address, 0, encoded, 0))
                .to
                .emit(avatar, "ExecutionFromModuleSuccess").withArgs(root.address);
        });
    });

    context('» execTransactionFromModuleReturnData testing', () => {
        it('it fails to execTransactionFromModuleReturnData if NotWhitelisted', async function () {
            expect(await avatar.isModuleEnabled(staker.address)).to.be.false;

            await expect(avatar.connect(staker).execTransactionFromModuleReturnData(mockModule.address, 0, encoded, 0))
                .to.be.revertedWith(
                    'NotWhitelisted()'
            );
        });

        it('it emits fail in execTransactionFromModuleReturnData', async function () {
            expect(await avatar.isModuleEnabled(root.address)).to.equals(true);

            let encodedFail = "0x";
            expect(await avatar.connect(root).execTransactionFromModuleReturnData(mockModule.address, 0, encodedFail, 0))
                .to.emit(avatar, "ExecutionFromModuleFailure").withArgs(root.address);
        });

        it('it emits success in execTransactionFromModuleReturnData', async function () {
            iface = new ethers.utils.Interface([
                "function testInteraction(uint256 value)"
            ]);
            encoded = iface.encodeFunctionData("testInteraction", ["2"]);
            expect(await mockModule.testValues()).to.equal(1);

            expect(await avatar.isModuleEnabled(root.address)).to.equals(true);
            expect(await avatar.connect(root).execTransactionFromModuleReturnData(mockModule.address, 0, encoded, 0))
                .to.emit(avatar, "ExecutionFromModuleSuccess").withArgs(root.address);

            expect(await mockModule.testValues()).to.equal(2);
        });
    });

    context('» getModulesPaginated testing', () => {
        it("returns array of enabled modules", async () => {
            let transaction = await avatar.enableModule(user2.address);
            let array, next;
            [array, next] = await avatar.getModulesPaginated(user2.address, 1);
            await expect(array.toString()).to.be.equals([root.address].toString());
            await expect(next).to.be.equals(TWO_ADDRESS);
        });
    });

    context('» executeProposal testing', () => {
        it('it emits fail in executeProposal if not guardian', async function () {
            await expect(avatar.connect(root).executeProposal(mockModule.address, 0, encoded, 0))
                .to.be.revertedWith(
                    "AccessControl: account 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266 is missing role 0x8b5b16d04624687fcf0d0228f19993c9157c1ed07b41d8d430fd9100eb099fe8"
                );
        });

        it('it emits fail in executeProposal', async function () {
            let encodedFail = "0x";
            await expect(avatar.connect(authorizer_adaptor).executeProposal(mockModule.address, 0, encodedFail, 0))
                .to
                .emit(avatar, "ExecutionFromGuardianFailure").withArgs(authorizer_adaptor.address);
        });

        it('it emits success in executeProposal', async function () {
            iface = new ethers.utils.Interface([
                "function testInteraction(uint256 value)"
            ]);
            encoded = iface.encodeFunctionData("testInteraction", ["1"]);

            await expect(avatar.connect(authorizer_adaptor).executeProposal(mockModule.address, 0, encoded, 0))
                .to
                .emit(avatar, "ExecutionFromGuardianSuccess").withArgs(authorizer_adaptor.address);
        });
    });
});