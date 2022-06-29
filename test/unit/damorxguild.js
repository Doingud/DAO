const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants.js');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { FIFTY_ETHER } = require('../helpers/constants.js');
const { ONE_HUNDRED_ETHER } = require('../helpers/constants.js');
const init = require('../test-init.js');

let AMORxGuild;
let dAMORxGuild
let root;
let authorizer_adaptor;
let operator;
let staker;

describe('unit - Contract: dAMORxGuild Token', function () {

    const setupTests = deployments.createFixture(async () => {
        const signers = await ethers.getSigners();
        const setup = await init.initialize(signers);
        await init.getTokens(setup);

        AMORxGuild = setup.tokens.ERC20Token;
        dAMORxGuild = setup.tokens.dAMORxGuild;
        root = setup.roles.root;
        authorizer_adaptor = setup.roles.authorizer_adaptor;
        operator = setup.roles.operator;
        staker = setup.roles.staker;
    });

    before('>>> setup', async function() {
        await setupTests();
    });

    context('» dAMORxGuild testing', () => {
        it('fait to stakes AMORxGuild tokens if Unauthorized', async function () {
            await expect(dAMORxGuild.connect(staker).stake(root.address, FIFTY_ETHER)).to.be.revertedWith(
                'Unauthorized()'
            );
        });

        it('fait to stakes AMORxGuild tokens if not enough AMORxGuild', async function () {
            await expect(dAMORxGuild.connect(operator).stake(operator.address, ONE_HUNDRED_ETHER)).to.be.revertedWith(
                'Unsufficient AMORxGuild'
            );
        });

        it('stakes AMORxGuild tokens and mints dAMORxGuild', async function () {
            await AMORxGuild.connect(root).mint(operator.address, ONE_HUNDRED_ETHER);
            await AMORxGuild.connect(operator).approve(dAMORxGuild.address, ONE_HUNDRED_ETHER);

            await dAMORxGuild.connect(operator).stake(operator.address, ONE_HUNDRED_ETHER);        
            expect((await dAMORxGuild.balanceOf(operator.address)).toString()).to.equal(ONE_HUNDRED_ETHER.toString());
        });

        it('it sets controller address', async function () {
            await dAMORxGuild.connect(operator).setController(authorizer_adaptor.address);        
            expect(await dAMORxGuild.controller()).to.equal(authorizer_adaptor.address);
        });

        it('delegated dAMORxGuild tokens', async function () {
            await dAMORxGuild.connect(operator).delegate(staker.address, FIFTY_ETHER);    
            expect((await dAMORxGuild.delagetedBalanceOf(operator.address)).toString()).to.equal(FIFTY_ETHER.toString());
        });

        it('burn dAMORxGuild tokens and returns AMORxGuild', async function () {            
            await dAMORxGuild.connect(operator).burn(operator.address, FIFTY_ETHER);    
            expect((await dAMORxGuild.balanceOf(operator.address)).toString()).to.equal(FIFTY_ETHER.toString());
        });
    });

});