const { time } = require("@openzeppelin/test-helpers");
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { ZERO_ADDRESS, ONE_ADDRESS } = require("../helpers/constants.js");
const init = require('../test-init.js');

const twoWeeks = time.duration.days(14);

// let AMOR; // need for AMORxGuild
let AMORxGuild; // need for testing propose() function
let avatar;
let governor;
let mockModule;
let mockAvatar;
let mockGovernor;
//let mockReality; To be used with MockModuleFactory

let root;
let authorizer_adaptor;
let operator;
let user;
let user2;
let staker;
let guardians;
let guardiansVersion;

let letAvatarMock
let targets;
let values;
let calldatas;
let cancelProposalId;

describe.only('unit - Contract: Governor', function () {

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
        
        AMORxGuild = setup.tokens.AmorGuildToken;
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

    context('with proposal', async () => {
        let proposalId;
        let proposalTuple;

        beforeEach('propose', async () => {
            const proposal = mockModule.interface.encodeFunctionData("testInteraction", [1]);
            proposalTuple = [[mockModule.address], [0], [proposal]];
            proposalId = await governor.hashProposal([mockModule.address], [0], [proposal]);
            await expect(governor.connect(authorizer_adaptor).propose([mockModule.address], [0], [proposal])).to.emit(governor, 'ProposalCreated');

            // charge guardians limit and set guardians
            await expect(governor.connect(authorizer_adaptor).changeGuardiansLimit(3))
            const guardians = [staker.address, operator.address, user.address];
            await governor.connect(authorizer_adaptor).setGuardians(guardians);
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
                await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
                await expect(governor.connect(staker).castVote(proposalId)).to.emit(governor, 'VotedFor');
                await governor.connect(operator).castVote(proposalId);
                expect(await governor.getProposalVotesCount(proposalId)).to.equals(2);
            });
    
            it('it fails to castVote if already voted', async function () {
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
    
            it('it fails to castVote if vote not currently active', async function () {
                /// Create fresh proposal
                let unSTargets = [mockModule.address];
                let unSValues = [0];
                let unSCalldatas = [mockModule.interface.encodeFunctionData("testInteraction", [5])];
                await mockAvatar.proposeAfterVote(unSTargets, unSValues, unSCalldatas);
                let proposalHash = await governor.hashProposal(unSTargets, unSValues, unSCalldatas);
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
                let proposalHash = await mockGovernor.hashProposal(unSTargets, unSValues, unSCalldatas);
                await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
                time.increase(time.duration.days(10));
                /// Fail the Proposal
                await mockGovernor.connect(root).castVote(proposalHash, false);
                await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
                time.increase(time.duration.days(5));
                await expect(mockGovernor.connect(root).execute(unSTargets, unSValues, unSCalldatas)).to.be.revertedWith(
                    'InvalidState()'
                );
            });
    
            it('it fails to castVote second time to the proposal with the same id', async function () {
                let proposal = mockModule.interface.encodeFunctionData("testInteraction", [2]);
                let proposalId = await governor.hashProposal([mockModule.address], [0], [proposal]);
                await expect(mockGovernor.connect(root).castVote(proposalId, 1)).to.be.revertedWith(
                    'InvalidProposalId()'
                );
            });
        });
    })



    context('» removeGuardian testing', () => {

        it('it fails to remove guardian if not the snapshot', async function () {
            await expect(governor.connect(user).removeGuardian(root.address)).to.be.revertedWith(
                'Unauthorized()'
            );
        });

        it('it removes guardian', async function () {
            //expect(await governor.guardians(3)).to.equals(user2.address);
            await governor.connect(authorizer_adaptor).removeGuardian(root.address);
            expect(await governor.guardians(ethers.utils.solidityKeccak256(["uint256","address"],[guardiansVersion,root.address]))).to.be.false;

            //transactionData = governor.interface.encodeFunctionData("addGuardian", [root.address]);
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

            await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
            time.increase(time.duration.days(10));
            proposalId = await governor.hashProposal(unSTargets, unSValues, unSCalldatas);

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
            await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
            time.increase(100);
            cancelProposalId = await governor.hashProposal(targetsCancel, valuesCancel, calldatasCancel);

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
            await expect(governor.connect(root).execute([ZERO_ADDRESS], [0], ["0x"])).to.be.revertedWith(
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
