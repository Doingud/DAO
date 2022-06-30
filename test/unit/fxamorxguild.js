const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants.js');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { TWO_HUNDRED_ETHER, ONE_HUNDRED_ETHER, FIFTY_ETHER } = require('../helpers/constants.js');
const init = require('../test-init.js');

let AMORxGuild;
let FXAMORxGuild
let root;
let authorizer_adaptor;
let operator;
let staker;

describe('unit - Contract: FXAMORxGuild Token', function () {

    const setupTests = deployments.createFixture(async () => {
        const signers = await ethers.getSigners();
        const setup = await init.initialize(signers);
        await init.getTokens(setup);

        AMORxGuild = setup.tokens.ERC20Token;
        FXAMORxGuild = setup.tokens.FXAMORxGuild;
        root = setup.roles.root;
        authorizer_adaptor = setup.roles.authorizer_adaptor;
        operator = setup.roles.operator;
        staker = setup.roles.staker;
    });

    before('>>> setup', async function() {
        await setupTests();
    });

    context('» stake testing', () => {

        it('it fails to stakes AMORxGuild tokens if not an owner', async function () {
            await expect(FXAMORxGuild.connect(staker).stake(root.address, FIFTY_ETHER)).to.be.revertedWith(
                'Unauthorized()'
            );
        });

        it('it fails to stakes AMORxGuild tokens if not enough AMORxGuild', async function () {
            await expect(FXAMORxGuild.connect(operator).stake(staker.address, ONE_HUNDRED_ETHER)).to.be.revertedWith(
                'Unsufficient AMORxGuild'
            );
        });

        it('it fails to stakes AMORxGuild tokens if stakes to zero address', async function () {
            await expect(FXAMORxGuild.connect(operator).stake(ZERO_ADDRESS, ONE_HUNDRED_ETHER)).to.be.revertedWith(
                'Stakes to zero address is disallowed.'
            );
        });

        it('it fails to stakes AMORxGuild tokens if stakes to FXAMORxGuild address', async function () {
            await expect(FXAMORxGuild.connect(operator).stake(operator.address, ONE_HUNDRED_ETHER)).to.be.revertedWith(
                'Stake to themself is disallowed.'
            );
        });

        it('stakes AMORxGuild tokens and mints FXAMORxGuild', async function () {
            await AMORxGuild.connect(root).mint(operator.address, ONE_HUNDRED_ETHER);
            await AMORxGuild.connect(operator).approve(FXAMORxGuild.address, ONE_HUNDRED_ETHER);

            await FXAMORxGuild.connect(operator).stake(staker.address, ONE_HUNDRED_ETHER);        
            expect((await FXAMORxGuild.balanceOf(staker.address)).toString()).to.equal(ONE_HUNDRED_ETHER.toString());
        });

        it('sets controller address', async function () {
            await FXAMORxGuild.connect(operator).setController(authorizer_adaptor.address);        
            expect(await FXAMORxGuild.controller()).to.equal(authorizer_adaptor.address);
        });
    });

    context('» delegate testing', () => {

        it('it fails to delegate FXAMORxGuild tokens if not enough FXAMORxGuild', async function () {
            await expect(FXAMORxGuild.connect(staker).delegate(operator.address, TWO_HUNDRED_ETHER)).to.be.revertedWith(
                'Unavailable amount of FXAMORxGuild'
            ); 
        });

        it('it fails to delegate FXAMORxGuild tokens if delegation to themself', async function () {
            await expect(FXAMORxGuild.connect(staker).delegate(staker.address, FIFTY_ETHER)).to.be.revertedWith(
                'Self-delegation is disallowed.'
            ); 
        });

        it('it fails to delegate FXAMORxGuild tokens if delegation to address(0)', async function () {
            await expect(FXAMORxGuild.connect(staker).delegate(ZERO_ADDRESS, FIFTY_ETHER)).to.be.revertedWith(
                'Delegation to zero address is disallowed.'
            ); 
        });

        it('delegate FXAMORxGuild tokens', async function () {
            await FXAMORxGuild.connect(staker).delegate(operator.address, FIFTY_ETHER);
            expect((await FXAMORxGuild.amountDelegated(staker.address)).toString()).to.equal(FIFTY_ETHER.toString());
        });

        it('it fails to delegate FXAMORxGuild tokens if Unavailable amount of FXAMORxGuild', async function () {
            await expect(FXAMORxGuild.connect(staker).delegate(operator.address, ONE_HUNDRED_ETHER)).to.be.revertedWith(
                'Unavailable amount of FXAMORxGuild'
            ); 
        });
    });

    context('» burn testing', () => {

        it('it fails to burn FXAMORxGuild tokens if not enough FXAMORxGuild', async function () {        
            await expect(FXAMORxGuild.connect(operator).burn(operator.address, TWO_HUNDRED_ETHER)).to.be.revertedWith(
                'Unsufficient FXAMORxGuild'
            ); 
        });

        it('it fails to burn FXAMORxGuild tokens if not an owner', async function () {        
            await expect(FXAMORxGuild.connect(staker).burn(staker.address, TWO_HUNDRED_ETHER)).to.be.revertedWith(
                'Unauthorized()'
            ); 
        });

        it('burn FXAMORxGuild tokens and returns AMORxGuild', async function () {        
            await FXAMORxGuild.connect(operator).burn(staker.address, FIFTY_ETHER);    
            expect((await AMORxGuild.balanceOf(authorizer_adaptor.address)).toString()).to.equal(FIFTY_ETHER.toString());
        });
    });

});