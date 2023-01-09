const { ethers } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");
const { TAX_RATE,
        TEST_TRANSFER, 
        BASIS_POINTS, 
        AMOR_TOKEN_NAME, 
        AMOR_TOKEN_SYMBOL, 
        INIT_MINT,
        ZERO_ADDRESS
      } = require('../helpers/constants.js');
const init = require('../test-init.js');

use(solidity);

//  The contract with the execution logic
let IMPLEMENTATION;
//  Mock upgrade contract for proxy tests
let MOCK_UPGRADE_IMPLEMENTATION;
//  The contract with exposed ABI for proxy specific functions
let PROXY_CONTRACT;
//  The PROXY_CONTRACT with the implemenation
let PROXY;
let AMOR_BEACON;

let root;
let multisig;
let user1;
let user2;
let user3;

describe("unit - AMOR Token", function () {

  const setupTests = deployments.createFixture(async () => {
    const signers = await ethers.getSigners();
    const setup = await init.initialize(signers);
    await init.getTokens(setup);

    IMPLEMENTATION = setup.tokens.AmorTokenImplementation;
    
    root = setup.roles.root;
    multisig = setup.roles.doingud_multisig;
    user1 = setup.roles.user1;
    user2 = setup.roles.user2;
    user3 = setup.roles.user3;
    
  });

  before('Setup', async function() {
    await setupTests();
  });

  context("function: init()", () => {
    it("initializes the proxy's storage", async function () {
        await expect(IMPLEMENTATION.connect(user3).init(
          AMOR_TOKEN_NAME,
          AMOR_TOKEN_SYMBOL,
          multisig.address,
          TAX_RATE,
          root.address
          )).
           to.emit(IMPLEMENTATION, "Initialized")
             .withArgs(multisig.address, TAX_RATE);
      });
    it("does not allow multiple init() calls", async function () {
      await expect(IMPLEMENTATION.init(
        AMOR_TOKEN_NAME,
        AMOR_TOKEN_SYMBOL,
        multisig.address,
        TAX_RATE,
        root.address
      )).
      to.be.reverted;
    });
  });

    context("function: totalSupply()", () => {
      it("returns the total token supply", async function () {
        expect(await IMPLEMENTATION.totalSupply()).
          to.equal(INIT_MINT);
      });
    });

    context("function: balanceOf()", () => {
      it("returns the user's correct balance", async function () {
        expect(await IMPLEMENTATION.balanceOf(root.address)).
          to.equal(INIT_MINT);
      });
      it("returns the correct balance for a user with no funds", async function () {
        expect(await IMPLEMENTATION.balanceOf(user2.address)).
          to.equal(0);
      });
    });

    context("function: name()", () => {
      it("returns the token's name", async function () {
        expect(await IMPLEMENTATION.name()).
          to.equal(AMOR_TOKEN_NAME);
      });
    });
    
    context("function: symbol", () => {
      it("returns the token's symbol", async function () {
        expect(await IMPLEMENTATION.symbol()).
          to.equal(AMOR_TOKEN_SYMBOL);
      });
    });

    context("function: approve()", () => {
      it("allows funds to be approved for spending", async function () {
        //  Approve AMOR to be transferred
        expect(await IMPLEMENTATION.approve(root.address, TEST_TRANSFER)).
          to.emit(IMPLEMENTATION, "Approval").
            withArgs(root.address, root.address, TEST_TRANSFER);
      });
      
      it("shows the correct allowance", async function () {
        expect(await IMPLEMENTATION.allowance(root.address, root.address)).to.equal(TEST_TRANSFER);
      });
    });

    context("function: transferFrom()", () => {
      it("transfers from one user to another", async function () {
        const taxDeducted = TEST_TRANSFER*(TAX_RATE/BASIS_POINTS);

        expect(await IMPLEMENTATION.transferFrom(root.address, user1.address, TEST_TRANSFER))
          .to.emit(IMPLEMENTATION, "Transfer")
            .withArgs(root.address, user1.address, (TEST_TRANSFER-taxDeducted).toString());

      });
      it("allocates the fees to the collector", async function () {
        const taxCollected = TEST_TRANSFER*(TAX_RATE/BASIS_POINTS);

        expect(await IMPLEMENTATION.balanceOf(multisig.address)).to.equal(taxCollected.toString());
      })
      it("correctly substracts the fees from the sender", async function () {
        const taxAmount = TEST_TRANSFER*(1-(TAX_RATE/BASIS_POINTS));

        expect(await IMPLEMENTATION.balanceOf(user1.address)).to.equal(taxAmount.toString());
      });
      it("transfers from one user to another when tax is zero", async function () {
        await IMPLEMENTATION.setTaxRate(0);
        await IMPLEMENTATION.approve(root.address, TEST_TRANSFER);

        expect(await IMPLEMENTATION.transferFrom(root.address, user2.address, TEST_TRANSFER))
          .to.emit(IMPLEMENTATION, "Transfer")
            .withArgs(root.address, user2.address, (TEST_TRANSFER).toString());


        expect(await IMPLEMENTATION.balanceOf(user2.address)).to.equal(TEST_TRANSFER.toString());

        await IMPLEMENTATION.setTaxRate(TAX_RATE);
      });
      it("it fails to transfers from one user to another if not enough tokens", async function () {
        await expect(IMPLEMENTATION.connect(user3).transfer(user1.address, TEST_TRANSFER)).to.be.revertedWith(
          'InvalidAmount()'
        );
      });
      it("it fails to transfers from one user to another if zero address", async function () {
        await expect(IMPLEMENTATION.transfer(ZERO_ADDRESS, TEST_TRANSFER)).to.be.revertedWith(
          'InvalidTransfer()'
        );
      });
    });

    context("function: viewRate()", () => {
      it("returns the current tax rate", async function () {
        expect(await IMPLEMENTATION.taxRate()).
          to.equal(TAX_RATE);
      });
    });

    context("function: viewCollector()", () => {
      it("returns the current fee collector", async function () {
        expect(await IMPLEMENTATION.taxController()).
          to.equal(multisig.address);
      });
    });

    context("function: setTaxRate()", () => {
      it("sets new tax rate", async function () {
        expect(await IMPLEMENTATION.taxRate()).
          to.equal(TAX_RATE);

        const NEW_TAX_RATE = 321;
        await IMPLEMENTATION.setTaxRate(NEW_TAX_RATE);
        
        expect(await IMPLEMENTATION.taxRate()).
          to.equal(NEW_TAX_RATE);
      });

      it("fails to set new tax rate if InvalidRate", async function () {
        const NEW_TAX_RATE = 501;
        await expect(IMPLEMENTATION.setTaxRate(NEW_TAX_RATE)).to.be.revertedWith(
          'InvalidRate()'
        );
      });
    });

    context("function: updateController()", () => {
      it("sets new controller address", async function () {
        expect(await IMPLEMENTATION.taxController()).
          to.equal(multisig.address);

        const NEW_ADDRESS = user1.address;
        await IMPLEMENTATION.updateController(NEW_ADDRESS);

        expect(await IMPLEMENTATION.taxController()).
          to.equal(NEW_ADDRESS);
      });

      it("fails to set new controller address if InvalidTaxCollector", async function () {
        const NEW_ADDRESS = IMPLEMENTATION.address;
        await expect(IMPLEMENTATION.updateController(NEW_ADDRESS)).to.be.revertedWith(
          'InvalidTaxCollector()'
        );
      });
    });

    context("function: pause() and unpause()", () => {
      it("it pauses the contract", async function () {
        expect(await IMPLEMENTATION.pause()).
          to.emit(IMPLEMENTATION, "Paused")
          .withArgs(root.address);
      });

      it("it unpauses the contract", async function () {
        expect(await IMPLEMENTATION.unpause()).
          to.emit(IMPLEMENTATION, "Unpaused")
          .withArgs(root.address);
      });
    });
});
