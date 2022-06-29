const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants.js');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { FIFTY_ETHER } = require('../helpers/constants.js');
const { ONE_HUNDRED_ETHER } = require('../helpers/constants.js');
const init = require('../test-init.js');

describe('unit - Contract: FXAMORxGuild Token', async () => {
    let ERC20Token, FXAMORxGuild, root, operator, staker;

    const setupTests = deployments.createFixture(async () => {
        const signers = await ethers.getSigners();
        const setup = await init.initialize(signers);
        await init.getTokens(setup);

        AMORxGuild = setup.tokens.ERC20Token;
        FXAMORxGuild = setup.tokens.FXAMORxGuild;
        root = setup.roles.root;
        operator = setup.roles.operator;
        staker = setup.roles.staker;
    });

    beforeEach(async function () {
        await setupTests();
    });

    it('fait to stakes AMORxGuild tokens if Unauthorized', async function () {
        await expect(FXAMORxGuild.connect(staker).stake(root.address, FIFTY_ETHER)).to.be.revertedWith(
            'Unauthorized()'
        );
    });

    it('fait to stakes AMORxGuild tokens if not enough AMORxGuild', async function () {
        await expect(FXAMORxGuild.connect(operator).stake(operator.address, ONE_HUNDRED_ETHER)).to.be.revertedWith(
            'Unsufficient AMORxGuild'
        );
    });

    it('stakes AMORxGuild tokens and mints FXAMORxGuild', async function () {
        await AMORxGuild.connect(root).mint(operator.address, ONE_HUNDRED_ETHER);
        await AMORxGuild.connect(operator).approve(FXAMORxGuild.address, ONE_HUNDRED_ETHER);

        await FXAMORxGuild.connect(operator).stake(operator.address, ONE_HUNDRED_ETHER);        
        expect((await FXAMORxGuild.balanceOf(operator.address)).toString()).to.equal(ONE_HUNDRED_ETHER.toString());
    });

});