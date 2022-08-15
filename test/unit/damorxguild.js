const { time } = require("@openzeppelin/test-helpers");
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { FIFTY_ETHER, ONE_HUNDRED_ETHER, TWO_HUNDRED_ETHER, MOCK_GUILD_NAMES, MOCK_GUILD_SYMBOLS } = require('../helpers/constants.js');
const init = require('../test-init.js');

// const MIN_LOCK_TIME = 604800; // 1 week
const MAX_LOCK_TIME = 31536000; // 1 year = 60 * 60 * 24 * 365
const maxLockTime = time.duration.days(365);
const COEFFICIENT = 2;

let AMORxGuild;
let dAMORxGuild
let root;
let operator;
let staker;
let operator2;
let staker2;
let timeTooSmall;
let timeTooBig;
let normalTime;
let koef;
let realAmount;

describe('unit - Contract: dAMORxGuild Token', function () {

    const setupTests = deployments.createFixture(async () => {
        const signers = await ethers.getSigners();
        const setup = await init.initialize(signers);
        await init.getTokens(setup);

        AMORxGuild = setup.tokens.ERC20Token;
        dAMORxGuild = setup.tokens.dAMORxGuild;
        root = setup.roles.root;
        operator = setup.roles.operator;
        staker = setup.roles.staker;
        operator2 = setup.roles.user1;
        staker2 = setup.roles.user2;
    });

    before('>>> setup', async function() {
        await setupTests();

        timeTooSmall = (await time.duration.days(6)).toNumber();
        timeTooBig = (await time.duration.days(366)).toNumber();
        normalTime = (await time.duration.days(36)).toNumber();

        await AMORxGuild.connect(root).mint(dAMORxGuild.address, ONE_HUNDRED_ETHER);
    });

    context('» init testing', () => {

        it('initialized variables check', async function () {
            expect(await dAMORxGuild.name()).to.equals("DoinGud MetaDAO");
            expect(await dAMORxGuild.symbol()).to.equals("DAMORxGuild");
            expect(await dAMORxGuild.owner()).to.equals(operator.address);
        });

        it("Should fail if called more than once", async function () {
            await expect(dAMORxGuild.init(
                AMORxGuild.address, 
                MOCK_GUILD_NAMES[0], 
                MOCK_GUILD_SYMBOLS[0],
                ONE_HUNDRED_ETHER
            )).to.be.reverted;
        });
    });
    
    context('» stake testing', () => {

        it('it fails to stakes AMORxGuild tokens if Time is Too Small', async function () {
            await expect(dAMORxGuild.connect(staker).stake(FIFTY_ETHER, timeTooSmall)).to.be.revertedWith(
                'TimeTooSmall()'
            );
        });
        
        it('it fails to stakes AMORxGuild tokens if Time is Too Big', async function () {
            await expect(dAMORxGuild.connect(staker).stake(FIFTY_ETHER, timeTooBig)).to.be.revertedWith(
                'TimeTooBig()'
            );
        });

        it('it fails to stakes AMORxGuild tokens if not enough AMORxGuild', async function () {
            await expect(dAMORxGuild.connect(staker).stake(ONE_HUNDRED_ETHER, normalTime)).to.be.revertedWith(
                'InvalidAmount()'
            );
        });

        it('stakes AMORxGuild tokens and mints dAMORxGuild', async function () {
            await AMORxGuild.connect(root).mint(staker.address, ONE_HUNDRED_ETHER);
            await AMORxGuild.connect(staker).approve(dAMORxGuild.address, ONE_HUNDRED_ETHER);

            koef = normalTime/MAX_LOCK_TIME;
            const expectedAmount = COEFFICIENT* (koef*koef) *ONE_HUNDRED_ETHER; // (koef)^2 *amount | NdAMOR = f(t)^2 *nAMOR

            AMORxGuildBalanceBefore = await AMORxGuild.balanceOf(dAMORxGuild.address);
            await dAMORxGuild.connect(staker).stake(ONE_HUNDRED_ETHER, normalTime);        
            realAmount = (await dAMORxGuild.balanceOf(staker.address)).toString();
            const roundedRealAmount = Math.round(realAmount * 100) / 100;
            
            expect(roundedRealAmount.toString()).to.equal(expectedAmount.toString());

            AMORxGuildBalanceAfter = (await AMORxGuild.balanceOf(dAMORxGuild.address)).toString();
            expect(AMORxGuildBalanceAfter).to.equal(AMORxGuildBalanceBefore.add(ONE_HUNDRED_ETHER));
        });

    });

    context('» increaseStake testing', () => {

        it('it fails to increase stake AMORxGuild tokens if not enough AMORxGuild', async function () {
            await expect(dAMORxGuild.connect(staker).increaseStake(ONE_HUNDRED_ETHER)).to.be.revertedWith(
                'InvalidAmount()'
            );
        });

        it('increases stake AMORxGuild tokens and mints dAMORxGuild', async function () {
            await AMORxGuild.connect(root).mint(staker.address, ONE_HUNDRED_ETHER);
            await AMORxGuild.connect(staker).approve(dAMORxGuild.address, ONE_HUNDRED_ETHER);

            koef = normalTime/MAX_LOCK_TIME;
            const newAmount = COEFFICIENT* (koef*koef) *ONE_HUNDRED_ETHER; // (koef)^2 *amount | NdAMOR = f(t)^2 *nAMOR
            const expectedAmount = ethers.BigNumber.from(realAmount).add(ethers.BigNumber.from(newAmount.toString()));

            await dAMORxGuild.connect(staker).increaseStake(ONE_HUNDRED_ETHER);        
            const newRealAmount = await dAMORxGuild.balanceOf(staker.address);
            const roundedNewRealAmount = Math.round(newRealAmount.toString() * 100) / 100;

            expect(roundedNewRealAmount.toString()).to.be.gt(ethers.BigNumber.from(realAmount));
            expect(expectedAmount.toString()).to.be.gt(newRealAmount);
            
            realAmount = newRealAmount;
        });

    });

    context('» delegate testing', () => {

        it('it fails to undelegate dAMORxGuild tokens if nothing to undelegate', async function () {
            await expect(dAMORxGuild.connect(staker).undelegate(operator.address, FIFTY_ETHER)).to.be.revertedWith(
                'NotDelegatedAny()'
            ); 
        });

        it('it fails to delegate dAMORxGuild tokens if not enough dAMORxGuild', async function () {
            await expect(dAMORxGuild.connect(staker).delegate(operator.address, TWO_HUNDRED_ETHER)).to.be.revertedWith(
                'InvalidAmount()'
            ); 
        });

        it('it fails to delegate dAMORxGuild tokens if delegation to itself', async function () {
            await expect(dAMORxGuild.connect(staker).delegate(staker.address, FIFTY_ETHER)).to.be.revertedWith(
                'InvalidSender()'
            ); 
        });

        it('delegate dAMORxGuild tokens', async function () {
            await dAMORxGuild.connect(staker).delegate(operator.address, realAmount);
            expect((await dAMORxGuild.amountDelegated(staker.address)).toString()).to.equal(realAmount.toString());
        });

        it('delegate dAMORxGuild tokens to the same address', async function () {
            await AMORxGuild.connect(root).mint(staker2.address, ONE_HUNDRED_ETHER);
            await AMORxGuild.connect(staker2).approve(dAMORxGuild.address, ONE_HUNDRED_ETHER);
            await dAMORxGuild.connect(staker2).stake(ONE_HUNDRED_ETHER, normalTime);        

            await dAMORxGuild.connect(staker2).delegate(operator2.address, ethers.BigNumber.from(12));
            expect((await dAMORxGuild.amountDelegated(staker2.address)).toString()).to.equal(ethers.BigNumber.from(12).toString());
            await dAMORxGuild.connect(staker2).delegate(operator2.address, ethers.BigNumber.from(14));
            expect((await dAMORxGuild.amountDelegated(staker2.address)).toString()).to.equal(ethers.BigNumber.from(26).toString());
        });

        it('it fails to delegate dAMORxGuild tokens if Unavailable amount of dAMORxGuild', async function () {
            await expect(dAMORxGuild.connect(staker).delegate(operator.address, ONE_HUNDRED_ETHER)).to.be.revertedWith(
                'InvalidAmount()'
            ); 
        });
    });

    context('» undelegate testing', () => {

        it('it fails to undelegate dAMORxGuild tokens if try to undelegate itself', async function () {
            await expect(dAMORxGuild.connect(staker).undelegate(staker.address, FIFTY_ETHER)).to.be.revertedWith(
                'InvalidSender()'
            ); 
        });

        it('it undelegates dAMORxGuild tokens', async function () {
            await dAMORxGuild.connect(staker).undelegate(operator.address, FIFTY_ETHER);
            expect((await dAMORxGuild.amountDelegated(staker.address)).toString()).to.equal("0");
        });

        it('it undelegates dAMORxGuild tokens if amount > balance dAMORxGuild', async function () {
            await dAMORxGuild.connect(staker).delegate(operator.address, realAmount);
            expect((await dAMORxGuild.amountDelegated(staker.address)).toString()).to.equal(realAmount.toString());

            let delagatedToBefore = await dAMORxGuild.delegation(staker.address, 0);
            let addressBefore = await dAMORxGuild.delegators(operator.address, 0);

            expect(delagatedToBefore).to.equal(operator.address);
            expect(addressBefore).to.equal(staker.address);
            
            await dAMORxGuild.connect(staker).undelegate(operator.address, TWO_HUNDRED_ETHER);
            expect((await dAMORxGuild.amountDelegated(staker.address)).toString()).to.equal("0");

            await expect(dAMORxGuild.delegators(operator.address, 0)).to.be.reverted; 
            await expect(dAMORxGuild.delegation(staker.address, 0)).to.be.reverted; 
            expect((await dAMORxGuild.delegations(staker.address, operator.address)).toString()).to.equal("0");
        });        
    });

    context('» undelegateAll testing', () => {

        it('it undelegates all dAMORxGuild tokens', async function () {
            await dAMORxGuild.connect(staker).delegate(operator.address, realAmount);

            let delagatedToBefore = await dAMORxGuild.delegation(staker.address, 0);
            let addressBefore = await dAMORxGuild.delegators(operator.address, 0);

            expect(delagatedToBefore).to.equal(operator.address);
            expect(addressBefore).to.equal(staker.address);

            await dAMORxGuild.connect(staker).undelegateAll();

            await expect(dAMORxGuild.delegators(operator.address, 0)).to.be.reverted; 
            await expect(dAMORxGuild.delegation(staker.address, 0)).to.be.reverted; 
        });
    });

    context('» withdraw testing', () => {

        it('it fails to withdraw dAMORxGuild tokens if stake is not finished', async function () {
            await expect(dAMORxGuild.connect(staker).withdraw()).to.be.revertedWith(
                'TimeTooSmall()'
            ); 
        });  

        it('withdraw dAMORxGuild tokens', async function () {
            time.increase(maxLockTime);
            const currentAmount = (await dAMORxGuild.balanceOf(staker.address)).toString();
            await dAMORxGuild.connect(staker).withdraw();        
            const withdrawedTokens = (await AMORxGuild.balanceOf(staker.address)).toString();
            
            expect(withdrawedTokens).to.equal(currentAmount);
        });        
    });
});