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
const TEST_TRANSFER_SMALLER = 80;

let AMORxGuild;
let FXAMORxGuild
let controller;
let root;
let authorizer_adaptor;
let impactMaker;
let operator;

describe('unit - Contract: GuildController', function () {

    const setupTests = deployments.createFixture(async () => {
        const signers = await ethers.getSigners();
        const setup = await init.initialize(signers);
        await init.getTokens(setup);

        AMORxGuild = setup.tokens.AmorTokenImplementation;
        FXAMORxGuild = setup.tokens.FXAMORxGuild;
        controller = await init.controller(setup);
        root = setup.roles.root;
        authorizer_adaptor = setup.roles.authorizer_adaptor;
        operator = setup.roles.operator;
        impactMaker = setup.roles.doingud_multisig;
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
                FXAMORxGuild.address,
                authorizer_adaptor.address, // guild
                impactMaker.address
            )).to.be.reverted;
        });
    });
    context('» ImpactMakers testing', () => {
        it('it fails to set ImpactMakers if not the owner', async function () {
            const impactMakers = [operator.address, authorizer_adaptor.address, impactMaker.address];
            const weigths = [20, 34, 923];
            await expect(controller.connect(operator).setImpactMakers(impactMakers, weigths)).to.be.revertedWith(
                'Ownable: caller is not the owner'
            );
        });

        it('it sets ImpactMakers', async function () {
            const impactMakers = [operator.address, authorizer_adaptor.address, impactMaker.address];
            const weigths = [20, 34, 923];
            await controller.connect(root).setImpactMakers(impactMakers, weigths);
            expect(await controller.impactMakers(0)).to.equals(operator.address);
            expect(await controller.impactMakers(1)).to.equals(authorizer_adaptor.address);
            expect(await controller.impactMakers(2)).to.equals(impactMaker.address);
            expect(await controller.weights(operator.address)).to.equals(20);
            expect(await controller.weights(authorizer_adaptor.address)).to.equals(34);
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

            await AMORxGuild.connect(root).transfer(operator.address, TEST_TRANSFER);
            await AMORxGuild.connect(operator).approve(controller.address, TEST_TRANSFER_SMALLER);

            await controller.connect(operator).donate(TEST_TRANSFER_SMALLER);        
            
            const FxGAmount = (TEST_TRANSFER_SMALLER * percentToConvert) / FEE_DENOMINATOR; // FXAMORxGuild Amount = 10% of amount to Impact poll
            const decIpAmount = (TEST_TRANSFER_SMALLER - FxGAmount); //decreased amount
            const taxDeducted = Math.ceil(decIpAmount * (1 - TAX_RATE / BASIS_POINTS));

            expect((await AMORxGuild.balanceOf(impactMaker.address)).toString()).to.equal(taxDeducted.toString());
            expect((await FXAMORxGuild.balanceOf(operator.address)).toString()).to.equal(FxGAmount.toString());
        });

    });
});
