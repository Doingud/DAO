const { expect } = require('chai');
const { ethers } = require('hardhat');
const init = require('../test-init.js');

// let AMOR;
// let AMORxGuild; // need for testing propose() function
let governor;
let root;
let authorizer_adaptor;
let operator;
let user;
let user2;
let staker;
let guardians;

describe('unit - Contract: Governor', function () {

    const setupTests = deployments.createFixture(async () => {
        const signers = await ethers.getSigners();
        const setup = await init.initialize(signers);
        await init.getTokens(setup);
        await init.metadao(setup);
        // AMOR = setup.tokens.AmorTokenImplementation;
        // AMORxGuild = setup.tokens.AmorGuildToken;
        await init.controller(setup);
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
            expect(await governor.owner()).to.equals(root.address);
            expect(await governor.snapshotAddress()).to.equals(authorizer_adaptor.address);
            expect(await governor.guardians(0)).to.equals(root.address);
        });

        it("Should fail if called more than once", async function () {
            await expect(governor.init(
                root.address, // owner
                authorizer_adaptor.address // snapshot
            )).to.be.revertedWith("Already initialized");
        });
    });

    context('» setGuardians testing', () => {
        it('it fails to set guardians if not the snapshot', async function () {
            guardians = [staker.address, operator.address, user.address];
            await expect(governor.connect(user).setGuardians(guardians)).to.be.revertedWith(
                'Unauthorized()'
            );
        });

        it('it fails to set guardians if no addresses in array', async function () {
            await expect(governor.connect(authorizer_adaptor).setGuardians([])).to.be.revertedWith(
                'InvalidParameters()'
            );
        });

        it('it sets guardians', async function () {
            await governor.connect(authorizer_adaptor).setGuardians(guardians);
            expect(await governor.guardians(0)).to.equals(staker.address);
            expect(await governor.guardians(1)).to.equals(operator.address);
            expect(await governor.guardians(2)).to.equals(user.address);
        });
    });

    context('» addGuardian testing', () => {

        it('it fails to add guardian if not the snapshot', async function () {
            await expect(governor.connect(user).addGuardian(user2.address)).to.be.revertedWith(
                'Unauthorized()'
            );
        });

        it('it adds guardian', async function () {
            await governor.connect(authorizer_adaptor).addGuardian(user2.address);
            expect(await governor.guardians(3)).to.equals(user2.address);
        });

        it('it fails to add guardian with the same address', async function () {
            await expect(governor.connect(authorizer_adaptor).addGuardian(user2.address)).to.be.revertedWith(
                'InvalidParameters()'
            );
        });
    });

    context('» changeGuardian testing', () => {

        it('it fails to change guardian if not the snapshot', async function () {
            await expect(governor.connect(user).changeGuardian(1, user2.address)).to.be.revertedWith(
                'Unauthorized()'
            );
        });

        it('it fails to change guardian if already have guardian with the same address', async function () {
            await expect(governor.connect(authorizer_adaptor).changeGuardian(1, user2.address)).to.be.revertedWith(
                'InvalidParameters()'
            );
        });

        it('it changes guardian', async function () {
            await governor.connect(authorizer_adaptor).changeGuardian(1, root.address);
            expect(await governor.guardians(1)).to.equals(root.address);
        });
    });

    context('» removeGuardian testing', () => {

        it('it fails to remove guardian if not the snapshot', async function () {
            await expect(governor.connect(user).removeGuardian(root.address)).to.be.revertedWith(
                'Unauthorized()'
            );
        });

        it('it removes guardian', async function () {
            await governor.connect(authorizer_adaptor).removeGuardian(root.address);
            expect(await governor.guardians(1)).to.equals(user2.address);
            await expect(governor.guardians(3)).to.be.reverted;
        });
    });
});