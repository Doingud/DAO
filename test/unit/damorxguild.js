const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants.js');
const { time, BN } = require("@openzeppelin/test-helpers");
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { FIFTY_ETHER } = require('../helpers/constants.js');
const { ONE_HUNDRED_ETHER, TWO_HUNDRED_ETHER, MOCK_GUILD_NAMES, MOCK_GUILD_SYMBOLS } = require('../helpers/constants.js');
const init = require('../test-init.js');

const MIN_LOCK_TIME = 604800; // 1 week
const MAX_LOCK_TIME = 31536000; // 1 year = 60 * 60 * 24 * 365

let AMORxGuild;
let dAMORxGuild
let root;
let authorizer_adaptor;
let operator;
let staker;
let buyer1;
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
        authorizer_adaptor = setup.roles.authorizer_adaptor;
        operator = setup.roles.operator;
        staker = setup.roles.staker;
        buyer1 = setup.roles.buyer1;
    });

    before('>>> setup', async function() {
        await setupTests();

        timeTooSmall = (await time.duration.days(6)).toNumber();
        timeTooBig = (await time.duration.days(366)).toNumber();
        normalTime = (await time.duration.days(36)).toNumber();

        await AMORxGuild.connect(root).mint(dAMORxGuild.address, ONE_HUNDRED_ETHER);
    });

    context('» init testing', () => {

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
                'InvalidAmount(100000000000000000000, 0)'
            );
        });

        it('stakes AMORxGuild tokens and mints dAMORxGuild', async function () {
            await AMORxGuild.connect(root).mint(staker.address, ONE_HUNDRED_ETHER);
            await AMORxGuild.connect(staker).approve(dAMORxGuild.address, ONE_HUNDRED_ETHER);

            koef = normalTime/MAX_LOCK_TIME;
            const expectedAmount = (koef*koef) *ONE_HUNDRED_ETHER; // (koef)^2 *amount | NdAMOR = f(t)^2 *nAMOR
                        
            await dAMORxGuild.connect(staker).stake(ONE_HUNDRED_ETHER, normalTime);        
            realAmount = (await dAMORxGuild.balanceOf(staker.address)).toString();
            const roundedRealAmount = Math.round(realAmount * 100) / 100;
            
            expect(roundedRealAmount.toString()).to.equal(expectedAmount.toString());
        });

    });

    context('» increaseStake testing', () => {

        it('it fails to increase stake AMORxGuild tokens if not enough AMORxGuild', async function () {
            await expect(dAMORxGuild.connect(staker).increaseStake(ONE_HUNDRED_ETHER)).to.be.revertedWith(
                'InvalidAmount(100000000000000000000, 0)'
            );
        });

        it('increases stake AMORxGuild tokens and mints dAMORxGuild', async function () {
            await AMORxGuild.connect(root).mint(staker.address, ONE_HUNDRED_ETHER);
            await AMORxGuild.connect(staker).approve(dAMORxGuild.address, ONE_HUNDRED_ETHER);

            koef = normalTime/MAX_LOCK_TIME;
            const newAmount = (koef*koef) *ONE_HUNDRED_ETHER; // (koef)^2 *amount | NdAMOR = f(t)^2 *nAMOR
            const expectedAmount =  ethers.BigNumber.from(realAmount).add(ethers.BigNumber.from(newAmount.toString()));
            const roundedRealAmount = Math.round(expectedAmount * 100) / 100;

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
                'InvalidAmount(200000000000000000000, ' + realAmount.toString()
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

        it('it fails to delegate dAMORxGuild tokens if Unavailable amount of dAMORxGuild', async function () {
            await expect(dAMORxGuild.connect(staker).delegate(operator.address, ONE_HUNDRED_ETHER)).to.be.revertedWith(
                'InvalidAmount(100000000000000000000, ' + realAmount.toString()
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

            await dAMORxGuild.connect(staker).undelegate(operator.address, TWO_HUNDRED_ETHER);
            expect((await dAMORxGuild.amountDelegated(staker.address)).toString()).to.equal("0");
        });        
    });

    context('» withdraw testing', () => {

        it('it fails to withdraw dAMORxGuild tokens if amount <= 0', async function () {
            await expect(dAMORxGuild.connect(root).withdraw()).to.be.revertedWith(
                'InvalidAmount(0, 0)'
            ); 
        });  

        it('withdraw dAMORxGuild tokens', async function () {
            const currentAmount = (await dAMORxGuild.balanceOf(staker.address)).toString();
            await dAMORxGuild.connect(staker).withdraw();        
            const withdrawedTokens = (await AMORxGuild.balanceOf(staker.address)).toString();
            
            expect(withdrawedTokens).to.equal(currentAmount);
        });        
    });

    context('» setGuardian testing', () => {

        it('it fails to set guardian of dAMORxGuild in not enouth dAMORxGuild', async function () {
            await AMORxGuild.connect(root).mint(buyer1.address, ONE_HUNDRED_ETHER);
            await AMORxGuild.connect(buyer1).approve(dAMORxGuild.address, ONE_HUNDRED_ETHER);
    
            await dAMORxGuild.connect(buyer1).stake(1, normalTime);        
            const newRealAmount = (await dAMORxGuild.balanceOf(buyer1.address)).toString();
            const roundedRealAmount = Math.round(newRealAmount * 100) / 100;
            
            expect(roundedRealAmount.toString()).to.equal("0");
        });

        it('set guardian of dAMORxGuild', async function () {
            await AMORxGuild.connect(root).mint(buyer1.address, FIFTY_ETHER);
            await AMORxGuild.connect(buyer1).approve(dAMORxGuild.address, FIFTY_ETHER);

            // increaseStake() or stake() --> setGuardian
            await dAMORxGuild.connect(buyer1).increaseStake(FIFTY_ETHER);
            expect((await dAMORxGuild.guardians(0))).to.equal(staker.address);
            expect((await dAMORxGuild.guardians(2))).to.equal(buyer1.address);
        });
    });

    context('» addDelegateGuardians testing', () => {

        it('it fails to add delegate guardians of dAMORxGuild if not an Owner', async function () {
            const guardiansToAdd = [root.address, authorizer_adaptor.address]
            await expect(dAMORxGuild.connect(root).addDelegateGuardians(guardiansToAdd)).to.be.revertedWith(
                'Unauthorized()'
            ); 
        });  

        it('add delegate guardians of dAMORxGuild', async function () {
            const guardiansToAdd = [root.address, authorizer_adaptor.address]
            await dAMORxGuild.connect(operator).addDelegateGuardians(guardiansToAdd);
            expect((await dAMORxGuild.delegateGuardians(0))).to.equal(root.address);
            expect((await dAMORxGuild.delegateGuardians(1))).to.equal(authorizer_adaptor.address);  
        });
        it('add different delegate guardians of dAMORxGuild', async function () {
            const guardiansToAdd = [operator.address, staker.address]
            await dAMORxGuild.connect(operator).addDelegateGuardians(guardiansToAdd);
            expect((await dAMORxGuild.delegateGuardians(0))).to.equal(operator.address);
            expect((await dAMORxGuild.delegateGuardians(1))).to.equal(staker.address);  
        });     
    });
});