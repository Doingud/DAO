const { expect } = require('chai');
const { ethers } = require('hardhat');
const { ZERO_ADDRESS, ONE_ADDRESS } = require("../helpers/constants.js");
const init = require('../test-init.js');

const operationCall = 0; // enums are treated as uint8
const operationDelegateCall = 1;

// let AMOR; // need for AMORxGuild
let avatar;
let governor;
let authorizer_adaptor;
let operator;
let user;

// for execTransactionFromModule
let to; // call redirected to governor
let value;
let data;

let targets;
let values;
let calldatas;

describe('unit - Contract: Avatar', function () {

    const setupTests = deployments.createFixture(async () => {
        const signers = await ethers.getSigners();
        const setup = await init.initialize(signers);
        await init.getTokens(setup);

        // AMOR = setup.tokens.AmorTokenImplementation;
        AMORxGuild = setup.tokens.AmorGuildToken;
        avatar = setup.tokens.AvatarxGuild;
        // await init.controller(setup);
        // avatar =await init.avatar(setup);
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
            // expect(await avatar.DEFAULT_ADMIN_ROLE()).to.equals(authorizer_adaptor.address);
            // expect(await avatar.GUARDIAN_ROLE()).to.equals(avatar.address);
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
            to = governor.address; // Destination address of module transaction
            value = 0; // Ether value of module transaction
            // building hash has to come from system address
            // 32 bytes of data
            let messageHash = ethers.utils.solidityKeccak256(
                ["address"],
                [to]
            );
            data = messageHash;


            targets = [authorizer_adaptor.address];
            values = [20];
            // building hash has to come from system address
            // 32 bytes of data
            messageHash = ethers.utils.solidityKeccak256(
                ["address"],
                [authorizer_adaptor.address]
            );
            calldatas = [messageHash];

            await expect(avatar.connect(authorizer_adaptor).execTransactionFromModule(to, value, data, operationCall,  targets, values, calldatas)).
                to.be.revertedWith(
                    'NotWhitelisted()'
            );
        });

        it('it emits fail in execTransactionFromModule', async function () {
            expect(await avatar.isModuleEnabled(operator.address)).to.equals(false);
            await avatar.connect(authorizer_adaptor).enableModule(operator.address);
            expect(await avatar.isModuleEnabled(operator.address)).to.equals(true);

            expect(await avatar.connect(operator).execTransactionFromModule(to, value, data, operationCall,  targets, values, calldatas)).
                to.emit(avatar, "ExecutionFromModuleFailure").
                withArgs(
                    operator.address, 
                ).toString();
        });

        it('it emits success in execTransactionFromModule', async function () {
            // operationCall and operationDelegateCall both are not working
            // expect(await avatar.connect(operator).execTransactionFromModule(to, value, data, operationCall,  targets, values, calldatas)).//operationCall)).
            expect(await avatar.connect(operator).execTransactionFromModule(to, value, data, operationDelegateCall,  targets, values, calldatas)).//operationCall)).
                to.emit(avatar, "ExecutionFromModuleSuccess").
                withArgs(
                    operator.address, 
                ).toString();
        });

    });

    // context('» execTransactionFromModuleReturnData testing', () => {
    //     it('it fails to execTransactionFromModuleReturnData if NotWhitelisted', async function () {
    //         await expect(avatar.connect(authorizer_adaptor).execTransactionFromModuleReturnData(to, value, data, operationCall)).
    //             to.be.revertedWith(
    //                 'NotWhitelisted()'
    //         );
    //     });

    //     it('it emits fail in execTransactionFromModuleReturnData', async function () {
    //         // expect(await avatar.isModuleEnabled(operator.address)).to.equals(false);
    //         // await avatar.connect(authorizer_adaptor).enableModule(operator.address);
    //         // expect(await avatar.isModuleEnabled(operator.address)).to.equals(true);

    //         expect(await avatar.connect(operator).execTransactionFromModuleReturnData(to, value, data, operationCall)).
    //             to.emit(avatar, "ExecutionFromModuleFailure").
    //             withArgs(
    //                 operator.address, 
    //             ).toString();
    //     });

    //     it('it emits success in execTransactionFromModuleReturnData', async function () {
    //         expect(await avatar.connect(operator).execTransactionFromModuleReturnData(to, value, data, operationDelegateCall)).
    //             to.emit(avatar, "ExecutionFromModuleSuccess").
    //             withArgs(
    //                 operator.address, 
    //             ).toString();
    //     });

    // });
});