const { expect } = require('chai');
const { ethers } = require('hardhat');
const init = require('../test-init.js');

// let AMOR; // need for AMORxGuild
let AMORxGuild; // need for testing propose() function
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
let firstProposalId;

describe('unit - Contract: Governor', function () {

    const setupTests = deployments.createFixture(async () => {
        const signers = await ethers.getSigners();
        const setup = await init.initialize(signers);
        await init.getTokens(setup);

        // AMOR = setup.tokens.AmorTokenImplementation;
        AMORxGuild = setup.tokens.AmorGuildToken;
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
            expect(await governor.snapshotAddress()).to.equals(authorizer_adaptor.address);
            expect(await governor.avatarAddress()).to.equals(authorizer_adaptor.address);
            expect(await governor.guardians(0)).to.equals(root.address);
            expect(await governor.proposalThreshold()).to.equals(0);
        });

        it("Should fail if called more than once", async function () {
            await expect(governor.init(
                AMORxGuild.address, //AMORxGuild
                authorizer_adaptor.address, // Snapshot Address
                authorizer_adaptor.address, // Avatar Address
                64000, // voting time
                0 // proposalThreshold
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

        it('it fails to propose if not the avatar', async function () {
            targets = [authorizer_adaptor.address];
            values = [12];
            // building hash has to come from system address
            // 32 bytes of data
            let messageHash = ethers.utils.solidityKeccak256(
                ["address"],
                [authorizer_adaptor.address]
            );
            calldatas = [messageHash];
            description = 'proposal';

            await expect(governor.connect(user).propose(targets, values, calldatas, description)).to.be.revertedWith(
                'Unauthorized()'
            );
        });
        
        it('it proposes', async function () {
            await governor.connect(authorizer_adaptor).propose(targets, values, calldatas, description);
            expect(await governor.proposalCount()).to.equals(1);
            firstProposalId = await governor.proposals(0);
            await governor.connect(authorizer_adaptor).state(firstProposalId);
            expect((await governor.proposalVoting(firstProposalId)).toString()).to.equals("0");
            expect((await governor.proposalWeight(firstProposalId)).toString()).to.equals("0");

            await governor.connect(authorizer_adaptor).propose(targets, values, calldatas, "descriprion2");
        });

        it('it fails to propose if proposal already exists', async function () {
            await expect(governor.connect(authorizer_adaptor).propose(targets, values, calldatas, description)).to.be.revertedWith(
                'Governor: proposal already exists'
            );
        });

        it('it fails to propose if information arity mismatch', async function () {
            await expect(governor.connect(authorizer_adaptor).propose([], values, calldatas, description)).to.be.revertedWith(
                'Governor::propose: proposal function information arity mismatch'
            );
        });

        it('it fails to propose if empty proposal', async function () {
            await expect(governor.connect(authorizer_adaptor).propose([], [], [], description)).to.be.revertedWith(
                'Governor: empty proposal'
            );
        });

    });

    context('» castVote testing', () => {

        it('it fails to castVote if not the guardian', async function () {
            await expect(governor.connect(authorizer_adaptor).castVote(firstProposalId, 1)).to.be.revertedWith(
                'Unauthorized()'
            );
        });

        // it('it fails to castVote if vote not currently active', async function () {
        //     await expect(governor.connect(root).castVote(firstProposalId, 1)).to.be.revertedWith(
        //         'Governor: vote not currently active'
        //     );
        // });

        it('it fails to castVote if unknown proposal id', async function () {
            let invalidId = 999;
            await expect(governor.connect(root).castVote(invalidId, 1)).to.be.revertedWith(
                'Governor: unknown proposal id'
            );
        });

        it('it casts Vote', async function () {
            await governor.connect(root).castVote(firstProposalId, 1);
        });
    });

    context('» execute testing', () => {

        it('it fails to execute if proposal not successful', async function () {
            let descriprionHash = ethers.utils.solidityKeccak256(
                ["string"],
                ["descriprion2"]
            );
            await expect(governor.connect(root).execute(targets, values, calldatas, descriprionHash)).to.be.revertedWith(
                'Governor: proposal not successful'
            );
        });

        it('it executes proposal', async function () {
            // mine 64000 blocks
            await hre.network.provider.send("hardhat_mine", ["0xFA00"]);

            let descriprionHash = ethers.utils.solidityKeccak256(
                ["string"],
                [description]
            );
            await governor.connect(authorizer_adaptor).execute(targets, values, calldatas, descriprionHash);
        });
    });
});
