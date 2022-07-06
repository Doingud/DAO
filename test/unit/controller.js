const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants.js');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { TWO_HUNDRED_ETHER, ONE_HUNDRED_ETHER, FIFTY_ETHER, MOCK_GUILD_NAMES, MOCK_GUILD_SYMBOLS } = require('../helpers/constants.js');
const init = require('../test-init.js');

let AMORxGuild;
let FXAMORxGuild
let controller;
let impactPoll;
let projectPoll;
let root;
let authorizer_adaptor;
let operator;
let staker;

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
        staker = setup.roles.staker;
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
            expect((await controller.balanceOf(operator.address)).toString()).to.equal(ONE_HUNDRED_ETHER.toString());
        });

    });


});