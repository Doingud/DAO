const { time } = require("@openzeppelin/test-helpers");
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { ONE_HUNDRED_ETHER,
        TWO_HUNDRED_ETHER,
        TEST_TRANSFER
      } = require('../helpers/constants.js');
const init = require('../test-init.js');

const FEE_DENOMINATOR = 1000;
const impactFees = 800; //80% // FEE_DENOMINATOR/100*80
const projectFees = 200; //20%
const maxLockTime = time.duration.days(7);
const TEST_TRANSFER_BIGGER = 100000;
const TEST_TRANSFER_SMALLER = 80;

let AMORxGuild;
let FXAMORxGuild
let controller;
let impactPoll;
let projectPoll;
let root;
let authorizer_adaptor;
let operator;
let report;
let signature;
let r;
let s;
let v;

//  The contract with the execution logic
let IMPLEMENTATION;
//  Mock upgrade contract for proxy tests
let MOCK_UPGRADE_IMPLEMENTATION;
//  The contract with exposed ABI for proxy specific functions
let PROXY_CONTRACT;
//  The PROXY_CONTRACT with the implemenation
let PROXY;

describe('unit - Contract: GuildController', function () {

    const setupTests = deployments.createFixture(async () => {
        const signers = await ethers.getSigners();
        const setup = await init.initialize(signers);
        await init.getTokens(setup);

        AMORxGuild = setup.tokens.AmorTokenImplementation;//ERC20Token;
        FXAMORxGuild = setup.tokens.FXAMORxGuild;
        impactPoll = setup.roles.user1;
        projectPoll = setup.roles.user2;
        controller = await init.controller(setup, impactPoll, projectPoll);
        root = setup.roles.root;
        authorizer_adaptor = setup.roles.authorizer_adaptor;
        operator = setup.roles.operator;

        // IMPLEMENTATION = setup.tokens.AmorTokenImplementation;
        // MOCK_UPGRADE_IMPLEMENTATION = setup.tokens.AmorTokenMockUpgrade;
        // PROXY_CONTRACT = setup.tokens.AmorTokenProxy;

        // PROXY = IMPLEMENTATION.attach(PROXY_CONTRACT.address);
        // await PROXY_CONTRACT.initProxy(IMPLEMENTATION.address,[]);
        // await PROXY.init(
        //     AMOR_TOKEN_NAME,
        //     AMOR_TOKEN_SYMBOL,
        //     authorizer_adaptor.address,
        //     TAX_RATE,
        //     root.address
        // );
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
                'InvalidAmount()'
            );
        });

        it('donates AMORxGuild tokens', async function () {
            await AMORxGuild.connect(root).transfer(controller.address, TEST_TRANSFER);

            await AMORxGuild.connect(root).transfer(operator.address, TEST_TRANSFER);
            await AMORxGuild.connect(operator).approve(controller.address, TEST_TRANSFER_SMALLER);

            await controller.connect(operator).donate(TEST_TRANSFER_SMALLER);        
            
            const ipAmount = (TEST_TRANSFER_SMALLER * impactFees) / FEE_DENOMINATOR; // amount to Impact poll
            const ppAmount = (TEST_TRANSFER_SMALLER * projectFees) / FEE_DENOMINATOR; // amount to project poll
            const FxGAmount = (ipAmount * 100) / FEE_DENOMINATOR; // FXAMORxGuild Amount = 10% of amount to Impact poll
            const decIpAmount = (ipAmount - FxGAmount); //decreased ipAmount

            expect((await AMORxGuild.balanceOf(impactPoll.address)).toString()).to.equal(decIpAmount.toString());
            expect((await AMORxGuild.balanceOf(projectPoll.address)).toString()).to.equal(ppAmount.toString());
            expect((await FXAMORxGuild.balanceOf(operator.address)).toString()).to.equal(FxGAmount.toString());
        });

    });

    context('» addReport testing', () => {

        it('it fails to add report if Unauthorized', async function () {
            await AMORxGuild.connect(root).transfer(operator.address, TEST_TRANSFER_BIGGER);
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
            expect((await controller.reportsAuthors(0))).to.equal(operator.address);
            expect((await controller.reportsContent(0))).to.equal(report);
        });

    });

    context('» voteForReport testing', () => {

        it('it fails to vote for report if ReportNotExists', async function () {
            await AMORxGuild.connect(root).transfer(controller.address, TEST_TRANSFER);

            await AMORxGuild.connect(root).transfer(operator.address, TEST_TRANSFER_BIGGER);
            await AMORxGuild.connect(operator).approve(controller.address, TEST_TRANSFER);
            await controller.connect(operator).addReport(report, v, r, s); 

            const id = 11;
            const amount = 12;
            const sign = true;            
            await expect(controller.connect(authorizer_adaptor).voteForReport(id, amount, sign)).to.be.revertedWith(
                'ReportNotExists()'
            );
        });

        it('votes for report', async function () {
            await AMORxGuild.connect(operator).approve(FXAMORxGuild.address, TEST_TRANSFER);
            await controller.connect(operator).donate(TEST_TRANSFER); // the must before voting   

            const id = 0;
            const amount = 2;
            const sign = true;
            await controller.connect(operator).voteForReport(id, amount, sign); 
        });

        it('it fails to vote for report if try to vote more than user have', async function () {
            const id = 0;
            const amount = TEST_TRANSFER;
            const sign = true;
            await expect(controller.connect(authorizer_adaptor).voteForReport(id, amount, sign)).to.be.revertedWith(
                'InvalidAmount()'
            );
        });

        it('it fails to vote for report if VotingTimeExpired', async function () {
            time.increase(maxLockTime);

            const id = 0;
            const amount = 12;
            const sign = true;
            await expect(controller.connect(operator).voteForReport(id, amount, sign)).to.be.revertedWith(
                'VotingTimeExpired()'
            );
        });

    });
});

function splitSignature(sig) {
    const hash = sig.slice(0,66);
    const signature = sig.slice(66, sig.length);
    const r = signature.slice(0, 66);
    const s = "0x" + signature.slice(66, 130);
    const v = parseInt(signature.slice(130, 132), 16);
    signatureParts = { r, s, v };
    console.log([hash,signatureParts])
    return ([hash,signatureParts]);
}

