const { expect } = require('chai');
const { ethers } = require('hardhat');
const { ONE_HUNDRED_ETHER,
        TEST_TRANSFER,
        TAX_RATE,
        BASIS_POINTS
      } = require('../helpers/constants.js');
const init = require('../test-init.js');

const FEE_DENOMINATOR = 1000;
const percentToConvert = 100; //10% // (FEE_DENOMINATOR*10)/100

const TEST_TRANSFER_SMALLER = 80;

let AMOR;
let AMORxGuild;
let FXAMORxGuild
let controller;
let root;
let impactMaker;
let operator;
let user;
let user2;
let staker;
let impactMakers;
let weigths;

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
            )).to.be.revertedWith("Already initialized");
        });
    });

    context('» setImpactMakers testing', () => {
        it('it fails to set ImpactMakers if not the owner', async function () {
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

        it('it fails to add ImpactMaker with the same address', async function () {
            await expect(controller.connect(root).addImpactMaker(user2.address, 30)).to.be.revertedWith(
                'InvalidParameters()'
            );
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

            let AMORDeducted = ethers.BigNumber.from((TEST_TRANSFER*(BASIS_POINTS-TAX_RATE)/BASIS_POINTS).toString());//Math.ceil(TEST_TRANSFER * (1 - TAX_RATE / BASIS_POINTS));
            let nextAMORDeducted =  ethers.BigNumber.from((AMORDeducted*(BASIS_POINTS-TAX_RATE)/BASIS_POINTS).toString());//Math.ceil(AMORDeducted * (1 - TAX_RATE / BASIS_POINTS));

            await AMORxGuild.connect(user).stakeAmor(user.address, nextAMORDeducted);
            await AMORxGuild.connect(user).approve(controller.address, nextAMORDeducted);

            await controller.connect(user).donate(TEST_TRANSFER_SMALLER);        

            const totalWeight = await controller.totalWeight();
            const FxGAmount = (TEST_TRANSFER_SMALLER * percentToConvert) / FEE_DENOMINATOR; // FXAMORxGuild Amount = 10% of amount to Impact poll
            const decIpAmount = (TEST_TRANSFER_SMALLER - FxGAmount); //decreased amount

            let sum = 0;
            let weight = await controller.weights(impactMaker.address);
            let amountToSendImpactMaker = Math.floor((decIpAmount * weight) / totalWeight);

            sum += amountToSendImpactMaker;
            expect((await FXAMORxGuild.balanceOf(user.address)).toString()).to.equal(FxGAmount.toString());
            expect((await controller.claimableTokens(impactMaker.address)).toString()).to.equal(amountToSendImpactMaker.toString());            

            weight = await controller.weights(staker.address);
            amountToSendImpactMaker = Math.floor((decIpAmount * weight) / totalWeight);
            sum += amountToSendImpactMaker;
            expect((await controller.claimableTokens(staker.address)).toString()).to.equal(amountToSendImpactMaker.toString());

            weight = await controller.weights(operator.address);
            amountToSendImpactMaker = Math.floor((decIpAmount * weight) / totalWeight);
            sum += amountToSendImpactMaker;
            expect((await controller.claimableTokens(operator.address)).toString()).to.equal(amountToSendImpactMaker.toString());
        
            expect((await AMORxGuild.balanceOf(controller.address)).toString()).to.equal(sum.toString());            
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
            expect(balanceBefore).to.equal(0);

            const balanceAfter = await controller.claimableTokens(impactMaker.address);
            await controller.connect(impactMaker).claim(impactMaker.address);
            expect((await AMORxGuild.balanceOf(impactMaker.address)).toString()).to.equal(balanceAfter.toString());
        });
    });
});
