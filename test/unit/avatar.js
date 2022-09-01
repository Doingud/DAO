const { time } = require("@openzeppelin/test-helpers");
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { ZERO_ADDRESS } = require("../helpers/constants.js");
const init = require('../test-init.js');

const twoWeeks = time.duration.days(14);

// let AMOR; // need for AMORxGuild
let AMORxGuild; // need for testing propose() function
let avatar;
let governor;
let root;
let authorizer_adaptor;
let operator;
let user;
let user2;
let staker;
let guardians;

let targets;
let values;
let calldatas;
let firstProposalId;
let secondProposalId;

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

        it('it enables Module guardians', async function () {
            await avatar.connect(authorizer_adaptor).enableModule(operator.address);
            // expect(await avatar.guardians(1)).to.equals(operator.address);
            // expect(await avatar.guardians(2)).to.equals(user.address);
        });

        it('it fails to enableModule if trying to add twice', async function () {
            await expect(avatar.connect(authorizer_adaptor).enableModule(operator.address)).to.be.revertedWith(
                'InvalidParameters()'
            );
        });
    });
});