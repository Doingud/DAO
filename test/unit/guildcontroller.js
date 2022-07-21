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

let AMOR;
let AMORxGuild;
let FXAMORxGuild
let controller;
let root;
let authorizer_adaptor;
let impactMaker;
let operator;
let user;
let user2;
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

        AMOR = setup.tokens.AmorTokenImplementation;
        AMORxGuild = setup.tokens.AmorGuildToken;//AmorTokenImplementation;
        FXAMORxGuild = setup.tokens.FXAMORxGuild;
        controller = await init.controller(setup);
        root = setup.roles.root;
        staker = setup.roles.staker;
        operator = setup.roles.operator;
        impactMaker = setup.roles.doingud_multisig;
        user = setup.roles.user3;
        user2 = setup.roles.user2;
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
    
    context('» setImpactMakers testing', () => {

        it('it fails to set ImpactMaker if not the owner', async function () {
            impactMakers = [staker.address, operator.address, impactMaker.address];
            weigths = [20, 34, 923];
            await expect(controller.connect(user).setImpactMakers(impactMakers, weigths)).to.be.revertedWith(
                'Ownable: caller is not the owner'
            );
        });

        it('it sets ImpactMakers', async function () {
            await controller.connect(root).setImpactMakers(impactMakers, weigths);
            expect(await controller.impactMakers(0)).to.equals(staker.address);
            expect(await controller.impactMakers(1)).to.equals(operator.address);
            expect(await controller.impactMakers(2)).to.equals(impactMaker.address);
            expect(await controller.weights(staker.address)).to.equals(20);
            expect(await controller.weights(operator.address)).to.equals(34);
            expect(await controller.weights(impactMaker.address)).to.equals(923);
        });
    });

    context('» addImpactMaker testing', () => {

        it('it fails to add ImpactMaker if not the owner', async function () {
            await expect(controller.connect(user).addImpactMaker(user2.address, 30)).to.be.revertedWith(
                'Ownable: caller is not the owner'
            );
        });

        it('it adds ImpactMaker', async function () {
            await controller.connect(root).addImpactMaker(user2.address, 30);
            expect(await controller.impactMakers(3)).to.equals(user2.address);
            expect(await controller.weights(user2.address)).to.equals(30);
        });
    });

    context('» changeImpactMaker testing', () => {

        it('it fails to change ImpactMaker if not the owner', async function () {
            await expect(controller.connect(user).changeImpactMaker(user2.address, 900)).to.be.revertedWith(
                'Ownable: caller is not the owner'
            );
        });

        it('it changes ImpactMaker to bigger value', async function () {
            await controller.connect(root).changeImpactMaker(user2.address, 900);
            expect(await controller.impactMakers(3)).to.equals(user2.address);
            expect(await controller.weights(user2.address)).to.equals(900);
        });

        it('it changes ImpactMaker to less value', async function () {
            await controller.connect(root).changeImpactMaker(user2.address, 3);
            expect(await controller.impactMakers(3)).to.equals(user2.address);
            expect(await controller.weights(user2.address)).to.equals(3);
        });
    });

    context('» removeImpactMaker testing', () => {

        it('it fails to removes ImpactMaker if not the owner', async function () {
            await expect(controller.connect(user).removeImpactMaker(user2.address)).to.be.revertedWith(
                'Ownable: caller is not the owner'
            );
        });

        it('it removes ImpactMaker', async function () {
            await controller.connect(root).removeImpactMaker(user2.address);
            await expect(controller.impactMakers(3)).to.be.reverted;
            expect(await controller.weights(user2.address)).to.equals(0);
        });
    });

    context('» donate testing', () => {

        it('it fails to donate AMORxGuild tokens if not enough AMORxGuild', async function () {
            await expect(controller.connect(operator).donate(ONE_HUNDRED_ETHER)).to.be.revertedWith(
                'InvalidAmount()'
            );
        });

        it('donates AMORxGuild tokens', async function () {
            await AMOR.connect(root).transfer(controller.address, TEST_TRANSFER);
            await AMOR.connect(root).transfer(user.address, TEST_TRANSFER);

            await AMOR.connect(user).approve(AMORxGuild.address, TEST_TRANSFER);
            let AMORDeducted = TEST_TRANSFER*(TAX_RATE/BASIS_POINTS);//Math.ceil(TEST_TRANSFER * (1 - TAX_RATE / BASIS_POINTS));
            let nextAMORDeducted = AMORDeducted*(TAX_RATE/BASIS_POINTS);//Math.ceil(AMORDeducted * (1 - TAX_RATE / BASIS_POINTS));
console.log("AMORDeducted is %s", AMORDeducted);
console.log("nextAMORDeducted is %s", nextAMORDeducted);
            await AMORxGuild.connect(user).stakeAmor(user.address, nextAMORDeducted);
            await AMORxGuild.connect(user).approve(controller.address, nextAMORDeducted);

            await controller.connect(user).donate(TEST_TRANSFER_SMALLER);        

            const totalWeight = await controller.totalWeight();
            const FxGAmount = (TEST_TRANSFER_SMALLER * percentToConvert) / FEE_DENOMINATOR; // FXAMORxGuild Amount = 10% of amount to Impact poll
            const decIpAmount = (TEST_TRANSFER_SMALLER - FxGAmount); //decreased amount

            let weight = await controller.weights(impactMaker.address);
            let amountToSendImpactMaker = (decIpAmount * weight) / totalWeight;
            let taxDeducted = amountToSendImpactMaker*(TAX_RATE/BASIS_POINTS);//Math.ceil(amountToSendImpactMaker * (1 - TAX_RATE / BASIS_POINTS));

            expect((await FXAMORxGuild.balanceOf(user.address)).toString()).to.equal(FxGAmount.toString());
            expect((await AMORxGuild.balanceOf(impactMaker.address)).toString()).to.equal(taxDeducted.toString());            

            weight = await controller.weights(staker.address);
            amountToSendImpactMaker = (decIpAmount * weight) / totalWeight;
            taxDeducted = amountToSendImpactMaker*(TAX_RATE/BASIS_POINTS);//Math.floor(amountToSendImpactMaker * (1 - TAX_RATE / BASIS_POINTS));
            expect((await AMORxGuild.balanceOf(staker.address)).toString()).to.equal(taxDeducted.toString());

            weight = await controller.weights(operator.address);
            amountToSendImpactMaker = (decIpAmount * weight) / totalWeight;
            taxDeducted = amountToSendImpactMaker*(TAX_RATE/BASIS_POINTS);//Math.floor(amountToSendImpactMaker * (1 - TAX_RATE / BASIS_POINTS));
            expect((await AMORxGuild.balanceOf(operator.address)).toString()).to.equal(taxDeducted.toString());
        });
    });

    context('» claim testing', () => {

        it('it fails to claim if not the owner', async function () {
            await expect(controller.connect(user).claim(user2.address)).to.be.revertedWith(
                'Unauthorized()'
            );
        });

        it('it claims tokens', async function () {
            const balanceBefore = await AMORxGuild.balanceOf(impactMaker.address);
            console.log("balanceBefore is %s", balanceBefore);
            await controller.connect(impactMaker).claim(impactMaker.address);
            const balanceAfter = await controller.claimableTokens[impactMaker.address];
            console.log("balanceAfter is %s", balanceAfter);
            expect((await AMORxGuild.balanceOf(impactMaker.address)).toString()).to.equal(balanceAfter.toString());
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

