const { expect } = require('chai');
const { ethers } = require('hardhat');
const init = require('../test-init.js');

// let AMOR; // need for AMORxGuild
// let AMORxGuild; // need for testing propose() function
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
let description;

describe('unit - Contract: Governor', function () {

    const setupTests = deployments.createFixture(async () => {
        const signers = await ethers.getSigners();
        const setup = await init.initialize(signers);
        await init.getTokens(setup);

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

    context('» propose testing', () => {

        it('it fails to propose if not the snapshot', async function () {
            targets = [authorizer_adaptor];
            values = [12];
            // building hash has to come from system address
            // 32 bytes of data
            let messageHash = ethers.utils.solidityKeccak256(
                ["address"],
                [authorizer_adaptor.address]
            );

            // 32 bytes of data in Uint8Array
            let messageHashBinary = ethers.utils.arrayify(messageHash);
            calldatas = [messageHash];
            description = 'proposal';

            await expect(governor.connect(user).propose(targets, values, calldatas,description)).to.be.revertedWith(
                'Unauthorized()'
            );
        });

        it('it fails to propose if invalid proposal length', async function () {
            await expect(governor.connect(authorizer_adaptor).propose(1, user2.address)).to.be.revertedWith(
                'Governor: invalid proposal length'
            );
        });

        it('it fails to propose if empty proposal', async function () {
            await expect(governor.connect(authorizer_adaptor).propose(1, user2.address)).to.be.revertedWith(
                'Governor: empty proposal'
            );
        });

        it('it fails to propose if proposal already exists', async function () {
            await expect(governor.connect(authorizer_adaptor).propose(1, user2.address)).to.be.revertedWith(
                'Governor: proposal already exists'
            );
        });

        it('it proposes', async function () {
            await governor.connect(authorizer_adaptor).propose(1, root.address);
            expect(await governor.guardians(1)).to.equals(root.address);
        });
    });
});