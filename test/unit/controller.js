const { expect } = require('chai');
const { ethers } = require('hardhat');
const { ONE_HUNDRED_ETHER } = require('../helpers/constants.js');
const init = require('../test-init.js');

const FEE_DENOMINATOR = 1000;
const impactFees = 800; //80% // FEE_DENOMINATOR/100*80
const projectFees = 200; //20%

let AMORxGuild;
let FXAMORxGuild
let controller;
let impactPoll;
let projectPoll;
let root;
let authorizer_adaptor;
let operator;

describe('unit - Contract: Controller', function () {

    const setupTests = deployments.createFixture(async () => {
        const signers = await ethers.getSigners();
        const setup = await init.initialize(signers);
        await init.getTokens(setup);

        AMORxGuild = setup.tokens.ERC20Token;
        FXAMORxGuild = setup.tokens.FXAMORxGuild;
        impactPoll = setup.roles.buyer1;
        projectPoll = setup.roles.buyer2;
        controller = await init.controller(setup, impactPoll, projectPoll);
        root = setup.roles.root;
        authorizer_adaptor = setup.roles.authorizer_adaptor;
        operator = setup.roles.operator;
    });

    before('>>> setup', async function() {
        await setupTests();
    });

    context('» init testing', () => {
        it('initialized variables check', async function () {
            expect(await controller.owner()).to.equals(root.address);
            expect(await controller.AMORxGuild()).to.equals(AMORxGuild.address);
            expect(await controller.FXAMORxGuild()).to.equals(FXAMORxGuild.address);
            expect(await controller.guild()).to.equals(authorizer_adaptor.address);
            expect(await controller.impactPoll()).to.equals(impactPoll.address);
            expect(await controller.projectPoll()).to.equals(projectPoll.address);
        });

        it("Should fail if called more than once", async function () {
            await expect(controller.init(
                root.address, // owner
                AMORxGuild.address,
                FXAMORxGuild.address,
                authorizer_adaptor.address, // guild
                impactPoll.address,
                projectPoll.address
            )).to.be.reverted;
        });
    });
    
    context('» donate testing', () => {

        it('it fails to donate AMORxGuild tokens if not enough AMORxGuild', async function () {
            await expect(controller.connect(operator).donate(ONE_HUNDRED_ETHER)).to.be.revertedWith(
                'InvalidAmount(100000000000000000000, 0)'
            );
        });

        it('donates AMORxGuild tokens', async function () {
            await AMORxGuild.connect(root).mint(operator.address, ONE_HUNDRED_ETHER);
            await AMORxGuild.connect(operator).approve(controller.address, ONE_HUNDRED_ETHER);

            await controller.connect(operator).donate(ONE_HUNDRED_ETHER);        
            
            const ipAmount = (ONE_HUNDRED_ETHER * impactFees) / FEE_DENOMINATOR; // amount to Impact poll
            const ppAmount = (ONE_HUNDRED_ETHER * projectFees) / FEE_DENOMINATOR; // amount to project poll
            const FxGAmount = (ipAmount * 100) / FEE_DENOMINATOR; // FXAMORxGuild Amount = 10% of amount to Impact poll
            const decIpAmount = ipAmount - FxGAmount; //decreased ipAmount

            expect((await AMORxGuild.balanceOf(impactPoll.address)).toString()).to.equal(decIpAmount.toString());
            expect((await AMORxGuild.balanceOf(projectPoll.address)).toString()).to.equal(ppAmount.toString());
            expect((await FXAMORxGuild.balanceOf(operator.address)).toString()).to.equal(FxGAmount.toString());
        });

    });


});