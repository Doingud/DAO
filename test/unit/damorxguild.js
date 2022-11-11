const { time } = require("@openzeppelin/test-helpers");
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { FIFTY_ETHER, ONE_HUNDRED_ETHER, TWO_HUNDRED_ETHER, MOCK_GUILD_NAMES, MOCK_GUILD_SYMBOLS, TWO_ADDRESS, ONE_ADDRESS } = require('../helpers/constants.js');
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
let staked;
let staked2;

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
            staked = ONE_HUNDRED_ETHER;   
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
            staked = ethers.BigNumber.from(staked).add(ethers.BigNumber.from(ONE_HUNDRED_ETHER.toString()));

            const newRealAmount = await dAMORxGuild.balanceOf(staker.address);
            const roundedNewRealAmount = Math.round(newRealAmount.toString() * 100) / 100;

            expect(roundedNewRealAmount.toString()).to.be.gt(ethers.BigNumber.from(realAmount));
            expect(expectedAmount.toString()).to.be.gt(newRealAmount);

            realAmount = newRealAmount;
        });

    });

    context('» delegate testing', () => {

        it('it fails to undelegate dAMORxGuild tokens if nothing to undelegate', async function () {
            await expect(dAMORxGuild.connect(staker).undelegate(TWO_ADDRESS, operator.address, FIFTY_ETHER)).to.be.revertedWith(
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
            expect((await dAMORxGuild.delegations(staker.address, operator.address)).toString()).to.equal("0");
            expect((await dAMORxGuild.amountDelegated(staker.address)).toString()).to.equal("0");
            await expect(dAMORxGuild.delegators(operator.address, staker.address)).to.not.equal(TWO_ADDRESS);
            await expect(dAMORxGuild.delegation(staker.address, operator.address)).to.not.equal(TWO_ADDRESS);

            await dAMORxGuild.connect(staker).delegate(operator.address, realAmount);
            
            expect((await dAMORxGuild.amountDelegated(staker.address)).toString()).to.equal(realAmount.toString());
            expect(await dAMORxGuild.delegation(staker.address, operator.address)).to.equal(TWO_ADDRESS);
            let address = await dAMORxGuild.delegators(operator.address, staker.address);
            expect(address.who).to.equal(staker.address);
            expect(address.prev).to.equal(TWO_ADDRESS);
            expect((await dAMORxGuild.delegations(staker.address, operator.address)).toString()).to.equal(realAmount.toString());
        });

        it('delegate dAMORxGuild tokens to the same address', async function () {
            await AMORxGuild.connect(root).mint(staker2.address, ONE_HUNDRED_ETHER);
            await AMORxGuild.connect(staker2).approve(dAMORxGuild.address, ONE_HUNDRED_ETHER);
            await dAMORxGuild.connect(staker2).stake(ONE_HUNDRED_ETHER, normalTime);        
            staked2 = ONE_HUNDRED_ETHER;
            await dAMORxGuild.connect(staker2).delegate(operator2.address, ethers.BigNumber.from(12));

            expect((await dAMORxGuild.amountDelegated(staker2.address)).toString()).to.equal(ethers.BigNumber.from(12).toString());
            let address = await dAMORxGuild.delegators(operator2.address, staker2.address);
            expect(address.who).to.equal(staker2.address);
            expect(address.prev).to.equal(TWO_ADDRESS);

            expect(await dAMORxGuild.delegation(staker2.address, operator2.address)).to.equal(TWO_ADDRESS);
            expect((await dAMORxGuild.delegations(staker2.address, operator2.address)).toString()).to.equal(ethers.BigNumber.from(12).toString());

            await dAMORxGuild.connect(staker2).delegate(operator2.address, ethers.BigNumber.from(14));

            expect((await dAMORxGuild.amountDelegated(staker2.address)).toString()).to.equal(ethers.BigNumber.from(26).toString());
            address = await dAMORxGuild.delegators(operator2.address, staker2.address);
            expect(address.who).to.equal(staker2.address);
            expect(address.prev).to.equal(TWO_ADDRESS);
            expect(await dAMORxGuild.delegation(staker2.address, operator2.address)).to.equal(TWO_ADDRESS);
            expect((await dAMORxGuild.delegations(staker2.address, operator2.address)).toString()).to.equal(ethers.BigNumber.from(26).toString());
            await expect(dAMORxGuild.delegators(operator2.address, TWO_ADDRESS)).to.not.equal(TWO_ADDRESS.address);
            await expect(dAMORxGuild.delegation(staker2.address, TWO_ADDRESS)).to.not.equal(TWO_ADDRESS.address);
        });

        it('it fails to delegate dAMORxGuild tokens if Unavailable amount of dAMORxGuild', async function () {
            await expect(dAMORxGuild.connect(staker).delegate(operator.address, ONE_HUNDRED_ETHER)).to.be.revertedWith(
                'InvalidAmount()'
            ); 
        });
    });

    context('» undelegate testing', () => {

        it('it fails to undelegate dAMORxGuild tokens if try to undelegate itself', async function () {
            await expect(dAMORxGuild.connect(staker).undelegate(staker.address, staker.address, FIFTY_ETHER)).to.be.revertedWith(
                'InvalidSender()'
            ); 
        });

        it('it undelegates dAMORxGuild tokens when undelegated amount < delegated amount', async function () {
            expect((await dAMORxGuild.delegations(staker.address, operator.address)).toString()).to.equal(realAmount.toString());
            expect((await dAMORxGuild.amountDelegated(staker.address)).toString()).to.equal(realAmount.toString());
            let address = await dAMORxGuild.delegators(operator.address, staker.address);
            expect(address.who).to.equal(staker.address);
            expect(address.prev).to.equal(TWO_ADDRESS);
            expect(await dAMORxGuild.delegation(staker.address, operator.address)).to.equal(TWO_ADDRESS);

            await dAMORxGuild.connect(staker).undelegate(ONE_ADDRESS, operator.address, 1);

            address = await dAMORxGuild.delegators(operator.address, staker.address);
            expect(address.who).to.equal(staker.address);
            expect(address.prev).to.equal(TWO_ADDRESS);
            expect(await dAMORxGuild.delegation(staker.address, operator.address)).to.equal(TWO_ADDRESS);

            expect(await dAMORxGuild.delegations(staker.address, operator.address)).lte(realAmount);
            expect(await dAMORxGuild.amountDelegated(staker.address)).lte(realAmount);
        });

        it('it undelegates dAMORxGuild tokens when undelegated amount > delegated amount', async function () {
            let address = await dAMORxGuild.delegators(operator.address, staker.address);
            expect(address.who).to.equal(staker.address);
            expect(address.prev).to.equal(TWO_ADDRESS);
            expect(await dAMORxGuild.delegation(staker.address, operator.address)).to.equal(TWO_ADDRESS);

            await dAMORxGuild.connect(staker).undelegate(ONE_ADDRESS, operator.address, FIFTY_ETHER);

            expect((await dAMORxGuild.delegations(staker.address, operator.address)).toString()).to.equal("0");
            expect((await dAMORxGuild.amountDelegated(staker.address)).toString()).to.equal("0");
            await expect(dAMORxGuild.delegators(operator.address, staker.address)).to.not.equal(TWO_ADDRESS);
            expect(await dAMORxGuild.delegation(staker.address, operator.address)).to.not.equal(TWO_ADDRESS);
        });

        it('it undelegates dAMORxGuild tokens if amount > balance dAMORxGuild', async function () {
            await dAMORxGuild.connect(staker2).delegate(operator.address, ethers.BigNumber.from(12));
            expect((await dAMORxGuild.amountDelegated(staker2.address)).toString()).to.equal(ethers.BigNumber.from(38).toString());
            await dAMORxGuild.connect(staker).delegate(operator.address, realAmount);
            expect((await dAMORxGuild.amountDelegated(staker.address)).toString()).to.equal(realAmount.toString());

            let delagatedToBefore = await dAMORxGuild.delegation(staker.address, operator.address);
            let addressBefore = await dAMORxGuild.delegators(operator.address, staker2.address);
            let addressTwoBefore = await dAMORxGuild.delegators(operator.address, staker.address);

            expect(delagatedToBefore).to.equal(TWO_ADDRESS);
            expect(addressBefore.next).to.equal(ONE_ADDRESS);
            expect(addressTwoBefore.prev).to.equal(staker2.address);

            await dAMORxGuild.connect(staker).undelegate(ONE_ADDRESS, operator.address, TWO_HUNDRED_ETHER);

            expect((await dAMORxGuild.amountDelegated(staker.address)).toString()).to.equal("0");

            await expect(dAMORxGuild.delegators(operator.address, staker.address)).to.not.equal(staker2.address);
            expect(await dAMORxGuild.delegation(staker.address, operator.address)).to.not.equal(TWO_ADDRESS);
            expect((await dAMORxGuild.delegations(staker.address, operator.address)).toString()).to.equal("0");

            await dAMORxGuild.connect(staker2).undelegate(ONE_ADDRESS, operator.address, TWO_HUNDRED_ETHER);
        });        
    });

    context('» undelegateAll testing', () => {

        it('it undelegates all dAMORxGuild tokens', async function () {
            await dAMORxGuild.connect(staker2).delegate(operator.address, ethers.BigNumber.from(12));
            await dAMORxGuild.connect(staker).delegate(operator.address, realAmount);

            let delagatedToBefore = await dAMORxGuild.delegation(staker.address, operator.address);
            let addressBefore = await dAMORxGuild.delegators(operator.address, staker2.address);
            let addressTwoBefore = await dAMORxGuild.delegators(operator.address, staker.address);

            expect(delagatedToBefore).to.equal(TWO_ADDRESS);
            expect(addressBefore.next).to.equal(ONE_ADDRESS);
            expect(addressTwoBefore.prev).to.equal(staker2.address);

            await dAMORxGuild.connect(staker).undelegateAll();

            let addressAfter = await dAMORxGuild.delegators(operator.address, ONE_ADDRESS);
            await expect(addressAfter.prev).to.equal(staker2.address);
            await expect(dAMORxGuild.delegators(operator.address, staker.address)).to.not.equal(TWO_ADDRESS);
            expect(await dAMORxGuild.delegation(staker.address, operator.address)).to.not.equal(TWO_ADDRESS);
        });

        it('it fails undelegates all if nothing to undelegate', async function () {
            await expect(dAMORxGuild.connect(staker).undelegateAll()).to.be.revertedWith(
                'NotDelegatedAny()'
            ); 
        });
    });

    context('» withdraw testing', () => {

        it('it fails to withdraw dAMORxGuild tokens if stake is not finished', async function () {
            await expect(dAMORxGuild.connect(staker).withdraw()).to.be.revertedWith(
                'TimeTooSmall()'
            ); 
        });  

        it('stakes AMORxGuild tokens and mints dAMORxGuild if now withdrawed', async function () {
            time.increase(maxLockTime);
            const amountBefore = (await dAMORxGuild.balanceOf(staker.address)).toString();
            await AMORxGuild.connect(root).mint(staker.address, ONE_HUNDRED_ETHER);
            await AMORxGuild.connect(staker).approve(dAMORxGuild.address, ONE_HUNDRED_ETHER);

            koef = normalTime/MAX_LOCK_TIME;

            const difference = 190;
            const expectedAmount = COEFFICIENT* (koef*koef) *ONE_HUNDRED_ETHER; // (koef)^2 *amount | NdAMOR = f(t)^2 *nAMOR
            const expectedAmountAfter = ethers.BigNumber.from(amountBefore)
                .add(ethers.BigNumber.from(expectedAmount.toString()))
                .sub(ethers.BigNumber.from(difference.toString()));

            AMORxGuildBalanceBefore = await AMORxGuild.balanceOf(dAMORxGuild.address);
            await dAMORxGuild.connect(staker).stake(ONE_HUNDRED_ETHER, normalTime);        
            realAmount = (await dAMORxGuild.balanceOf(staker.address)).toString();
            const roundedRealAmount = Math.round(realAmount * 100) / 100;
            
            expect(roundedRealAmount.toString()).to.equal(expectedAmountAfter.toString());

            AMORxGuildBalanceAfter = (await AMORxGuild.balanceOf(dAMORxGuild.address)).toString();
            expect(AMORxGuildBalanceAfter).to.equal(AMORxGuildBalanceBefore.add(ONE_HUNDRED_ETHER));
        });

        it('withdraw dAMORxGuild tokens if not delegated any', async function () {
            time.increase(maxLockTime);
            await dAMORxGuild.connect(staker).withdraw();        
            const withdrawedTokens = (await AMORxGuild.balanceOf(staker.address)).toString();

            expect(withdrawedTokens).to.equal(staked);
        });
    
        it('withdraw dAMORxGuild tokens if delegated', async function () {
            time.increase(maxLockTime);
            await dAMORxGuild.connect(staker2).delegate(operator.address, ethers.BigNumber.from(12));
            await dAMORxGuild.connect(staker2).delegate(operator2.address, ethers.BigNumber.from(12));
            await dAMORxGuild.connect(staker2).withdraw();        
            const withdrawedTokens = (await AMORxGuild.balanceOf(staker2.address)).toString();
            
            expect(withdrawedTokens).to.equal(staked2);
        });

        it('it fails to withdraw dAMORxGuild tokens if nothing to withdraw', async function () {
            await expect(dAMORxGuild.connect(staker2).withdraw()).to.be.revertedWith(
                'InvalidAmount()'
            ); 
        });
    });
});
