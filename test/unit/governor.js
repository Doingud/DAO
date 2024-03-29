const { time } = require("@openzeppelin/test-helpers");
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { ZERO_ADDRESS } = require("../helpers/constants.js");
const init = require('../test-init.js');

const twoWeeks = time.duration.days(14);

// let AMOR;
let avatar;
let governor;
let mockModule;
let mockAvatar;
let mockGovernor;
let beaconGovernor;
let beaconAvatar;

let root;
let authorizer_adaptor;
let operator;
let user;
let user2;
let staker;
let guardians;
let guardiansVersion;

let targets;
let values;
let calldatas;
let proposalsCounter;
let cancelProposalId;

describe('unit - Contract: Governor', function () {

    const setupTests = deployments.createFixture(async () => {
        const signers = await ethers.getSigners();
        const setup = await init.initialize(signers);
        root = setup.roles.root;
        staker = setup.roles.staker;
        operator = setup.roles.operator;
        authorizer_adaptor = setup.roles.authorizer_adaptor;
        user = setup.roles.user3;
        user2 = setup.roles.user2;

        await init.getTokens(setup);
        await init.avatar(setup);
        let AVATAR = setup.avatars.avatar;
        beaconAvatar = await init.beacon(AVATAR.address, root.address);
        avatar = await init.proxy(beaconAvatar.address);

        await init.governor(setup);
        let GOVERNOR = setup.governor;
        beaconGovernor = await init.beacon(GOVERNOR.address, root.address);
        governor = await init.proxy(beaconGovernor.address);
        avatar = AVATAR.attach(avatar.address);
        governor = GOVERNOR.attach(governor.address);

        await avatar.init(setup.roles.root.address, governor.address);
        await governor.init( setup.roles.authorizer_adaptor.address, setup.roles.root.address);
        mockModule = setup.avatars.module;

        mockAvatar = await init.proxy(beaconAvatar.address);
        mockAvatar = AVATAR.attach(mockAvatar.address);

        mockGovernor = await init.proxy(beaconGovernor.address);
        mockGovernor = GOVERNOR.attach(mockGovernor.address);
        await mockAvatar.init(root.address, mockGovernor.address);
        await mockGovernor.init( mockAvatar.address, root.address);
    });

    before('>>> setup', async function () {
        await setupTests();
    });

    context('» init testing', () => {
        it('initialized variables check', async function () {
            expect(await governor.avatarAddress()).to.equals(authorizer_adaptor.address);
            //const abi = ethers.utils.defaultAbiCoder;
            guardiansVersion = 0;
            expect(await governor.guardians(0, root.address)).to.equals(true);
            expect((await governor.votingDelay())).to.equals(1);
            let weeks = 60 * 60 * 24 * 7 * 2;
            expect(await governor.votingPeriod()).to.equals(weeks);
        });

        it("Should fail if called more than once", async function () {
            await expect(governor.init(
                authorizer_adaptor.address, // Avatar Address
                user2.address
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
            await governor.connect(authorizer_adaptor).changeGuardiansLimit(3);
            expect(await governor.guardiansLimit()).to.equals(3);
        });

        it('it fails to propose if Guardian Limit not Reached', async function () {
            guardians = [staker.address, operator.address];
            let transactionData = governor.interface.encodeFunctionData("setGuardians", [guardians]);
            await expect(governor.connect(authorizer_adaptor).propose([governor.address], [0], [transactionData])).to.be.revertedWith("NotEnoughGuardians()");
            expect(await governor.guardiansLimit()).to.equals(3);
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
            guardians = [];
            await expect(governor.connect(authorizer_adaptor).setGuardians(guardians)).to.be.revertedWith("InvalidParameters()");
        });

        it('it sets guardians', async function () {
            guardians = [staker.address, operator.address, user.address];
            await governor.connect(authorizer_adaptor).setGuardians(guardians);
            guardiansVersion++;
            expect(await governor.guardians(guardiansVersion, guardians[0])).to.be.true;
            expect(await governor.guardians(guardiansVersion, guardians[1])).to.be.true;
            expect(await governor.guardians(guardiansVersion, guardians[2])).to.be.true;
            expect(await governor.guardiansCounter()).to.equal(3);
        });

        it('it sets guardians when list of the new guardians is less than before', async function () {
            guardians = [operator.address, staker.address];
            await governor.connect(authorizer_adaptor).setGuardians(guardians);
            guardiansVersion++;
            expect(await governor.guardians(guardiansVersion, guardians[0])).to.be.true;
            expect(await governor.guardians(guardiansVersion, guardians[1])).to.be.true;
            expect(await governor.guardiansCounter()).to.equal(2);

            // return previous user and guardians variables back
            guardians = [staker.address, operator.address, user.address];
            await governor.connect(authorizer_adaptor).setGuardians(guardians);
            guardiansVersion++;
        });
    });

    context('» addGuardian testing', () => {

        it('it fails to add guardian if not the avatar', async function () {
            await expect(governor.connect(user).addGuardian(user2.address)).to.be.revertedWith(
                'Unauthorized()'
            );
        });

        it('it adds guardian', async function () {
            await governor.connect(authorizer_adaptor).addGuardian(user2.address);
            expect(await governor.guardians(guardiansVersion, user2.address)).to.be.true;
            expect(await governor.guardiansCounter()).to.equal(4);
        });

        it('it fails to add guardian with the same address', async function () {
            await expect(governor.connect(authorizer_adaptor).addGuardian(user2.address)).to.be.revertedWith("InvalidParameters()");
        });
    });

    context('» changeGuardian testing', () => {

        it('it fails to change guardian if not the avatar', async function () {
            await expect(governor.connect(user).changeGuardian(staker.address, user2.address)).to.be.revertedWith(
                'Unauthorized()'
            );
        });

        it('it fails to change guardian if already have guardian with the same address', async function () {
            await expect(governor.connect(authorizer_adaptor).changeGuardian(staker.address, user2.address)).to.be.revertedWith("InvalidParameters()");
        });

        it('it changes guardian', async function () {
            await governor.connect(authorizer_adaptor).changeGuardian(operator.address, root.address);
            expect(await governor.guardians(guardiansVersion, root.address)).to.be.true;
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
            let proposal = mockModule.interface.encodeFunctionData("testInteraction", [2]);

            await governor.connect(authorizer_adaptor).propose([mockModule.address], [0], [proposal]);
            proposalsCounter = await governor.proposalsCounter();
            let proposalId = await governor.hashProposal([mockModule.address], [0], [proposal], proposalsCounter);
            await governor.connect(authorizer_adaptor).state(proposalId);

            expect((await governor.proposalVoting(proposalId)).toString()).to.equals("0");
            expect((await governor.proposalWeight(proposalId)).toString()).to.equals("0");
        });

        it('it fails to propose if proposal function information arity mismatch', async function () {
            await expect(governor.connect(authorizer_adaptor).propose([avatar.address, governor.address], [0], ["0x"])).to.be.revertedWith("InvalidParameters()");
        });

        it('it fails to propose if empty proposal', async function () {
            await expect(governor.connect(authorizer_adaptor).propose([], [], [])).to.be.revertedWith("InvalidParameters()");
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

            await expect(governor.connect(authorizer_adaptor).propose(tooManyTargets, tooManyValues, tooManyCalldatas)).to.be.revertedWith("InvalidParameters()");
        });
    });

    context('» castVote testing', () => {

        it('it fails to castVote if not the guardian', async function () {
            let proposalId = await governor.hashProposal([avatar.address], [0], [user.address], proposalsCounter);
            await expect(governor.connect(authorizer_adaptor).castVote(proposalId, 1)).to.be.revertedWith(
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
            let proposal = mockModule.interface.encodeFunctionData("testInteraction", [2]);
            let proposalId = await governor.hashProposal([mockModule.address], [0], [proposal], proposalsCounter);
            await governor.connect(root).castVote(proposalId, true);
            await governor.connect(user).castVote(proposalId, true);
            await governor.connect(user2).castVote(proposalId, false);
            expect(await governor.proposalVoting(proposalId)).to.equals(2);
            expect(await governor.proposalWeight(proposalId)).to.equals(3);
        });

        it('it fails to castVote if already voted', async function () {
            let proposal = mockModule.interface.encodeFunctionData("testInteraction", [2]);
            let proposalId = await governor.hashProposal([mockModule.address], [0], [proposal], proposalsCounter);
            await expect(governor.connect(root).castVote(proposalId, false)).to.be.revertedWith(
                'AlreadyVoted()'
            );
        });
    });

    context('» execute testing', () => {

        it('it fails to execute if unknown proposal id', async function () {
            await expect(governor.connect(root).execute([user.address], values, calldatas, proposalsCounter)).to.be.revertedWith(
                'InvalidProposalId()'
            );
        });

        it('it fails to cancel if cancel not approved', async function () {
            let proposal = mockModule.interface.encodeFunctionData("testInteraction", [2]);
            let proposalId = await governor.hashProposal([mockModule.address], [0], [proposal], proposalsCounter);
            await expect(governor.connect(root).cancel(proposalId)).to.be.revertedWith(
                'CancelNotApproved()'
            );
        });

        it('it fails to execute if UnderlyingTransactionReverted', async function () {
            // mine 64000 blocks
            await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
            time.increase(twoWeeks);

            /// Create fresh proposal
            let unSTargets = [mockModule.address];
            let unSValues = [0];
            let unSCalldatas = [mockModule.interface.encodeFunctionData("testRevert", [])];

            await mockAvatar.connect(root).proposeAfterVote(unSTargets, unSValues, unSCalldatas);
            proposalsCounter = await governor.proposalsCounter();

            let proposalHash = await governor.hashProposal(unSTargets, unSValues, unSCalldatas, proposalsCounter);
            time.increase(time.duration.days(10));
            await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
            /// Pass the Proposal
            await mockGovernor.castVote(proposalHash, true);
            time.increase(time.duration.days(5));
            await hre.network.provider.send("hardhat_mine", ["0xFA00"]);

            await expect(mockGovernor.connect(authorizer_adaptor).execute(unSTargets, unSValues, unSCalldatas, proposalsCounter))
                .to.be.revertedWith(
                    'UnderlyingTransactionReverted()'
                );
        });

        it('it executes proposal', async function () {
            await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
            time.increase(twoWeeks);

            let proposal = mockModule.interface.encodeFunctionData("testInteraction", [2]);
            await mockAvatar.proposeAfterVote([mockModule.address], [0], [proposal]);

            proposalsCounter = await mockGovernor.proposalsCounter();
            proposalId = web3.utils.hexToNumberString(ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(["address[]", "uint256[]", "bytes[]", "uint256"], [[mockModule.address], [0], [proposal], proposalsCounter])));
            expect(await mockModule.testValues()).to.equal(0);
            await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
            time.increase(time.duration.days(10));
            await mockGovernor.castVote(proposalId, true);

            await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
            time.increase(time.duration.days(5));

            await expect(mockGovernor.connect(authorizer_adaptor).execute([mockModule.address], [0], [proposal], proposalsCounter))
                .to
                .emit(mockGovernor, "ProposalExecuted").withArgs(proposalId);
            expect(await mockModule.testValues()).to.equal(2);
            await expect(mockGovernor.voters(proposalId)).to.be.reverted;
        });

        it('it fails to castVote if vote not currently active', async function () {
            // mine 64000 blocks
            /// Create fresh proposal
            let unSTargets = [mockModule.address];
            let unSValues = [0];
            let unSCalldatas = [mockModule.interface.encodeFunctionData("testInteraction", [5])];
            await mockAvatar.proposeAfterVote(unSTargets, unSValues, unSCalldatas);
            proposalsCounter = await mockGovernor.proposalsCounter();
            let proposalHash = await governor.hashProposal(unSTargets, unSValues, unSCalldatas, proposalsCounter);
            await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
            time.increase(twoWeeks);
            await expect(mockGovernor.connect(root).castVote(proposalHash, 1)).to.be.revertedWith(
                'InvalidState()'
            );
        });

        it('it fails to execute if proposal not successful', async function () {
            /// Create fresh proposal
            let unSTargets = [mockModule.address];
            let unSValues = [0];
            let unSCalldatas = [mockModule.interface.encodeFunctionData("testInteraction", [1])];
            await mockAvatar.proposeAfterVote(unSTargets, unSValues, unSCalldatas);
            proposalsCounter = await mockGovernor.proposalsCounter();
            let proposalHash = await mockGovernor.hashProposal(unSTargets, unSValues, unSCalldatas, proposalsCounter);
            await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
            time.increase(time.duration.days(10));
            /// Fail the Proposal
            await mockGovernor.connect(root).castVote(proposalHash, false);
            await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
            time.increase(time.duration.days(5));
            await expect(mockGovernor.connect(root).execute(unSTargets, unSValues, unSCalldatas, proposalsCounter)).to.be.revertedWith(
                'InvalidState()'
            );
        });

        it('it fails to castVote second time to the proposal with the same id', async function () {
            let proposal = mockModule.interface.encodeFunctionData("testInteraction", [2]);
            let proposalId = await governor.hashProposal([mockModule.address], [0], [proposal], proposalsCounter);
            await expect(mockGovernor.connect(root).castVote(proposalId, 1)).to.be.revertedWith(
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
            await governor.connect(authorizer_adaptor).removeGuardian(root.address);
            expect(await governor.guardians(guardiansVersion, root.address)).to.be.false;

            await governor.connect(authorizer_adaptor).addGuardian(root.address);
        });
    });

    context('» castVoteForCancelling and cancel testing', () => {

        it('it fails to castVoteForCancelling if not the guardian', async function () {
            await hre.network.provider.send("hardhat_mine", ["0xFA00"]);

            let unSTargets = [mockModule.address];
            let unSValues = [0];
            let unSCalldatas = [mockModule.interface.encodeFunctionData("testInteraction", [15])];
            await governor.connect(authorizer_adaptor).propose(unSTargets, unSValues, unSCalldatas);
            proposalsCounter = await governor.proposalsCounter();

            await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
            time.increase(time.duration.days(10));
            proposalId = await governor.hashProposal(unSTargets, unSValues, unSCalldatas, proposalsCounter);

            await expect(governor.connect(authorizer_adaptor).castVoteForCancelling(proposalId)).to.be.revertedWith(
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
            /// Create fresh proposal
            let targetsCancel = [governor.address];
            let valuesCancel = [0];
            let calldatasCancel = [governor.interface.encodeFunctionData("changeGuardiansLimit", [6])];
            await governor.connect(authorizer_adaptor).propose(targetsCancel, valuesCancel, calldatasCancel);
            proposalsCounter = await governor.proposalsCounter();
            await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
            time.increase(100);
            cancelProposalId = await governor.hashProposal(targetsCancel, valuesCancel, calldatasCancel, proposalsCounter);

            await governor.connect(user).castVoteForCancelling(cancelProposalId);
            await governor.connect(user2).castVoteForCancelling(cancelProposalId);
            expect(await governor.proposalCancelApproval(cancelProposalId)).to.equals(2);
        });

        it('it fails to cast vote for cancelling if already voted', async function () {
            await expect(governor.connect(user).castVoteForCancelling(cancelProposalId)).to.be.revertedWith(
                'AlreadyVoted()'
            );
        });

        it('it cancels proposal', async function () {
            await governor.connect(authorizer_adaptor).cancel(cancelProposalId);

            expect(await governor.proposalVoting(cancelProposalId)).to.equals(0);
            expect(await governor.proposalWeight(cancelProposalId)).to.equals(0);
            expect(await governor.proposalCancelApproval(cancelProposalId)).to.equals(0);
            await expect(governor.voters(cancelProposalId)).to.be.reverted;
            await expect(governor.cancellers(cancelProposalId)).to.be.reverted;
        });cancelProposalId

        it('it fails to execute cancelled proposal', async function () {
            await expect(governor.connect(root).execute([ZERO_ADDRESS], [0], ["0x"], proposalsCounter)).to.be.revertedWith(
                'InvalidProposalId()'
            );
        });

        it('it fails to cast vote for cancelling if vote is not active', async function () {
            let transactionData = governor.interface.encodeFunctionData("changeGuardiansLimit", [10]);
            await governor.connect(authorizer_adaptor).propose([governor.address], [0], [transactionData]);
            proposalsCounter = await governor.proposalsCounter();
            proposalId = await governor.hashProposal([governor.address], [0], [transactionData], proposalsCounter);

            time.increase(time.duration.days(1));
            time.increase(twoWeeks);

            await expect(governor.connect(user).castVoteForCancelling(proposalId)).to.be.revertedWith(
                'InvalidState()'
            );
        });

        it('it fails to cast cancel if vote not active', async function () {
            // mine 64000 blocks
            await hre.network.provider.send("hardhat_mine", ["0xFA00"]);

            await expect(governor.connect(authorizer_adaptor).cancel(proposalId)).to.be.revertedWith(
                'InvalidState()'
            );
        });

        it('it fails to cancel if unknown proposal id', async function () {
            await expect(governor.connect(root).cancel(11)).to.be.revertedWith(
                'InvalidProposalId()'
            );
        });
    });

});
