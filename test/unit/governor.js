const { time } = require("@openzeppelin/test-helpers");
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { ZERO_ADDRESS, ONE_ADDRESS, TWO_ADDRESS } = require("../helpers/constants.js");
const init = require('../test-init.js');

const twoWeeks = time.duration.days(14);

let governor;
let mockModule;
let root;
let authorizer_adaptor;
let operator;
let user;
let user2;
let staker;
let values;

describe('unit - Contract: Governor', function () {

    const setupTests = deployments.createFixture(async () => {
        const signers = await ethers.getSigners();
        const setup = await init.initialize(signers);
        const governorImplementation = await init.governorImplementation();
        const governorBeacon = await init.beacon(governorImplementation.address, setup.roles.root.address)
        const governorProxy = await init.proxy(governorBeacon.address)
        governor = governorImplementation.attach(governorProxy.address);

        const avatarMockFactory = await ethers.getContractFactory('AvatarMock');
        avatarMock = await avatarMockFactory.deploy();
        
        await governor.init(setup.roles.authorizer_adaptor.address, setup.roles.root.address);
        await init.getTokens(setup);
        
        root = setup.roles.root;
        staker = setup.roles.staker;
        operator = setup.roles.operator;
        authorizer_adaptor = setup.roles.authorizer_adaptor;
        user = setup.roles.user3;
        user2 = setup.roles.user2;
        
        await init.avatar(setup)
        mockModule = setup.avatars.module;
    });

    beforeEach('>>> setup', async function () {
        await setupTests();
    });

    const useAvatarMock = async () => {
        // Replaces bytecode at authorizer_adaptor address with mock module, so that we can test execute
        // In other tests we need EOA as avatar for testing
        const code = await hre.network.provider.send("eth_getCode", [
            avatarMock.address,
        ]);

        await hre.network.provider.send("hardhat_setCode", [authorizer_adaptor.address , code]);
    }

    context('» init testing', () => {
        it('initialized variables check', async function () {
            expect(await governor.getAvatar()).to.equals(authorizer_adaptor.address);
            expect(await governor.isGuardian(root.address, 0)).to.equals(true);
            expect((await governor.votingDelay())).to.equals(1);
            let weeks = 60 * 60 * 24 * 7 * 2;
            expect(await governor.votingPeriod()).to.equals(weeks);
        });

        it("Should fail if called more than once", async function () {
            await expect(governor.init(
                authorizer_adaptor.address, // Avatar Address
                user2.address
            )).to.be.revertedWith("Initializable: contract is already initialized");
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
            expect(await governor.getGuardiansLimit()).to.equals(3);
        });

        it('it fails to propose if Guardian Limit not Reached', async function () {
            const guardians = [staker.address, operator.address];
            await expect(governor.connect(authorizer_adaptor).changeGuardiansLimit(5))
            const transactionData = governor.interface.encodeFunctionData("setGuardians", [guardians]);
            await expect(governor.connect(authorizer_adaptor).propose([governor.address], [0], [transactionData])).to.be.revertedWith("NotEnoughGuardians()");
            expect(await governor.getGuardiansLimit()).to.equals(5);
        });

    });

    context('» setGuardians testing', () => {
        it('it fails to set guardians if not the avatar', async function () {
            const guardians = [staker.address, operator.address, user.address];
            await expect(governor.connect(user).setGuardians(guardians)).to.be.revertedWith(
                'Unauthorized()'
            );
        });

        it('it fails to set guardians if no addresses in array', async function () {
            const guardians = [];
            await expect(governor.connect(authorizer_adaptor).setGuardians(guardians)).to.be.revertedWith("InvalidParameters()");
        });

        it('it fails to set guardians if guardian is zero address', async function () {
            const guardians = [ZERO_ADDRESS];
            await expect(governor.connect(authorizer_adaptor).setGuardians(guardians)).to.be.revertedWith("InvalidGuardian()");
        });

        it('it sets guardians', async function () {
            await expect(governor.connect(authorizer_adaptor).changeGuardiansLimit(3))
            const guardians = [staker.address, operator.address, user.address];
            
            const expectedSetIndex = await governor.getSetIndex() + 1
            await governor.connect(authorizer_adaptor).setGuardians(guardians);

            expect(await governor.getNumberOfGuardians()).to.equal(guardians.length);

            for (const guardian of guardians) {
                expect(await governor.isGuardian(guardian, expectedSetIndex)).to.equals(true);
            }

            expect(await governor.getSetIndex()).to.equals(expectedSetIndex)
        });
    });

    context('» addGuardian testing', () => {

        beforeEach('increase guardians limit', async function () {
            await governor.connect(authorizer_adaptor).changeGuardiansLimit(3)
        });

        it('it fails to add guardian if not the avatar', async function () {
            await expect(governor.connect(user).addGuardian(user2.address)).to.be.revertedWith(
                'Unauthorized()'
            );
        });

        it('it adds guardian', async function () {
            await expect(governor.connect(authorizer_adaptor).addGuardian(user2.address)).to.emit(governor, 'GuardianAdded').withArgs(user2.address);
            expect(await governor.getNumberOfGuardians()).to.equal(2);
        });

        it('it fails to add guardian with the same address', async function () {
            await expect(governor.connect(authorizer_adaptor).addGuardian(user2.address)).to.emit(governor, 'GuardianAdded');
            await expect(governor.connect(authorizer_adaptor).addGuardian(user2.address)).to.not.emit(governor, 'GuardianAdded');
            expect(await governor.getNumberOfGuardians()).to.equal(2); // number of guardians is two
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
            const setIndex = await governor.getSetIndex()
            expect(await governor.isGuardian(root.address, setIndex)).to.equals(true)
            await governor.connect(authorizer_adaptor).changeGuardian(root.address, operator.address);
            expect(await governor.isGuardian(root.address, setIndex)).to.equals(false)
            expect(await governor.isGuardian(operator.address, setIndex)).to.equals(true)
        });
    });

    context('» removeGuardian testing', () => {

        it('it fails to remove guardian if not the snapshot', async function () {
            await expect(governor.connect(user).removeGuardian(root.address)).to.be.revertedWith(
                'Unauthorized()'
            );
        });

        it('it removes guardian', async function () {
            const setIndex = await governor.getSetIndex()
            expect(await governor.isGuardian(root.address, setIndex)).to.equals(true)
            await governor.connect(authorizer_adaptor).removeGuardian(root.address);
            expect(await governor.isGuardian(root.address, setIndex)).to.equals(false)
        });
    });

    context('» propose testing', () => {

        it('it fails to propose if not the avatar', async function () {
            const targets = [mockModule.address];
            values = [0];
            const calldatas = [mockModule.interface.encodeFunctionData("testInteraction", [20])]; // transferCalldata from https://docs.openzeppelin.com/contracts/4.x/governance

            await expect(governor.connect(user).propose(targets, values, calldatas)).to.be.revertedWith(
                'Unauthorized()'
            );
        });

        it('it proposes', async function () {
            const proposalOne = mockModule.interface.encodeFunctionData("testInteraction", [1]);
            const proposalTwo = mockModule.interface.encodeFunctionData("testInteraction", [2]);

            await expect(governor.connect(authorizer_adaptor).propose([mockModule.address], [0], [proposalOne])).to.emit(governor, 'ProposalCreated');
            await expect(governor.connect(authorizer_adaptor).propose([mockModule.address], [0], [proposalTwo])).to.emit(governor, 'ProposalCreated');
        });

        it('it fails to propose if proposal already exists', async function () {
            const proposal = mockModule.interface.encodeFunctionData("testInteraction", [2]);
            await expect(governor.connect(authorizer_adaptor).propose([mockModule.address], [0], [proposal])).to.emit(governor, 'ProposalCreated');
            await expect(governor.connect(authorizer_adaptor).propose([mockModule.address], [0], [proposal])).to.be.revertedWith("InvalidState()");
        });

        it('it fails to propose if proposal function information mismatch', async function () {
            await expect(governor.connect(authorizer_adaptor).propose([user.address, user2.address], [0], ["0x"])).to.be.revertedWith("InvalidParameters()");
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

    it('changes voting delay', async function() {
        const votingDelay = 20;
        await expect(governor.connect(authorizer_adaptor).changeVotingDelay(votingDelay)).to.emit(governor, 'VotingDelayChanged').withArgs(votingDelay)
        expect(await governor.votingDelay()).to.eq(votingDelay)
    });

    it('changes voting period', async function() {
        const votingPeriod = 50;
        await expect(governor.connect(authorizer_adaptor).changeVotingPeriod(votingPeriod)).to.emit(governor, 'VotingPeriodChanged').withArgs(votingPeriod)
        expect(await governor.votingPeriod()).to.eq(votingPeriod)
    });

    context('with proposal', async () => {
        let proposalId;
        let proposalTuple;

        beforeEach('propose', async () => {
            // charge guardians limit and set guardians
            await expect(governor.connect(authorizer_adaptor).changeGuardiansLimit(6))
            const guardians = [staker.address, operator.address, user.address, user2.address, ONE_ADDRESS, TWO_ADDRESS];
            await governor.connect(authorizer_adaptor).setGuardians(guardians);
            // Create a proposal
            const proposal = mockModule.interface.encodeFunctionData("testInteraction", [1]);
            proposalTuple = [[mockModule.address], [0], [proposal]];
            proposalId = await governor.hashProposal(...proposalTuple);
            await expect(governor.connect(authorizer_adaptor).propose(...proposalTuple)).to.emit(governor, 'ProposalCreated');
        })

        context('» castVote testing', () => {
            it('it fails to castVote if not the guardian', async function () {
                await expect(governor.connect(authorizer_adaptor).castVote(proposalId)).to.be.revertedWith(
                    'Unauthorized()'
                );
            });
    
            it('it fails to castVote if unknown proposal id', async function () {
                const invalidId = 999;
                await expect(governor.connect(staker).castVote(invalidId)).to.be.revertedWith(
                    'InvalidProposalId()'
                );
            });
    
            it('it casts Vote', async function () {
                time.increase(time.duration.seconds(10));
                await expect(governor.connect(staker).castVote(proposalId)).to.emit(governor, 'VotedFor');
                await governor.connect(operator).castVote(proposalId);
                expect(await governor.getProposalVotesCount(proposalId)).to.equals(2);
            });
    
            it('it fails to castVote if already voted', async function () {
                time.increase(time.duration.seconds(10));
                await expect(governor.connect(staker).castVote(proposalId)).to.emit(governor, 'VotedFor');
                await expect(governor.connect(staker).castVote(proposalId)).to.be.revertedWith(
                    'AlreadyVoted()'
                );
            });
        });

        context('» execute testing', () => {
            it('it fails to execute if unknown proposal id', async function () {
                await expect(governor.connect(root).execute([user.address], [0], ["0x"])).to.be.revertedWith(
                    'InvalidProposalId()'
                );
            });
            
            it('it executes proposal', async function () {
                await useAvatarMock();
                // increase time because of voting delay
                time.increase(time.duration.seconds(10));

                await expect(governor.connect(user).castVote(proposalId)).to.emit(governor, 'VotedFor');
                await expect(governor.connect(staker).castVote(proposalId)).to.emit(governor, 'VotedFor');
                time.increase(twoWeeks);
        
                await expect(governor.connect(authorizer_adaptor).execute(...proposalTuple)).to.emit(governor, 'ProposalExecuted')
            });
    
            it('it fails to castVote if the proposal is not currently active', async function () {
                await expect(governor.connect(staker).castVote(proposalId)).to.be.revertedWith(
                    'InvalidState()'
                );
            });
    
            it('it fails to execute if proposal not successful', async function () {
                await expect(governor.connect(staker).execute(...proposalTuple)).to.be.revertedWith(
                    'InvalidState()'
                );
            });
    
            it('it fails to castVote second time to the proposal with the same id', async function () {
                time.increase(time.duration.seconds(10));
                await expect(governor.connect(staker).castVote(proposalId)).to.emit(governor, 'VotedFor');
                await expect(governor.connect(staker).castVote(proposalId)).to.be.revertedWith(
                    'AlreadyVoted()'
                );
            });
        });

        context('» getters', async () => {
            it('state', async function() {
                expect(await governor.state(proposalId)).to.equals(0);
            });

            it('getProposalVoteEnd', async function() {
                expect(await governor.getProposalVoteEnd(proposalId)).gt(0)
            });
            it('getProposalVoteStart', async function() {
                expect(await governor.getProposalVoteStart(proposalId)).gt(0)
            });
        });

        context('» castVoteForCancelling and cancel testing', () => {

            it('it fails to castVoteForCancelling if not the guardian', async function () {
                await expect(governor.connect(authorizer_adaptor).castVoteForCancelling(proposalId)).to.be.revertedWith(
                    'Unauthorized()'
                );
            });
    
            it('it fails to castVoteForCancelling if unknown proposal id', async function () {
                const invalidId = 999;
                await expect(governor.connect(user).castVoteForCancelling(invalidId)).to.be.revertedWith(
                    'InvalidProposalId()'
                );
            });
    
            it('it casts vote for cancelling', async function () {
                time.increase(twoWeeks);
                expect(await governor.getProposalCancelVotesCount(proposalId)).to.equals(0);
                await expect(governor.connect(user).castVoteForCancelling(proposalId)).to.emit(governor, 'VoteForCancelling');
                expect(await governor.getProposalCancelVotesCount(proposalId)).to.equals(1);
            });
    
            it('it fails to cast vote for cancelling if already voted', async function () {
                time.increase(time.duration.seconds(10));
                await expect(governor.connect(user).castVoteForCancelling(proposalId)).to.emit(governor, 'VoteForCancelling');
                await expect(governor.connect(user).castVoteForCancelling(proposalId)).to.be.revertedWith(
                    'AlreadyVoted()'
                );
            });
    
            it('it cancels proposal', async function () {
                time.increase(time.duration.seconds(10));
                // 2/6 > 20%, so it cancels the proposal
                await expect(governor.connect(user).castVoteForCancelling(proposalId)).to.emit(governor, 'VoteForCancelling');
                await expect(governor.connect(user2).castVoteForCancelling(proposalId)).to.emit(governor, 'ProposalCanceled');
            });
    
            it('it fails to execute cancelled proposal', async function () {
                time.increase(time.duration.seconds(10));
                // 2/6 > 20%, so it cancels the proposal
                await expect(governor.connect(user).castVoteForCancelling(proposalId)).to.emit(governor, 'VoteForCancelling');
                await expect(governor.connect(user2).castVoteForCancelling(proposalId)).to.emit(governor, 'ProposalCanceled');
                await expect(governor.connect(root).execute(...proposalTuple)).to.be.revertedWith(
                    'InvalidProposalId()'
                );
            });
    
            it('it fails to cast vote for cancelling if vote is not active', async function () {
                let transactionData = governor.interface.encodeFunctionData("changeGuardiansLimit", [10]);
                await governor.connect(authorizer_adaptor).propose([governor.address], [0], [transactionData]);
                proposalId = await governor.hashProposal([governor.address], [0], [transactionData]);
    
                time.increase(time.duration.days(1));
                time.increase(twoWeeks);
    
                await expect(governor.connect(user).castVoteForCancelling(proposalId)).to.be.revertedWith(
                    'InvalidState()'
                );
            });
    
            it('it fails to cast cancel if vote not active', async function () {
                await expect(governor.connect(user).castVoteForCancelling(proposalId)).to.be.revertedWith(
                    'InvalidState()'
                );
            });
    
            it('it fails to cancel if unknown proposal id', async function () {
                await expect(governor.connect(user).castVoteForCancelling(11)).to.be.revertedWith(
                    'InvalidProposalId()'
                );
            });
        });
    })
});
