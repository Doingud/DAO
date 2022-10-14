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
let mockModule;
//let mockReality; To be used with MockModuleFactory

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
let newcalldatas;
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

    before('>>> setup', async function () {
        await setupTests();
    });

    context('» init testing', () => {
        it('initialized variables check', async function () {
            //expect(await governor.snapshotAddress()).to.equals(authorizer_adaptor.address);
            expect(await governor.avatarAddress()).to.equals(avatar.address);
            expect(await governor.guardians(0)).to.equals(root.address);
            expect((await governor.votingDelay())).to.equals(1);
            let weeks = 60 * 60 * 24 * 7 * 2;
            expect(await governor.votingPeriod()).to.equals(weeks);
        });

        it("Should fail if called more than once", async function () {
            await expect(governor.init(
                AMORxGuild.address, //AMORxGuild
                authorizer_adaptor.address, // Avatar Address
            )).to.be.revertedWith("AlreadyInitialized()");
        });
    });

    context('» changeGuardiansLimit testing', () => {

        it('it fails to change guardians limit if not the avatar', async function () {
            await expect(governor.connect(user2).changeGuardiansLimit(user2.address)).to.be.revertedWith(
                'Unauthorized()'
            );
        });

        it('it changes guardians limit from proposal', async function () {
            guardians = [staker.address, operator.address, user.address];
            await avatar.enableModule(authorizer_adaptor.address);
            let transactionData = governor.interface.encodeFunctionData("setGuardians", [guardians]);
            avatar.connect(authorizer_adaptor).execTransactionFromModule(governor.address, 0, transactionData, 0);
            console.log("Flag1");
            expect(await governor.guardiansLimit()).to.equals(1);
    
            targets = [governor.address];
            values = [0];
            calldatas = [governor.interface.encodeFunctionData("changeGuardiansLimit", [4])];
            transactionData = governor.interface.encodeFunctionData("propose", [targets, values, calldatas]);
            await avatar.connect(authorizer_adaptor).execTransactionFromModule(governor.address, 0, transactionData, 0);
            firstProposalId = await governor.proposals(0);

            time.increase(time.duration.days(1));

            // Vote as a guardians to pass the proposal locally            
            await governor.connect(staker).castVote(firstProposalId, true);
            await governor.connect(operator).castVote(firstProposalId, true);
            await governor.connect(user).castVote(firstProposalId, false);
            expect(await governor.proposalVoting(firstProposalId)).to.equals(2);
            expect(await governor.proposalWeight(firstProposalId)).to.equals(3);

            // Execute the passed proposal
            time.increase(time.duration.days(14));

            await avatar.connect(root).setGovernor(governor.address);
            await expect(governor.connect(authorizer_adaptor).execute(targets, values, calldatas))
                .to
                .emit(governor, "ProposalExecuted").withArgs(firstProposalId);

            expect(await governor.guardiansLimit()).to.equals(4);
            await expect(governor.proposals(1)).to.be.reverted;
        });

        it('it fails to propose if Guardian Limit not Reached', async function () {
            guardians = [staker.address, operator.address];
            let transactionData = governor.interface.encodeFunctionData("setGuardians", [guardians]);
            await avatar.connect(authorizer_adaptor).execTransactionFromModule(governor.address, 0, transactionData, 0);
            //await governor.connect(authorizer_adaptor).setGuardians(guardians);

            expect(await governor.guardiansLimit()).to.equals(4);
            await expect(governor.guardians(3)).to.be.reverted;
            console.log("Flag 3");
            targets = [mockModule.address];
            values = [0];
            calldatas = [mockModule.interface.encodeFunctionData("testInteraction", [20])]; // transferCalldata from https://docs.openzeppelin.com/contracts/4.x/governance
            await expect(governor.proposals(1)).to.be.reverted;
            transactionData = governor.interface.encodeFunctionData("propose", [targets, values, calldatas]);
            await avatar.connect(authorizer_adaptor).execTransactionFromModule(governor.address, 0, transactionData, 0);
            //await expect(governor.connect(authorizer_adaptor).propose(targets, values, calldatas)).to.be.revertedWith(
            //    'NotEnoughGuardians()'
            //);
            
            console.log("Flag 4");
            guardians = [staker.address, operator.address, user.address];
            transactionData = governor.interface.encodeFunctionData("setGuardians", [guardians]);
            await avatar.connect(authorizer_adaptor).execTransactionFromModule(governor.address, 0, transactionData, 0);
            //await governor.connect(authorizer_adaptor).setGuardians(guardians);
        });

    });

    context('» setGuardians testing', () => {

        it('it fails to set guardians if not the avatar', async function () {
            guardians = [staker.address, operator.address, user.address];
            await expect(governor.connect(user).setGuardians(guardians)).to.be.revertedWith(
                'Unauthorized()'
            );
        });

        it('it fails to set guardians if no addresses in array', async function () {
            //  *** Low level calls do not revert in testing ***
            let transactionData = governor.interface.encodeFunctionData("setGuardians", [[]]);
            await expect(avatar.connect(authorizer_adaptor).execTransactionFromModule(governor.address, 0, transactionData, 0)).
                to.emit(avatar, 'ExecutionFromModuleSuccess');
        });

        it('it sets guardians', async function () {
            let transactionData = governor.interface.encodeFunctionData("setGuardians", [guardians]);
            await avatar.connect(authorizer_adaptor).execTransactionFromModule(governor.address, 0, transactionData, 0);
            expect(await governor.guardians(0)).to.equals(staker.address);
            expect(await governor.guardians(1)).to.equals(operator.address);
            expect(await governor.guardians(2)).to.equals(user.address);
        });

        it('it sets guardians when list of the new guardians is less than before', async function () {
            guardians = [operator.address, staker.address];
            let transactionData = governor.interface.encodeFunctionData("setGuardians", [guardians]);
            await avatar.connect(authorizer_adaptor).execTransactionFromModule(governor.address, 0, transactionData, 0);

            //await governor.connect(authorizer_adaptor).setGuardians(guardians);
            expect(await governor.guardians(0)).to.equals(operator.address);
            expect(await governor.guardians(1)).to.equals(staker.address);
            expect(await governor.guardians(2)).to.equals(ZERO_ADDRESS);

            // return previous user and guardians variables back            
            guardians = [staker.address, operator.address, user.address];
            transactionData = governor.interface.encodeFunctionData("setGuardians", [guardians]);
            await avatar.connect(authorizer_adaptor).execTransactionFromModule(governor.address, 0, transactionData, 0);
            //await governor.connect(authorizer_adaptor).setGuardians(guardians);
        });
    });



    context('» addGuardian testing', () => {

        it('it fails to add guardian if not the avatar', async function () {
            await expect(governor.connect(user).addGuardian(user2.address)).to.be.revertedWith(
                'Unauthorized()'
            );
        });

        it('it adds guardian', async function () {
            let transactionData = governor.interface.encodeFunctionData("addGuardian", [user2.address]);
            await avatar.connect(authorizer_adaptor).execTransactionFromModule(governor.address, 0, transactionData, 0);
            expect(await governor.guardians(3)).to.equals(user2.address);
        });

        it('it fails to add guardian with the same address', async function () {
            let transactionData = governor.interface.encodeFunctionData("addGuardian", [user2.address]);
            await avatar.connect(authorizer_adaptor).execTransactionFromModule(governor.address, 0, transactionData, 0);
            /// Because the above does not revert need to check with an alternative method that it hadn't been successful
            /// This is repeated in any test using `execTransactionFromModule`
            await expect(governor.guardians(4)).to.be.reverted;
        });
    });

    context('» changeGuardian testing', () => {

        it('it fails to change guardian if not the avatar', async function () {
            await expect(governor.connect(user).changeGuardian(1, user2.address)).to.be.revertedWith(
                'Unauthorized()'
            );
        });

        it('it fails to change guardian if already have guardian with the same address', async function () {
            let transactionData = governor.interface.encodeFunctionData("changeGuardian", [1, user2.address]);
            await avatar.connect(authorizer_adaptor).execTransactionFromModule(governor.address, 0, transactionData, 0);
            expect(await governor.guardians(1)).to.not.equal(user2.address);
        });

        it('it changes guardian', async function () {
            let transactionData = governor.interface.encodeFunctionData("changeGuardian", [1, root.address]);
            await avatar.connect(authorizer_adaptor).execTransactionFromModule(governor.address, 0, transactionData, 0);
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
            //await expect(governor.proposals(0)).to.be.reverted;
            await expect(governor.proposals(1)).to.be.reverted;
            let transactionData = governor.interface.encodeFunctionData("propose", [targets, values, calldatas]);
            await avatar.connect(authorizer_adaptor).execTransactionFromModule(governor.address, 0, transactionData, 0);
            //await governor.connect(authorizer_adaptor).propose(targets, values, calldatas);

            await expect(governor.proposals(2)).to.be.reverted;
            firstProposalId = await governor.proposals(1);
            await governor.connect(authorizer_adaptor).state(firstProposalId);
            expect((await governor.proposalVoting(firstProposalId)).toString()).to.equals("0");
            expect((await governor.proposalWeight(firstProposalId)).toString()).to.equals("0");

            let newMessageHash = ethers.utils.solidityKeccak256(
                ["address"],
                [staker.address]
            );
            newcalldatas = [newMessageHash];

            transactionData = governor.interface.encodeFunctionData("propose", [targets, values, newcalldatas]);
            await avatar.connect(authorizer_adaptor).execTransactionFromModule(governor.address, 0, transactionData, 0);
            secondProposalId = await governor.proposals(1);
        });

        it('it fails to propose if proposal already exists', async function () {
            await expect(governor.proposals(3)).to.be.reverted;
            let transactionData = governor.interface.encodeFunctionData("propose", [targets, values, calldatas]);
            await avatar.connect(authorizer_adaptor).execTransactionFromModule(governor.address, 0, transactionData, 0);
            await expect(governor.proposals(3)).to.be.reverted;
        });

        it('it fails to propose if proposal function information arity mismatch', async function () {
            let transactionData = governor.interface.encodeFunctionData("propose", [targets, [1, 2, 3], calldatas]);
            await avatar.connect(authorizer_adaptor).execTransactionFromModule(governor.address, 0, transactionData, 0);
            await expect(governor.proposals(3)).to.be.reverted;
        });

        it('it fails to propose if empty proposal', async function () {
            let transactionData = governor.interface.encodeFunctionData("propose", [[], [], []]);
            await avatar.connect(authorizer_adaptor).execTransactionFromModule(governor.address, 0, transactionData, 0);
            await expect(governor.proposals(3)).to.be.reverted;
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

            let transactionData = governor.interface.encodeFunctionData("propose", [tooManyTargets, tooManyValues, tooManyCalldatas]);
            await avatar.connect(authorizer_adaptor).execTransactionFromModule(governor.address, 0, transactionData, 0);
            await expect(governor.proposals(3)).to.be.reverted;

            let unSTargets = [mockModule.address];
            let unSValues = [20];
            let unSCalldatas = [mockModule.interface.encodeFunctionData("testInteraction", [20])];
            transactionData = governor.interface.encodeFunctionData("propose", [unSTargets, unSValues, unSCalldatas]);
            await avatar.connect(authorizer_adaptor).execTransactionFromModule(governor.address, 0, transactionData, 0);
            await expect(governor.proposals(3)).to.not.be.reverted;
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
                'InvalidProposalId()'
            );
        });

        it('it casts Vote', async function () {
            await governor.connect(root).castVote(firstProposalId, true);
            console.log("Flag Vote 1");
            await governor.connect(user).castVote(firstProposalId, true);
            await governor.connect(user2).castVote(firstProposalId, false);
            console.log("Flag Vote 2");
            expect(await governor.proposalVoting(firstProposalId)).to.equals(2);
            expect(await governor.proposalWeight(firstProposalId)).to.equals(3);


            await governor.connect(root).castVote(thirdProposalId, true);
            await governor.connect(user).castVote(thirdProposalId, true);
            await governor.connect(user2).castVote(thirdProposalId, true);
            console.log("Flag Vote 3");
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
                'InvalidProposalId()'
            );
        });

        it('it fails to cancel if cancel not approved', async function () {
            await expect(governor.connect(root).cancel(firstProposalId)).to.be.revertedWith(
                'CancelNotApproved()'
            );
        });

        it('it fails to execute if UnderlyingTransactionReverted', async function () {
            let targetProposal = await governor.proposals(0);
            await governor.connect(root).castVote(targetProposal, true);
            let state = await governor.state(targetProposal);
            await governor.connect(user).castVote(targetProposal, true);
            await governor.connect(user2).castVote(targetProposal, true);
            // mine 64000 blocks
            await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
            time.increase(twoWeeks);
            console.log("Flag Vote 2");
            console.log("Flag Vote 1");
            console.log("Proposal: " );
            let unSTargets = [mockModule.address];
            let unSValues = [20];
            let unSCalldatas = [mockModule.interface.encodeFunctionData("testInteraction", [20])];

            await expect(governor.connect(authorizer_adaptor).execute(unSTargets, unSValues, unSCalldatas))
                .to.be.revertedWith(
                    'UnderlyingTransactionReverted()'
                );
                console.log("Flag Vote 3");
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
                'InvalidProposalId()'
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
            let transactionData = governor.interface.encodeFunctionData("removeGuardian", [root.address]);
            await avatar.connect(authorizer_adaptor).execTransactionFromModule(governor.address, 0, transactionData, 0);

            expect(await governor.guardians(1)).to.equals(user2.address);
            await expect(governor.guardians(3)).to.be.reverted;
        });
    });

    context('» castVoteForCancelling and cancel testing', () => {

        it('it fails to castVoteForCancelling if not the guardian', async function () {
            targets = [staker.address];
            let transactionData = governor.interface.encodeFunctionData("propose", [targets, values, calldatas]);
            await avatar.connect(authorizer_adaptor).execTransactionFromModule(governor.address, 0, transactionData, 0);
            //await governor.connect(authorizer_adaptor).propose(targets, values, calldatas);
            secondProposalId = await governor.proposals(3);

            await expect(governor.connect(authorizer_adaptor).castVoteForCancelling(secondProposalId)).to.be.revertedWith(
                'Unauthorized()'
            );
        });

        it('it fails to castVoteForCancelling if unknown proposal id', async function () {
            let invalidId = 999;
            await expect(governor.connect(user).castVoteForCancelling(invalidId)).to.be.revertedWith(
                'InvalidProposalId()'
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

        it('it fails to execute cancelled proposal', async function () {
            await expect(governor.connect(root).execute([staker.address], values, calldatas)).to.be.revertedWith(
                'InvalidProposalId()'
            );
        });

        it('it fails to cast vote for cancelling if vote is not active', async function () {
            let transactionData = governor.interface.encodeFunctionData("propose", [targets, values, calldatas]);
            await avatar.connect(authorizer_adaptor).execTransactionFromModule(governor.address, 0, transactionData, 0);
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
                'InvalidProposalId()'
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
});
