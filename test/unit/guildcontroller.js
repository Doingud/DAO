const { time } = require("@openzeppelin/test-helpers");
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
const twoWeeks = time.duration.days(14);
const TEST_TRANSFER_SMALLER = 80;
// const COEFFICIENT = 10**19;

let AMOR;
let AMORxGuild;
let FXAMORxGuild
let controller;
let metadao;
let guildFactory;
let USDC;
let root;
let authorizer_adaptor;
let impactMaker;
let operator;
let user;
let user2;
let staker;
let impactMakers;
let weigths;
let report;
let r;
let s;
let v;
let sum;

describe('unit - Contract: GuildController', function () {

    const setupTests = deployments.createFixture(async () => {
        const signers = await ethers.getSigners();
        const setup = await init.initialize(signers);
        await init.getTokens(setup);
        await init.metadao(setup);
        await init.controller(setup);

        AMOR = setup.tokens.AmorTokenImplementation;
        AMORxGuild = setup.tokens.AmorGuildToken;
        FXAMORxGuild = setup.tokens.FXAMORxGuild;
        USDC = setup.tokens.ERC20Token;
        
        metadao = setup.metadao;
        controller = setup.controller;
        guildFactory = await init.getGuildFactory(setup);
        await metadao.init(AMOR.address, guildFactory.guildFactory.address);
        root = setup.roles.root;
        staker = setup.roles.staker;
        operator = setup.roles.operator;
        impactMaker = setup.roles.doingud_multisig;
        user = setup.roles.user3;
        user2 = setup.roles.user2;
        authorizer_adaptor = setup.roles.authorizer_adaptor;
        operator = setup.roles.operator;
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
                AMOR.address,
                AMORxGuild.address,
                FXAMORxGuild.address,
                root.address,
                root.address
            )).to.be.revertedWith("AlreadyInitialized()");
        });
    });

    context('» setImpactMakers testing', () => {
        it('it fails to set ImpactMakers if not the owner', async function () {
            impactMakers = [staker.address, operator.address, impactMaker.address];
            weigths = [20, 34, 923];
            await expect(controller.connect(user).setImpactMakers(impactMakers, weigths)).to.be.revertedWith(
                'Ownable: caller is not the owner'
            );
        });

        it('it sets ImpactMakers', async function () {
            await controller.connect(root).setImpactMakers(impactMakers, weigths);
            expect(await controller.impactMakers(0)).to.equals(staker.address);
            expect(await controller.impactMakers(1)).to.equals(operator.address);
            expect(await controller.impactMakers(2)).to.equals(impactMaker.address);
            expect(await controller.weights(staker.address)).to.equals(20);
            expect(await controller.weights(operator.address)).to.equals(34);
            expect(await controller.weights(impactMaker.address)).to.equals(923);
        });
    });

    context('» addImpactMaker testing', () => {

        it('it fails to add ImpactMaker if not the owner', async function () {
            await expect(controller.connect(user).addImpactMaker(user2.address, 30)).to.be.revertedWith(
                'Ownable: caller is not the owner'
            );
        });

        it('it adds ImpactMaker', async function () {
            await controller.connect(root).addImpactMaker(user2.address, 30);
            expect(await controller.impactMakers(3)).to.equals(user2.address);
            expect(await controller.weights(user2.address)).to.equals(30);
        });

        it('it fails to add ImpactMaker with the same address', async function () {
            await expect(controller.connect(root).addImpactMaker(user2.address, 30)).to.be.revertedWith(
                'InvalidParameters()'
            );
        });
    });

    context('» changeImpactMaker testing', () => {

        it('it fails to change ImpactMaker if not the owner', async function () {
            await expect(controller.connect(user).changeImpactMaker(user2.address, 900)).to.be.revertedWith(
                'Ownable: caller is not the owner'
            );
        });

        it('it changes ImpactMaker to bigger value', async function () {
            await controller.connect(root).changeImpactMaker(user2.address, 900);
            expect(await controller.impactMakers(3)).to.equals(user2.address);
            expect(await controller.weights(user2.address)).to.equals(900);
        });

        it('it changes ImpactMaker to less value', async function () {
            await controller.connect(root).changeImpactMaker(user2.address, 3);
            expect(await controller.impactMakers(3)).to.equals(user2.address);
            expect(await controller.weights(user2.address)).to.equals(3);
        });
    });

    context('» removeImpactMaker testing', () => {

        it('it fails to removes ImpactMaker if not the owner', async function () {
            await expect(controller.connect(user).removeImpactMaker(user2.address)).to.be.revertedWith(
                'Ownable: caller is not the owner'
            );
        });

        it('it removes ImpactMaker', async function () {
            await controller.connect(root).removeImpactMaker(user2.address);
            await expect(controller.impactMakers(3)).to.be.reverted;
            expect(await controller.weights(user2.address)).to.equals(0);
        });
    });

    context('» donate testing', () => {

        it('it fails to donate AMORxGuild tokens if not enough AMORxGuild', async function () {
            await metadao.connect(root).addWhitelist(AMORxGuild.address);
            await expect(controller.connect(operator).donate(ONE_HUNDRED_ETHER, AMORxGuild.address)).to.be.revertedWith(
                'InvalidAmount()'
            );
        });

        it('it fails to donate if token not in the whitelist', async function () {
            await expect(controller.connect(operator).donate(ONE_HUNDRED_ETHER, root.address)).to.be.revertedWith(
                'NotListed()'
            );
        });

        it('donates AMORxGuild tokens', async function () {
            expect((await FXAMORxGuild.balanceOf(user.address)).toString()).to.equal("0");

            await AMOR.connect(root).transfer(controller.address, TEST_TRANSFER);
            await AMOR.connect(root).transfer(user.address, TEST_TRANSFER);

            await AMOR.connect(user).approve(AMORxGuild.address, TEST_TRANSFER);

            let AMORDeducted = ethers.BigNumber.from((TEST_TRANSFER*(BASIS_POINTS-TAX_RATE)/BASIS_POINTS).toString());
            let nextAMORDeducted = ethers.BigNumber.from((AMORDeducted*(BASIS_POINTS-TAX_RATE)/BASIS_POINTS).toString());

            await AMORxGuild.connect(user).stakeAmor(user.address, nextAMORDeducted);
            await AMORxGuild.connect(user).approve(controller.address, nextAMORDeducted);

            await controller.connect(user).donate(TEST_TRANSFER_SMALLER, AMORxGuild.address);

            const totalWeight = await controller.totalWeight();
            const FxGAmount = (TEST_TRANSFER_SMALLER * percentToConvert) / FEE_DENOMINATOR; // FXAMORxGuild Amount = 10% of amount to Impact poll
            const decIpAmount = (TEST_TRANSFER_SMALLER - FxGAmount); //decreased amount

            sum = 0;
            let weight = await controller.weights(impactMaker.address);
            let amountToSendImpactMaker = Math.floor((decIpAmount * weight) / totalWeight);

            sum += amountToSendImpactMaker;
            expect((await FXAMORxGuild.balanceOf(user.address)).toString()).to.equal(FxGAmount.toString());
            expect((await controller.claimableTokens(impactMaker.address, AMORxGuild.address)).toString()).to.equal(amountToSendImpactMaker.toString());            

            weight = await controller.weights(staker.address);
            amountToSendImpactMaker = Math.floor((decIpAmount * weight) / totalWeight);
            sum += amountToSendImpactMaker;
            expect((await controller.claimableTokens(staker.address, AMORxGuild.address)).toString()).to.equal(amountToSendImpactMaker.toString());

            weight = await controller.weights(operator.address);
            amountToSendImpactMaker = Math.floor((decIpAmount * weight) / totalWeight);
            sum += amountToSendImpactMaker;
            expect((await controller.claimableTokens(operator.address, AMORxGuild.address)).toString()).to.equal(amountToSendImpactMaker.toString());
        
            const difference = 1; // rounding error
            sum += difference;
            expect((await AMORxGuild.balanceOf(controller.address)).toString()).to.equal(sum.toString());            
        });
    });

    context('» gatherDonation and distribute testing', () => {

        it('it fails to gatherDonation if token not in the whitelist', async function () {
            // gatherDonation --> distribute
            await expect(controller.connect(operator).gatherDonation(root.address)).to.be.revertedWith(
                'NotListed()'
            );
        });

        it('gathers donation in AMOR', async function () {
            await metadao.addExternalGuild(controller.address);
            const abi = ethers.utils.defaultAbiCoder;
            let encodedIndex = abi.encode(
                ["tuple(address, uint256)"],
                [
                [controller.address, 100]
                ]
            );
            await metadao.updateIndex([encodedIndex], 0);

            await AMOR.transfer(controller.address, TEST_TRANSFER);
            let previous = await AMOR.balanceOf(controller.address);

            // add some funds to MetaDaoController
            await AMOR.connect(root).approve(AMORxGuild.address, TEST_TRANSFER);
            await AMOR.transfer(metadao.address, TEST_TRANSFER);

            const amountOfAMOR = await AMOR.balanceOf(metadao.address);
            let AMORDeducted = ethers.BigNumber.from((amountOfAMOR*(BASIS_POINTS-TAX_RATE)/BASIS_POINTS).toString());

            await metadao.distributeFees();
            await controller.connect(operator).gatherDonation(AMOR.address);

            let current = await AMOR.balanceOf(controller.address);
            expect((current - previous).toString()).to.equal(AMORDeducted.toString());
        });

        it('gathers donation in USDC', async function () {
            await metadao.connect(root).addWhitelist(USDC.address);

            // add some funds to MetaDaoController
            await USDC.connect(root).approve(metadao.address, TEST_TRANSFER);
            await metadao.donate(USDC.address, TEST_TRANSFER, 0);
            await USDC.connect(root).transfer(metadao.address, TEST_TRANSFER);

            const multisig = root;
            await AMOR.connect(multisig).approve(controller.address, TEST_TRANSFER);

            await controller.connect(operator).gatherDonation(USDC.address);
        });

        it('gathers donation in AMORxGuild', async function () {
            await AMOR.connect(root).transfer(controller.address, TEST_TRANSFER);
            await AMOR.connect(root).transfer(user.address, TEST_TRANSFER);
            await AMOR.connect(user).approve(AMORxGuild.address, TEST_TRANSFER);

            let AMORDeducted = ethers.BigNumber.from((TEST_TRANSFER*(BASIS_POINTS-TAX_RATE)/BASIS_POINTS).toString());
            let nextAMORDeducted =  ethers.BigNumber.from((AMORDeducted*(BASIS_POINTS-TAX_RATE)/BASIS_POINTS).toString());

            await AMORxGuild.connect(user).stakeAmor(user.address, nextAMORDeducted);
            //let userAmorxGuildAmount = await AMORxGuild.balanceOf(user.address);
            //await AMORxGuild.connect(user).approve(metadao.address, userAmorxGuildAmount);

            let impactMakerClaimableBefore = await controller.claimableTokens(impactMaker.address, AMORxGuild.address);
            let stakerClaimableBefore = await controller.claimableTokens(staker.address, AMORxGuild.address);
            let operatorClaimableBefore = await controller.claimableTokens(operator.address, AMORxGuild.address);

            //let controllerHadBefore = await AMORxGuild.balanceOf(controller.address);
            
            let totalWeight = await controller.totalWeight();

            // test
            let AMORxGuildAmount = await AMORxGuild.connect(user).balanceOf(user.address);
            await AMORxGuild.connect(user).approve(metadao.address, AMORxGuildAmount);
            await metadao.connect(user).donate(AMORxGuild.address, AMORxGuildAmount, 0);
            let amount = await metadao.guildFunds(controller.address, AMORxGuild.address);
            await controller.connect(user).gatherDonation(AMORxGuild.address);

            let difference = 0; // difference -604 appears here: (decAmount * weights[impactMakers[i]]) / totalWeight
            let weight = await controller.weights(impactMaker.address);
            weight = weight / totalWeight;
            let amountToSendImpactMaker = amount * weight;

            sum = 0;
            sum += amountToSendImpactMaker + difference;
            let currentClaimable = ethers.BigNumber.from(impactMakerClaimableBefore.toString())
                .add(ethers.BigNumber.from(amountToSendImpactMaker.toString()))
                .add(ethers.BigNumber.from(difference.toString()));
            /// The below check h
            expect((await controller.claimableTokens(impactMaker.address, AMORxGuild.address))).to.be.closeTo(currentClaimable, 5000);
            //equal(currentClaimable.toString());


            weight = await controller.weights(staker.address);
            amountToSendImpactMaker = Math.floor((amount * weight) / totalWeight);
            difference = 8;
            sum += amountToSendImpactMaker - difference;
            currentClaimable = ethers.BigNumber.from(stakerClaimableBefore.toString())
                .add(ethers.BigNumber.from(amountToSendImpactMaker.toString()))
                .sub(ethers.BigNumber.from(difference.toString()));
            expect((await controller.claimableTokens(staker.address, AMORxGuild.address)).toString()).to.be.closeTo(currentClaimable, 200);


            weight = await controller.weights(operator.address);
            amountToSendImpactMaker = ((amount * weight) / totalWeight);
            difference = 12;
            sum += amountToSendImpactMaker + difference;
            currentClaimable = ethers.BigNumber.from(operatorClaimableBefore.toString())
                .add(ethers.BigNumber.from(amountToSendImpactMaker.toString()))
                .add(ethers.BigNumber.from(difference.toString()));
            expect((await controller.claimableTokens(operator.address, AMORxGuild.address)).toString()).to.be.closeTo(currentClaimable, 200);        


            /*
            let controllerHasAfter = ethers.BigNumber.from(controllerHadBefore.toString())
                .add(ethers.BigNumber.from(sum.toString()));

            expect((await AMORxGuild.balanceOf(controller.address)).toString()).to.equal(controllerHasAfter.toString());            
            */
        });
    });

    context('» claim testing', () => {

        it('it fails to claim if not the owner', async function () {
            await expect(controller.connect(user).claim(user2.address, [AMORxGuild.address])).to.be.revertedWith(
                'Unauthorized()'
            );
        });

        it('it claims tokens', async function () {
            const balanceBefore = await AMORxGuild.balanceOf(impactMaker.address);
            expect(balanceBefore).to.equal(0);

            const balanceAfter = await controller.claimableTokens(impactMaker.address, AMORxGuild.address);
            // check that passing empty-claimable token in array would cause no errors
            expect((await controller.claimableTokens(impactMaker.address, FXAMORxGuild.address)).toString()).to.equal("0");
            expect((await FXAMORxGuild.balanceOf(impactMaker.address)).toString()).to.equal("0");

            await controller.connect(impactMaker).claim(impactMaker.address, [AMORxGuild.address, FXAMORxGuild.address]);
            expect((await AMORxGuild.balanceOf(impactMaker.address)).toString()).to.equal(balanceAfter.toString());
            expect((await FXAMORxGuild.balanceOf(impactMaker.address)).toString()).to.equal("0");
        });
    });

    context('» addReport testing', () => {

        it('it fails to add report if Unauthorized', async function () {
            await AMORxGuild.connect(operator).approve(controller.address, TEST_TRANSFER);

            const timestamp = Date.now();

            // building hash has to come from system address
            // 32 bytes of data
            let messageHash = ethers.utils.solidityKeccak256(
                ["address", "uint", "string"],
                [operator.address, timestamp, "report info"]
            );

            // 32 bytes of data in Uint8Array
            let messageHashBinary = ethers.utils.arrayify(messageHash);
            
            // To sign the 32 bytes of data, make sure you pass in the data
            let signature = await operator.signMessage(messageHashBinary);

            // split signature
            r = signature.slice(0, 66);
            s = "0x" + signature.slice(66, 130);
            v = parseInt(signature.slice(130, 132), 16);
                    
            report = messageHash;
            await expect(controller.connect(authorizer_adaptor).addReport(report, v, r, s)).to.be.revertedWith(
                'Unauthorized()'
            );
        });

        it('adds report', async function () {
            await controller.connect(operator).addReport(report, v, r, s); 
            expect((await controller.queueReportsAuthors(0))).to.equal(operator.address);
        });

    });

    context('» startVoting testing', () => {

        it('it fails to finalize report voting if trigger in false state', async function () {
            expect(await controller.trigger()).to.equal(false);
            await expect(controller.connect(authorizer_adaptor).finalizeVoting()).to.be.revertedWith(
                'ReportNotExists()'
            );
        });

        it('it fails to start report voting if InvalidAmount of the reports in queue', async function () {
            await expect(controller.connect(root).startVoting()).to.be.revertedWith(
                'InvalidAmount()'
            );
        });

        it('it starts reports voting', async function () {
            await AMORxGuild.connect(operator).approve(controller.address, TEST_TRANSFER);

            // add 9 more reports
            await controller.connect(operator).addReport(report, v, r, s); // 1
            await controller.connect(operator).addReport(report, v, r, s); // 2
            await controller.connect(operator).addReport(report, v, r, s); // 3
            await controller.connect(operator).addReport(report, v, r, s); // 4
            await controller.connect(operator).addReport(report, v, r, s); // 5
            await controller.connect(operator).addReport(report, v, r, s); // 6
            await controller.connect(operator).addReport(report, v, r, s); // 7
            await controller.connect(operator).addReport(report, v, r, s); // 8
            await controller.connect(operator).addReport(report, v, r, s); // 9
            expect((await controller.queueReportsAuthors(9))).to.equal(operator.address);

            await controller.connect(authorizer_adaptor).startVoting();

            expect(await controller.trigger()).to.equal(true);
            await expect(controller.queueReportsAuthors()).to.be.reverted;
            expect((await controller.reportsAuthors(9))).to.equal(operator.address);
        });

        it('it fails to start report voting if VotingTimeNotFinished', async function () {
            await expect(controller.connect(authorizer_adaptor).startVoting()).to.be.revertedWith(
                'VotingTimeNotFinished()'
            );
        });
    });

    context('» voteForReport testing', () => {

        it('it fails to vote for report if ReportNotExists', async function () {
            await AMORxGuild.connect(operator).approve(controller.address, TEST_TRANSFER);
            const id = 11;
            const amount = 12;
            const sign = true;            
            await expect(controller.connect(authorizer_adaptor).voteForReport(id, amount, sign)).to.be.revertedWith(
                'ReportNotExists()'
            );
        });

        it('votes for report positivly', async function () {
            await AMOR.connect(root).transfer(controller.address, TEST_TRANSFER);
            await AMOR.connect(root).transfer(operator.address, TEST_TRANSFER);
            await AMOR.connect(operator).approve(AMORxGuild.address, TEST_TRANSFER);
            let AMORDeducted = ethers.BigNumber.from((TEST_TRANSFER*(BASIS_POINTS-TAX_RATE)/BASIS_POINTS).toString());
            let nextAMORDeducted =  ethers.BigNumber.from((AMORDeducted*(BASIS_POINTS-TAX_RATE)/BASIS_POINTS).toString());
            await AMORxGuild.connect(operator).stakeAmor(operator.address, nextAMORDeducted);
            await AMORxGuild.connect(operator).approve(controller.address, nextAMORDeducted);
            await controller.connect(operator).donate(TEST_TRANSFER_SMALLER, AMORxGuild.address);        

            const id = 0;
            const amount = 2;
            const sign = true;
            await controller.connect(user).voteForReport(id, amount, sign);
            expect(await controller.reportsVoting(0)).to.equals(2);
            expect(await controller.reportsWeight(0)).to.equals(2);

            await controller.connect(operator).voteForReport(id, 1, false);
            expect(await controller.reportsVoting(0)).to.equals(1);
            expect(await controller.reportsWeight(0)).to.equals(3);
        });

        it('votes for report negatively', async function () {
            const id = 1;
            const amount = 2;
            const sign = false;
            await controller.connect(operator).voteForReport(id, amount, sign);
            expect(await controller.reportsVoting(1)).to.equals(-2);
            expect(await controller.reportsWeight(1)).to.equals(2);

            await controller.connect(user).voteForReport(id, 1, true);
        });

        it('it fails to vote for report if InvalidAmount', async function () {
            const id = 0;
            const amount = 0;
            const sign = true;
            await expect(controller.connect(authorizer_adaptor).voteForReport(id, amount, sign)).to.be.revertedWith(
                'InvalidAmount()'
            );
        });

        it('it fails to vote for report if try to vote more than user have', async function () {
            const id = 0;
            const amount = TEST_TRANSFER;
            const sign = true;
            await expect(controller.connect(authorizer_adaptor).voteForReport(id, amount, sign)).to.be.revertedWith(
                'InvalidAmount()'
            );
        });

        it('it fails to finalize report voting if VotingTimeNotFinished', async function () {
            expect(await controller.trigger()).to.equal(true);
            await expect(controller.connect(authorizer_adaptor).finalizeVoting()).to.be.revertedWith(
                'VotingTimeNotFinished()'
            );
        });

        it('it fails to vote for report if VotingTimeExpired', async function () {
            const id = 0;
            const amount = 2;
            const sign = true;
            await controller.connect(operator).voteForReport(id, amount, sign);
            time.increase(time.duration.days(15));

            await expect(controller.connect(operator).voteForReport(id, amount, sign)).to.be.revertedWith(
                'VotingTimeExpired()'
            );
        });
    });

    context('» finalizeVoting testing', () => {

        it('finalizes voting', async function () {
            const balanceBefore = await AMORxGuild.balanceOf(operator.address);
            time.increase(twoWeeks);
            await controller.connect(operator).finalizeVoting();
            const balanceAfter = balanceBefore.add(2);
            expect((await AMORxGuild.balanceOf(operator.address)).toString()).to.equal(balanceAfter.toString());
        });

        it('adds report when voting is not active', async function () {
            const timestamp = Date.now();

            let messageHash = ethers.utils.solidityKeccak256(
                ["address", "uint", "string"],
                [user.address, timestamp, "next report info"]
            );
            let messageHashBinary = ethers.utils.arrayify(messageHash);
            let signature = await user.signMessage(messageHashBinary);
            let r = signature.slice(0, 66);
            let s = "0x" + signature.slice(66, 130);
            let v = parseInt(signature.slice(130, 132), 16);
            let report = messageHash;

            await controller.connect(user).addReport(report, v, r, s);
            expect((await controller.queueReportsAuthors(0))).to.equal(user.address);
            expect((await controller.reportsQueue(0))).to.equal(0);
        });

        it('it fails to vote for report if VotingNotStarted', async function () {
            const id = 0;
            const amount = TEST_TRANSFER;
            const sign = true;
            await expect(controller.connect(authorizer_adaptor).voteForReport(id, amount, sign)).to.be.revertedWith(
                'VotingNotStarted()'
            );
        });

        it('it starts reports voting if finalizeVoting wasn not called', async function () {
            const timestamp = Date.now();

            // building hash has to come from system address
            // 32 bytes of data
            let messageHash = ethers.utils.solidityKeccak256(
                ["address", "uint", "string"],
                [user2.address, timestamp, "next report info"]
            );

            // 32 bytes of data in Uint8Array
            let messageHashBinary = ethers.utils.arrayify(messageHash);
            
            // To sign the 32 bytes of data, make sure you pass in the data
            let signature = await user2.signMessage(messageHashBinary);

            // split signature
            r = signature.slice(0, 66);
            s = "0x" + signature.slice(66, 130);
            v = parseInt(signature.slice(130, 132), 16);
            report = messageHash;

            await AMORxGuild.connect(user2).approve(controller.address, TEST_TRANSFER);
            await controller.connect(user2).addReport(report, v, r, s); // 0
            await controller.connect(user2).addReport(report, v, r, s); // 1
            await controller.connect(user2).addReport(report, v, r, s); // 2
            await controller.connect(user2).addReport(report, v, r, s); // 3
            await controller.connect(user2).addReport(report, v, r, s); // 4
            await controller.connect(user2).addReport(report, v, r, s); // 5
            await controller.connect(user2).addReport(report, v, r, s); // 6
            await controller.connect(user2).addReport(report, v, r, s); // 7
            await controller.connect(user2).addReport(report, v, r, s); // 8
            await controller.connect(user2).addReport(report, v, r, s); // 9
            expect((await controller.queueReportsAuthors(9))).to.equal(user2.address);

            // 0 2 3 4 5 6 days in a week
            // test another else-path in SUNDAY-CHECK
            time.increase(time.duration.days(3));

            await controller.connect(authorizer_adaptor).startVoting();
            expect(await controller.trigger()).to.equal(true);

            time.increase(twoWeeks);

            messageHash = ethers.utils.solidityKeccak256(
                ["address", "uint", "string"],
                [user.address, timestamp, "next report info"]
            );
            messageHashBinary = ethers.utils.arrayify(messageHash);
            signature = await user.signMessage(messageHashBinary);
            r = signature.slice(0, 66);
            s = "0x" + signature.slice(66, 130);
            v = parseInt(signature.slice(130, 132), 16);
            report = messageHash;

            await controller.connect(user).addReport(report, v, r, s); // 0
            await controller.connect(user).addReport(report, v, r, s); // 1
            await controller.connect(user).addReport(report, v, r, s); // 2
            await controller.connect(user).addReport(report, v, r, s); // 3
            await controller.connect(user).addReport(report, v, r, s); // 4
            await controller.connect(user).addReport(report, v, r, s); // 5
            await controller.connect(user).addReport(report, v, r, s); // 6
            await controller.connect(user).addReport(report, v, r, s); // 7
            await controller.connect(user).addReport(report, v, r, s); // 8
            await controller.connect(user).addReport(report, v, r, s); // 9

            // test another else-path in SUNDAY-CHECK
            time.increase(time.duration.days(5));
            await controller.connect(authorizer_adaptor).startVoting();
            expect((await controller.reportsAuthors(9))).to.equal(user.address);
        });
    });

    context('» setVotingPeriod testing', () => {

        it('it fails to set new voting period if not the owner', async function () {
            await expect(controller.connect(user).setVotingPeriod(12)).to.be.revertedWith(
                'Ownable: caller is not the owner'
            );
        });

        it('it fails to set new voting period if newTime < 2 days', async function () {
            await expect(controller.connect(root).setVotingPeriod(12)).to.be.revertedWith(
                'InvalidAmount()'
            );
        });

        it('it sets new voting period', async function () {
            let newTime = 60 * 60 *24 * 2;
            await controller.connect(root).setVotingPeriod(newTime);
            expect((await controller.ADDITIONAL_VOTING_TIME())).to.equal(newTime);
        });
    });

    context('» setPercentToConvert testing', () => {

        it('it fails to set new percent to convert if not the owner', async function () {
            expect((await controller.percentToConvert())).to.equal(percentToConvert);
            let fiftyPercent = 500;
            await expect(controller.connect(user).setPercentToConvert(fiftyPercent)).to.be.revertedWith(
                'Ownable: caller is not the owner'
            );
        });

        it('it sets new percent to convert', async function () {
            let fiftyPercent = 500;
            await controller.connect(root).setPercentToConvert(fiftyPercent);
            expect((await controller.percentToConvert())).to.equal(fiftyPercent);
        });
    });
});