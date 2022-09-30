const { time } = require("@openzeppelin/test-helpers");
const { expect } = require('chai');
const { ethers } = require('hardhat');
const init = require('../test-init.js');

const twoWeeks = time.duration.days(14);

// let AMOR; // need for AMORxGuild
let AMORxGuild; // need for testing propose() function
let avatar;
let governor;
let mockModule;

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
let thirdProposalId;

describe('unit - Contract: Governor', function () {

    const setupTests = deployments.createFixture(async () => {
        const signers = await ethers.getSigners();
        const setup = await init.initialize(signers);
        await init.getTokens(setup);
        await init.metadao(setup);
        AMORxGuild = setup.tokens.AmorGuildToken;
        await init.controller(setup);
        await init.avatar(setup);
        avatar = setup.avatars.avatar;
        mockModule = setup.avatars.module;
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
            expect(await governor.avatarAddress()).to.equals(avatar.address);
            expect(await governor.guardians(0)).to.equals(root.address);
            expect((await governor.votingDelay())).to.equals(1);
            let weeks = 60 * 60 * 24 * 7 * 2;
            expect(await governor.votingPeriod()).to.equals(weeks);
        });

        it("Should fail if called more than once", async function () {
            await expect(governor.init(
                "newName",
                AMORxGuild.address, //AMORxGuild
                authorizer_adaptor.address, // Snapshot Address
                authorizer_adaptor.address // Avatar Address
            )).to.be.revertedWith("AlreadyInitialized()");
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
            targets = [mockModule.address];
            values = [0];
            calldatas = [mockModule.interface.encodeFunctionData("testInteraction", [20])]; // transferCalldata from https://docs.openzeppelin.com/contracts/4.x/governance

            await expect(governor.connect(user).propose(targets, values, calldatas)).to.be.revertedWith(
                'Unauthorized()'
            );
        });
        
        it('it proposes', async function () {
            await expect(governor.proposals(0)).to.be.reverted;
            await governor.connect(authorizer_adaptor).propose(targets, values, calldatas);
            
            await expect(governor.proposals(1)).to.be.reverted;
            firstProposalId = await governor.proposals(0);
            await governor.connect(authorizer_adaptor).state(firstProposalId);
            expect((await governor.proposalVoting(firstProposalId)).toString()).to.equals("0");
            expect((await governor.proposalWeight(firstProposalId)).toString()).to.equals("0");

            let newMessageHash = ethers.utils.solidityKeccak256(
                ["address"],
                [staker.address]
            );
            newcalldatas = [newMessageHash];

            await governor.connect(authorizer_adaptor).propose(targets, values, newcalldatas);
            secondProposalId = await governor.proposals(1);
        });

        it('it fails to propose if proposal already exists', async function () {
            await expect(governor.connect(authorizer_adaptor).propose(targets, values, calldatas)).to.be.revertedWith(
                'InvalidState()'
            );
        });

        it('it fails to propose if proposal function information arity mismatch', async function () {
            await expect(governor.connect(authorizer_adaptor).propose(targets, [1, 2, 3], calldatas)).to.be.revertedWith(
                'InvalidParameters()'
            );
        });

        it('it fails to propose if empty proposal', async function () {
            await expect(governor.connect(authorizer_adaptor).propose([], [], [])).to.be.revertedWith(
                'InvalidParameters()'
            );
        });

        it('it fails to propose if too many actions', async function () {
            let tooManyTargets = [
                root.address, root.address, root.address, 
                root.address, root.address, root.address,
                root.address, root.address, root.address,
                root.address, root.address
            ];
            let tooManyValues = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
            let messageHash = ethers.utils.solidityKeccak256(
                ["address"],
                [authorizer_adaptor.address]
            );
            let tooManyCalldatas = [
                messageHash, messageHash, messageHash,
                messageHash, messageHash, messageHash,
                messageHash, messageHash, messageHash,
                messageHash, messageHash
            ];

            await expect(governor.connect(authorizer_adaptor).propose(tooManyTargets, tooManyValues, tooManyCalldatas)).to.be.revertedWith(
                'InvalidParameters()'
            );


            let unSTargets = [mockModule.address];
            let unSValues = [20];
            let unSCalldatas = [mockModule.interface.encodeFunctionData("testInteraction", [20])];

            await governor.connect(authorizer_adaptor).propose(unSTargets, unSValues, unSCalldatas);
            thirdProposalId = await governor.proposals(2);
        });
    });

    context('» castVote testing', () => {

        it('it fails to castVote if not the guardian', async function () {
            await expect(governor.connect(authorizer_adaptor).castVote(firstProposalId, 1)).to.be.revertedWith(
                'Unauthorized()'
            );
        });

        it('it fails to castVote if unknown proposal id', async function () {
            let invalidId = 999;
            await expect(governor.connect(root).castVote(invalidId, true)).to.be.revertedWith(
                'Governor: unknown proposal id'
            );
        });

        it('it casts Vote', async function () {
            await governor.connect(root).castVote(firstProposalId, true);
            await governor.connect(user).castVote(firstProposalId, true);
            await governor.connect(user2).castVote(firstProposalId, false);
            expect(await governor.proposalVoting(firstProposalId)).to.equals(2);
            expect(await governor.proposalWeight(firstProposalId)).to.equals(3);


            await governor.connect(root).castVote(thirdProposalId, true);
            await governor.connect(user).castVote(thirdProposalId, true);
            await governor.connect(user2).castVote(thirdProposalId, true);
        });

        it('it fails to castVote if already voted', async function () {
            await expect(governor.connect(root).castVote(firstProposalId, false)).to.be.revertedWith(
                'AlreadyVoted()'
            );
        });
    });

    context('» execute testing', () => {

        it('it fails to execute if unknown proposal id', async function () {
            await expect(governor.connect(root).execute([user.address], values, calldatas)).to.be.revertedWith(
                'Governor: unknown proposal id'
            );
        });

        it('it fails to cancel if cancel not approved', async function () {
            await expect(governor.connect(root).cancel(firstProposalId)).to.be.revertedWith(
                'CancelNotApproved()'
            );
        });

        it('it fails to execute if UnderlyingTransactionReverted', async function () {
            // mine 64000 blocks
            await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
            time.increase(twoWeeks);

            let unSTargets = [mockModule.address];
            let unSValues = [20];
            let unSCalldatas = [mockModule.interface.encodeFunctionData("testInteraction", [20])];

            await avatar.connect(root).setGovernor(governor.address);
            await expect(governor.connect(authorizer_adaptor).execute(unSTargets, unSValues, unSCalldatas))
                .to.be.revertedWith(
                'UnderlyingTransactionReverted()'
            );
        });
    
        it('it executes proposal', async function () {
            expect(await mockModule.testValues()).to.equal(0);

            await expect(governor.connect(authorizer_adaptor).execute(targets, values, calldatas))
                .to
                .emit(governor, "ProposalExecuted").withArgs(firstProposalId);

            expect(await mockModule.testValues()).to.equal(20);
            await expect(governor.voters(firstProposalId)).to.be.reverted;
        });

        it('it fails to castVote if vote not currently active', async function () {
            // mine 64000 blocks
            await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
            time.increase(twoWeeks);
            await expect(governor.connect(root).castVote(secondProposalId, 1)).to.be.revertedWith(
                'InvalidState()'
            );
        });

        it('it fails to execute if proposal not successful', async function () {
            await expect(governor.connect(root).execute(targets, values, newcalldatas)).to.be.revertedWith(
                'InvalidState()'
            );
        });

        it('it fails to castVote second time to the proposal with the same id', async function () {
            await expect(governor.connect(root).castVote(firstProposalId, 1)).to.be.revertedWith(
                'Governor: unknown proposal id'
            );
        });
    });

    context('» removeGuardian testing', () => {

        it('it fails to remove guardian if not the snapshot', async function () {
            await expect(governor.connect(user).removeGuardian(root.address)).to.be.revertedWith(
                'Unauthorized()'
            );
        });

        it('it removes guardian', async function () {
            expect(await governor.guardians(3)).to.equals(user2.address);
            await governor.connect(authorizer_adaptor).removeGuardian(root.address);
            expect(await governor.guardians(1)).to.equals(user2.address);
            await expect(governor.guardians(3)).to.be.reverted;
        });
    });

    context('» castVoteForCancelling and cancel testing', () => {

        it('it fails to castVoteForCancelling if not the guardian', async function () {
            targets = [staker.address];
            await governor.connect(authorizer_adaptor).propose(targets, values, calldatas);
            secondProposalId = await governor.proposals(3);

            await expect(governor.connect(authorizer_adaptor).castVoteForCancelling(secondProposalId)).to.be.revertedWith(
                'Unauthorized()'
            );
        });

        it('it fails to castVoteForCancelling if unknown proposal id', async function () {
            let invalidId = 999;
            await expect(governor.connect(user).castVoteForCancelling(invalidId)).to.be.revertedWith(
                'Governor: unknown proposal id'
            );
        });

        it('it casts vote for cancelling', async function () {
            await governor.connect(user).castVoteForCancelling(secondProposalId);
            await governor.connect(user2).castVoteForCancelling(secondProposalId);
            expect(await governor.proposalCancelApproval(secondProposalId)).to.equals(2);
        });

        it('it fails to cast vote for cancelling if already voted', async function () {
            await expect(governor.connect(user).castVoteForCancelling(secondProposalId)).to.be.revertedWith(
                'AlreadyVoted()'
            );
        });

        it('it cancels proposal', async function () {
            await governor.connect(authorizer_adaptor).cancel(secondProposalId);

            expect(await governor.proposalVoting(secondProposalId)).to.equals(0);
            expect(await governor.proposalWeight(secondProposalId)).to.equals(0);
            expect(await governor.proposalCancelApproval(secondProposalId)).to.equals(0);
            await expect(governor.voters(secondProposalId)).to.be.reverted;
            await expect(governor.cancellers(secondProposalId)).to.be.reverted;
        });

        it('it fails to cast vote for cancelling if vote is not active', async function () {
            await governor.connect(authorizer_adaptor).propose(targets, values, newcalldatas);
            secondProposalId = await governor.proposals(2);

            time.increase(time.duration.days(1));
            time.increase(twoWeeks);

            await expect(governor.connect(user).castVoteForCancelling(secondProposalId)).to.be.revertedWith(
                'InvalidState()'
            );
        });

        it('it fails to cast cancel if vote not active', async function () {
            // mine 64000 blocks
            await hre.network.provider.send("hardhat_mine", ["0xFA00"]);

            await expect(governor.connect(root).cancel(secondProposalId)).to.be.revertedWith(
                'InvalidState()'
            );
        });

        it('it fails to cancel if unknown proposal id', async function () {
            await expect(governor.connect(root).cancel(11)).to.be.revertedWith(
                'Governor: unknown proposal id'
            );
        });
    });
});
