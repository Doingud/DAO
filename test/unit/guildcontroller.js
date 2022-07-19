const { time } = require("@openzeppelin/test-helpers");
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { ONE_HUNDRED_ETHER,
        TEST_TRANSFER,
        TAX_RATE,
        BASIS_POINTS
      } = require('../helpers/constants.js');
const init = require('../test-init.js');

const FEE_DENOMINATOR = 1000;
const percentToConvert = 100; //10% // FEE_DENOMINATOR/100*10
const averageLockTime = time.duration.days(7);
const twoWeeks = time.duration.days(14);

const TEST_TRANSFER_BIGGER = 100000;
const TEST_TRANSFER_SMALLER = 80;

let AMORxGuild;
let FXAMORxGuild
let controller;
let root;
let authorizer_adaptor;
let impactMaker;
let operator;
let user;
let staker;
let impactMakers;
let weigths;
let report;
let r;
let s;
let v;

describe('unit - Contract: GuildController', function () {

    const setupTests = deployments.createFixture(async () => {
        const signers = await ethers.getSigners();
        const setup = await init.initialize(signers);
        await init.getTokens(setup);

        AMORxGuild = setup.tokens.AmorTokenImplementation;
        FXAMORxGuild = setup.tokens.FXAMORxGuild;
        controller = await init.controller(setup);
        root = setup.roles.root;
        staker = setup.roles.staker;
        operator = setup.roles.operator;
        impactMaker = setup.roles.doingud_multisig;
        user = setup.roles.user3;
        authorizer_adaptor = setup.roles.authorizer_adaptor;
        operator = setup.roles.operator;
    });

    before('>>> setup', async function() {
        await setupTests();
    });

    context('» init testing', () => {
        it('initialized variables check', async function () {
            expect(await controller.owner()).to.equals(root.address);
            expect(await controller.FXAMORxGuild()).to.equals(FXAMORxGuild.address);
        });

        it("Should fail if called more than once", async function () {
            await expect(controller.init(
                root.address, // owner
                AMORxGuild.address,
                FXAMORxGuild.address
            )).to.be.reverted;
        });
    });
    
    context('» ImpactMakers testing', () => {

        it('it fails to set ImpactMakers if not the owner', async function () {
            impactMakers = [staker.address, operator.address, impactMaker.address];
            weigths = [20, 34, 923];
            await expect(controller.connect(user).setImpactMakers(impactMakers, weigths)).to.be.revertedWith(
                'Ownable: caller is not the owner'
            );
        });

        it('it ImpactMakers', async function () {
            await controller.connect(root).setImpactMakers(impactMakers, weigths);
            expect(await controller.impactMakers(0)).to.equals(staker.address);
            expect(await controller.impactMakers(1)).to.equals(operator.address);
            expect(await controller.impactMakers(2)).to.equals(impactMaker.address);
            expect(await controller.weights(staker.address)).to.equals(20);
            expect(await controller.weights(operator.address)).to.equals(34);
            expect(await controller.weights(impactMaker.address)).to.equals(923);
        });
    });

    context('» donate testing', () => {

        it('it fails to donate AMORxGuild tokens if not enough AMORxGuild', async function () {
            await expect(controller.connect(operator).donate(ONE_HUNDRED_ETHER)).to.be.revertedWith(
                'InvalidAmount()'
            );
        });

        it('donates AMORxGuild tokens', async function () {
            await AMORxGuild.connect(root).transfer(controller.address, TEST_TRANSFER);
            await AMORxGuild.connect(root).transfer(user.address, TEST_TRANSFER);
            await AMORxGuild.connect(user).approve(controller.address, TEST_TRANSFER_SMALLER);
            await controller.connect(user).donate(TEST_TRANSFER_SMALLER);        

            const totalWeight = await controller.totalWeight();
            const FxGAmount = (TEST_TRANSFER_SMALLER * percentToConvert) / FEE_DENOMINATOR; // FXAMORxGuild Amount = 10% of amount to Impact poll
            const decIpAmount = (TEST_TRANSFER_SMALLER - FxGAmount); //decreased amount

            let weight = await controller.weights(impactMaker.address);
            let amountToSendImpactMaker = (decIpAmount * weight) / totalWeight;
            let taxDeducted = Math.ceil(amountToSendImpactMaker * (1 - TAX_RATE / BASIS_POINTS));

            expect((await FXAMORxGuild.balanceOf(user.address)).toString()).to.equal(FxGAmount.toString());
            expect((await AMORxGuild.balanceOf(impactMaker.address)).toString()).to.equal(taxDeducted.toString());            

            weight = await controller.weights(staker.address);
            amountToSendImpactMaker = (decIpAmount * weight) / totalWeight;
            taxDeducted = Math.floor(amountToSendImpactMaker * (1 - TAX_RATE / BASIS_POINTS));
            expect((await AMORxGuild.balanceOf(staker.address)).toString()).to.equal(taxDeducted.toString());

            weight = await controller.weights(operator.address);
            amountToSendImpactMaker = (decIpAmount * weight) / totalWeight;
            taxDeducted = Math.floor(amountToSendImpactMaker * (1 - TAX_RATE / BASIS_POINTS));
            expect((await AMORxGuild.balanceOf(operator.address)).toString()).to.equal(taxDeducted.toString());
        });
    });

    context('» addReport testing', () => {

        it('it fails to add report if Unauthorized', async function () {
            await AMORxGuild.connect(root).transfer(operator.address, TEST_TRANSFER_BIGGER);
            await AMORxGuild.connect(operator).approve(controller.address, TEST_TRANSFER);

            const timestamp = Date.now();

            // building hash has to come from system address
            // 32 bytes of data
            let messageHash = ethers.utils.solidityKeccak256(
                ["address", "uint", "string"],
                [operator.address, timestamp, "report info"]
            );

            // 32 bytes of data in Uint8Array
            let messageHashBinary = ethers.utils.arrayify(messageHash);
            
            // To sign the 32 bytes of data, make sure you pass in the data
            let signature = await operator.signMessage(messageHashBinary);

            // split signature
            r = signature.slice(0, 66);
            s = "0x" + signature.slice(66, 130);
            v = parseInt(signature.slice(130, 132), 16);
                    
            report = messageHash;
            await expect(controller.connect(authorizer_adaptor).addReport(report, v, r, s)).to.be.revertedWith(
                'Unauthorized()'
            );
        });

        it('adds report', async function () {
            await controller.connect(operator).addReport(report, v, r, s); 
            expect((await controller.reportsAuthors(0))).to.equal(operator.address);
        });

    });

    context('» voteForReport testing', () => {

        it('it fails to vote for report if ReportNotExists', async function () {
            await AMORxGuild.connect(root).transfer(controller.address, TEST_TRANSFER);

            await AMORxGuild.connect(root).transfer(operator.address, TEST_TRANSFER_BIGGER);
            await AMORxGuild.connect(operator).approve(controller.address, TEST_TRANSFER);
            await controller.connect(operator).addReport(report, v, r, s); 

            const id = 11;
            const amount = 12;
            const sign = true;            
            await expect(controller.connect(authorizer_adaptor).voteForReport(id, amount, sign)).to.be.revertedWith(
                'ReportNotExists()'
            );
        });

        it('votes for report positivly', async function () {
            await FXAMORxGuild.connect(root).setController(controller.address); 

            await AMORxGuild.connect(operator).approve(controller.address, TEST_TRANSFER_SMALLER);
            await controller.connect(operator).donate(TEST_TRANSFER_SMALLER);

            const id = 0;
            const amount = 2;
            const sign = true;
            await controller.connect(operator).voteForReport(id, amount, sign);
            expect(await controller.reportsVoting(0)).to.equals(2);
            expect(await controller.reportsWeight(0)).to.equals(2);
        });

        it('votes for report negatively', async function () {
            await FXAMORxGuild.connect(root).setController(controller.address); 
            await AMORxGuild.connect(operator).approve(controller.address, TEST_TRANSFER_SMALLER);
            await controller.connect(operator).donate(TEST_TRANSFER_SMALLER);

            const id = 1;
            const amount = 2;
            const sign = false;
            await controller.connect(operator).voteForReport(id, amount, sign);
            expect(await controller.reportsVoting(1)).to.equals(-2);
            expect(await controller.reportsWeight(1)).to.equals(2);
        });

        it('it fails to vote for report if try to vote more than user have', async function () {
            const id = 0;
            const amount = TEST_TRANSFER;
            const sign = true;
            await expect(controller.connect(authorizer_adaptor).voteForReport(id, amount, sign)).to.be.revertedWith(
                'InvalidAmount()'
            );
        });

        it('it fails to vote for report if VotingTimeExpired', async function () {
            const id = 0;
            const amount = 2;
            const sign = true;
            await controller.connect(operator).voteForReport(id, amount, sign);
            time.increase(averageLockTime);

            await expect(controller.connect(operator).voteForReport(id, amount, sign)).to.be.revertedWith(
                'VotingTimeExpired()'
            );
        });
    });

    context('» finalizeReportVoting testing', () => {

        it('it fails to finalize report voting if ReportNotExists', async function () {
            const id = 11;        
            await expect(controller.connect(authorizer_adaptor).finalizeReportVoting(id)).to.be.revertedWith(
                'ReportNotExists()'
            );
        });

        it('it fails to finalize report voting if VotingTimeNotFinished', async function () {
            await AMORxGuild.connect(root).transfer(controller.address, TEST_TRANSFER);
            await AMORxGuild.connect(root).transfer(operator.address, TEST_TRANSFER_BIGGER);
            await AMORxGuild.connect(operator).approve(controller.address, TEST_TRANSFER);
            await controller.connect(operator).donate(TEST_TRANSFER_SMALLER);
            await controller.connect(operator).addReport(report, v, r, s); 
            const id = 2;
            const amount = 2;
            const sign = true;
            await controller.connect(operator).voteForReport(id, amount, sign);

            await expect(controller.connect(authorizer_adaptor).finalizeReportVoting(id)).to.be.revertedWith(
                'VotingTimeNotFinished()'
            );
        });

        it('finalizes voting for positive report', async function () {
            const id = 2;
            const balanceBefore = await AMORxGuild.balanceOf(operator.address);
            time.increase(twoWeeks);
            await controller.connect(operator).finalizeReportVoting(id);
            const balanceAfter = balanceBefore.add(2);
            expect((await AMORxGuild.balanceOf(operator.address)).toString()).to.equal(balanceAfter.toString());
        });

        it('finalizes voting for negative report', async function () {
            const id = 1;
            const balanceBefore = await AMORxGuild.balanceOf(operator.address);
            time.increase(twoWeeks);
            await controller.connect(operator).finalizeReportVoting(id);
            const balanceAfter = balanceBefore.add(1);
            expect((await AMORxGuild.balanceOf(operator.address)).toString()).to.equal(balanceAfter.toString());
        });

    });
});

// function splitSignature(sig) {
//     const hash = sig.slice(0,66);
//     const signature = sig.slice(66, sig.length);
//     const r = signature.slice(0, 66);
//     const s = "0x" + signature.slice(66, 130);
//     const v = parseInt(signature.slice(130, 132), 16);
//     signatureParts = { r, s, v };
//     console.log([hash,signatureParts])
//     return ([hash,signatureParts]);
// }

