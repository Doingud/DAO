const { expect } = require('chai');
const { ethers } = require('hardhat');
const init = require('../test-init.js');

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
let description;
let descriptionHash;
let firstProposalId;

describe('unit - Contract: Governor', function () {

    const setupTests = deployments.createFixture(async () => {
        const signers = await ethers.getSigners();
        const setup = await init.initialize(signers);
        await init.getTokens(setup);

        // AMOR = setup.tokens.AmorTokenImplementation;
        AMORxGuild = setup.tokens.AmorGuildToken;
        await init.controller(setup);
        avatar = setup.tokens.AvatarxGuild;
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
        });

        it("Should fail if called more than once", async function () {
            await expect(governor.init(
                AMORxGuild.address, //AMORxGuild
                authorizer_adaptor.address, // Snapshot Address
                authorizer_adaptor.address // Avatar Address
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
            values = [20];
            // building hash has to come from system address
            // 32 bytes of data
            let messageHash = ethers.utils.solidityKeccak256(
                ["address"],
                [authorizer_adaptor.address]
            );
            calldatas = [messageHash];
            description = "description";
            descriptionHash = ethers.utils.solidityKeccak256(
                ["string"],
                [description]
            );

            await expect(governor.connect(user).propose(targets, values, calldatas, description)).to.be.revertedWith(
                'Unauthorized()'
            );
        });
        
        it('it proposes', async function () {
            await expect(governor.proposals(0)).to.be.reverted;

            await governor.connect(authorizer_adaptor).propose(targets, values, calldatas, description);
            
            await expect(governor.proposals(1)).to.be.reverted;
            // let size = await governor.proposals();
            // expect(size.size()).to.equals(1);

            firstProposalId = await governor.proposals(0);
            await governor.connect(authorizer_adaptor).state(firstProposalId);
            expect((await governor.proposalVoting(firstProposalId)).toString()).to.equals("0");
            expect((await governor.proposalWeight(firstProposalId)).toString()).to.equals("0");

            let newMessageHash = ethers.utils.solidityKeccak256(
                ["address"],
                [staker.address]
            );
            newcalldatas = [newMessageHash];

            await governor.connect(authorizer_adaptor).propose(targets, values, newcalldatas, description);
        });

        it('it fails to propose if proposal already exists', async function () {
            await expect(governor.connect(authorizer_adaptor).propose(targets, values, calldatas, description)).to.be.revertedWith(
                'Governor: proposal already exists'
            );
        });

        it('it fails to propose if proposal function information arity mismatch', async function () {
            await expect(governor.connect(authorizer_adaptor).propose(targets, [1, 2, 3], calldatas, description)).to.be.revertedWith(
                'Governor: proposal function information arity mismatch'
            );
        });

        it('it fails to propose if empty proposal', async function () {
            await expect(governor.connect(authorizer_adaptor).propose([], [], [], "")).to.be.revertedWith(
                'Governor: empty proposal'
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
            await expect(governor.connect(authorizer_adaptor).propose(tooManyTargets, tooManyValues, tooManyCalldatas, description)).to.be.revertedWith(
                'Governor: too many actions'
            );
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
        });

        it('it fails to castVote if already voted', async function () {
            await expect(governor.connect(root).castVote(firstProposalId, false)).to.be.revertedWith(
                'AlreadyVoted()'
            );
        });
    });

    context('» execute testing', () => {

        it('it fails to execute if invalid parametres', async function () {
            await expect(governor.connect(root).execute(11, targets, values, calldatas, descriptionHash)).to.be.revertedWith(
                'Governor: invalid parametres'
            );
        });

        it('it executes proposal', async function () {
            // mine 64000 blocks
            await hre.network.provider.send("hardhat_mine", ["0xFA00"]);

            expect(await avatar.check()).to.equals(0);
            await governor.connect(authorizer_adaptor).execute(firstProposalId, targets, values, calldatas, descriptionHash);
            expect(await avatar.check()).to.equals(1);
        });

        it('it fails to castVote if vote not currently active', async function () {
            // mine 64000 blocks
            await hre.network.provider.send("hardhat_mine", ["0xFA00"]);

            await expect(governor.connect(root).castVote(firstProposalId, 1)).to.be.revertedWith(
                'Governor: vote not currently active'
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
