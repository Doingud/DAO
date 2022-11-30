const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants.js');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { TWO_HUNDRED_ETHER, ONE_HUNDRED_ETHER, FIFTY_ETHER, MOCK_GUILD_NAMES, MOCK_GUILD_SYMBOLS } = require('../helpers/constants.js');
const init = require('../test-init.js');

let AMORxGuild;
let FXAMORxGuild;
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

        await FXAMORxGuild.init(
            "DoinGud MetaDAO", 
            "FXAMORxGuild", 
            operator.address, //controller
            AMORxGuild.address
        );
    });

    before('>>> setup', async function() {
        await setupTests();
    });

    context('» init testing', () => {
        it('initialized variables check', async function () {
            expect(await FXAMORxGuild.name()).to.equals("DoinGud MetaDAO");
            expect(await FXAMORxGuild.symbol()).to.equals("FXAMORxGuild");
            expect(await FXAMORxGuild.owner()).to.equals(operator.address);
            expect(await FXAMORxGuild.AMORxGuild()).to.equals(AMORxGuild.address);
        });

        it("Should fail if called more than once", async function () {
            await expect(FXAMORxGuild.init(
                MOCK_GUILD_NAMES[0], 
                MOCK_GUILD_SYMBOLS[0],
                operator.address,
                AMORxGuild.address
            )).to.be.revertedWith("AlreadyInitialized()");
        });
    });
    
    context('» stake testing', () => {

        it('it fails to stakes AMORxGuild tokens if not an owner', async function () {
            await expect(FXAMORxGuild.connect(staker).stake(root.address, FIFTY_ETHER)).to.be.revertedWith(
                'Unauthorized()'
            );
        });

        it('it fails to stakes AMORxGuild tokens if not enough AMORxGuild', async function () {
            await expect(FXAMORxGuild.connect(operator).stake(staker.address, ONE_HUNDRED_ETHER)).to.be.revertedWith(
                'InvalidAmount()'
            );
        });

        it('it fails to stakes AMORxGuild tokens if stakes to zero address', async function () {
            await expect(FXAMORxGuild.connect(operator).stake(ZERO_ADDRESS, ONE_HUNDRED_ETHER)).to.be.revertedWith(
                'AddressZero()'
            );
        });

        it('it fails to stakes AMORxGuild tokens if stakes to itself', async function () {
            await expect(FXAMORxGuild.connect(operator).stake(operator.address, ONE_HUNDRED_ETHER)).to.be.revertedWith(
                'InvalidSender()'
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

        it('fails to set controller address if address zero', async function () {
            await expect(FXAMORxGuild.connect(operator).setController(ZERO_ADDRESS)).to.be.revertedWith('AddressZero()');
            expect(await FXAMORxGuild.controller()).to.equal(authorizer_adaptor.address);
        });
    });

    context('» delegate testing', () => {

        it('it fails to undelegate FXAMORxGuild tokens if nothing to undelegate', async function () {
            await expect(FXAMORxGuild.connect(staker).undelegate(operator.address, FIFTY_ETHER)).to.be.revertedWith(
                'NotDelegatedAny()'
            ); 
        });
        
        it('it fails to delegate FXAMORxGuild tokens if not enough FXAMORxGuild', async function () {
            await expect(FXAMORxGuild.connect(staker).delegate(operator.address, TWO_HUNDRED_ETHER)).to.be.revertedWith(
                'InvalidAmount()'
            ); 
        });

        it('it fails to delegate FXAMORxGuild tokens if delegation to itself', async function () {
            await expect(FXAMORxGuild.connect(staker).delegate(staker.address, FIFTY_ETHER)).to.be.revertedWith(
                'InvalidSender()'
            ); 
        });

        it('it fails to delegate FXAMORxGuild tokens if delegation to address(0)', async function () {
            await expect(FXAMORxGuild.connect(staker).delegate(ZERO_ADDRESS, FIFTY_ETHER)).to.be.revertedWith(
                'AddressZero()'
            ); 
        });

        it('delegate FXAMORxGuild tokens', async function () {
            await FXAMORxGuild.connect(staker).delegate(operator.address, FIFTY_ETHER);
            expect((await FXAMORxGuild.amountDelegated(staker.address)).toString()).to.equal(FIFTY_ETHER.toString());
        });

        it('it fails to delegate FXAMORxGuild tokens if Unavailable amount of FXAMORxGuild', async function () {
            await expect(FXAMORxGuild.connect(staker).delegate(operator.address, ONE_HUNDRED_ETHER)).to.be.revertedWith(
                'InvalidAmount()'
            ); 
        });
    });

    context('» undelegate testing', () => {

        it('it fails to undelegate FXAMORxGuild tokens if try to undelegate itself', async function () {
            await expect(FXAMORxGuild.connect(staker).undelegate(staker.address, FIFTY_ETHER)).to.be.revertedWith(
                'InvalidSender()'
            ); 
        });

        it('it undelegates FXAMORxGuild tokens', async function () {
            await FXAMORxGuild.connect(staker).undelegate(operator.address, FIFTY_ETHER);
            expect((await FXAMORxGuild.amountDelegated(staker.address)).toString()).to.equal("0");
        });

        it('it undelegates FXAMORxGuild tokens if amount > balance FXAMORxGuild', async function () {
            await FXAMORxGuild.connect(staker).delegate(operator.address, FIFTY_ETHER);
            await FXAMORxGuild.connect(staker).undelegate(operator.address, TWO_HUNDRED_ETHER);
            expect((await FXAMORxGuild.amountDelegated(staker.address)).toString()).to.equal("0");
        });
        
        it('it fails to undelegate FXAMORxGuild tokens if nothing to undelegate', async function () {
            await expect(FXAMORxGuild.connect(staker).undelegate(operator.address, FIFTY_ETHER)).to.be.revertedWith(
                'NotDelegatedAny()'
            ); 
        });
    });

    context('» burn testing', () => {

        it('it fails to burn FXAMORxGuild tokens if not enough FXAMORxGuild', async function () {        
            await expect(FXAMORxGuild.connect(operator).burn(operator.address, operator.address, TWO_HUNDRED_ETHER)).to.be.revertedWith(
                'InvalidAmount()'
            ); 
        });

        it('it fails to burn FXAMORxGuild tokens if not an owner', async function () {        
            await expect(FXAMORxGuild.connect(staker).burn(staker.address, staker.address, TWO_HUNDRED_ETHER)).to.be.revertedWith(
                'Ownable: caller is not the owner'
            ); 
        });

        it('burn FXAMORxGuild tokens and returns AMORxGuild', async function () {    
            expect((await FXAMORxGuild.balanceOf(staker.address)).toString()).to.equal(ONE_HUNDRED_ETHER.toString());    
            await FXAMORxGuild.connect(operator).burn(staker.address, staker.address, FIFTY_ETHER);    
            expect((await FXAMORxGuild.balanceOf(staker.address)).toString()).to.equal(FIFTY_ETHER.toString());
        });
    });

});