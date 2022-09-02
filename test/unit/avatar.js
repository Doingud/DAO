const { expect } = require('chai');
const { ethers } = require('hardhat');
const { ZERO_ADDRESS, ONE_ADDRESS } = require("../helpers/constants.js");
const init = require('../test-init.js');

// let AMOR; // need for AMORxGuild
let avatar;
let authorizer_adaptor;
let operator;
let user;

describe('unit - Contract: Avatar', function () {

    const setupTests = deployments.createFixture(async () => {
        const signers = await ethers.getSigners();
        const setup = await init.initialize(signers);
        await init.getTokens(setup);

        // AMOR = setup.tokens.AmorTokenImplementation;
        AMORxGuild = setup.tokens.AmorGuildToken;
        // await init.controller(setup);
        avatar =await init.avatar(setup);
        // governor = await init.governor(setup);
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
});