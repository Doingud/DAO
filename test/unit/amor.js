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
    MOCK_UPGRADE_IMPLEMENTATION = setup.tokens.AmorTokenMockUpgrade;
    PROXY_CONTRACT = setup.tokens.AmorTokenProxy;
    
    root = setup.roles.root;
    multisig = setup.roles.doingud_multisig;
    user1 = setup.roles.user1;
    user2 = setup.roles.user2;
    user3 = setup.roles.user3;
    
  });

  before('Setup', async function() {
    await setupTests();
  });

  
  context("proxy test", () => {
      //  Deploy the proxy contract and point it to the correct implementation
      it("attaches the ABI to proxy", async function () {
        //  Attach the AmorToken contract's ABI to the proxy, so that the correct function selector is called
        PROXY = IMPLEMENTATION.attach(PROXY_CONTRACT.address);
      });
      //  Make sure the proxy contract is linked to the implementation address
  });

  context("function: initProxy()", () => {
    it("initializes the proxy's logic", async function () {
      await PROXY_CONTRACT.initProxy(AMOR_BEACON.address);
    });
  });

  context("function: init()", () => {
    it("initializes the proxy's storage", async function () {
        expect(await PROXY.init(
          AMOR_TOKEN_NAME,
          AMOR_TOKEN_SYMBOL,
          multisig.address,
          TAX_RATE,
          root.address
          )).
           to.emit(PROXY, "Initialized")
             .withArgs(true, multisig.address, TAX_RATE);
      });
    it("does not allow multiple init() calls", async function () {
      await expect(PROXY.init(
        AMOR_TOKEN_NAME,
        AMOR_TOKEN_SYMBOL,
        multisig.address,
        TAX_RATE,
        root.address
      )).
      to.be.reverted;
    });
  });

    context("function: viewImplementation()", () => {
        it("retrieves the correct contract address", async function () {
          expect(await PROXY_CONTRACT.implementation()).
            to.equal(IMPLEMENTATION.address);
        });
    });

    context("function: totalSupply()", () => {
      it("returns the total token supply", async function () {
        expect(await PROXY.totalSupply()).
          to.equal(INIT_MINT);
      });
    });

    context("function: balanceOf()", () => {
      it("returns the user's correct balance", async function () {
        expect(await PROXY.balanceOf(root.address)).
          to.equal(INIT_MINT);
      });
      it("returns the correct balance for a user with no funds", async function () {
        expect(await PROXY.balanceOf(user2.address)).
          to.equal(0);
      });
    });

    context("function: name()", () => {
      it("returns the token's name", async function () {
        expect(await PROXY.name()).
          to.equal(AMOR_TOKEN_NAME);
      });
    });
    
    context("function: symbol", () => {
      it("returns the token's symbol", async function () {
        expect(await PROXY.symbol()).
          to.equal(AMOR_TOKEN_SYMBOL);
      });
    });

    context("function: approve()", () => {
      it("allows funds to be approved for spending", async function () {
        //  Approve AMOR to be transferred
        expect(await PROXY.approve(root.address, TEST_TRANSFER)).
          to.emit(PROXY, "Approval").
            withArgs(root.address, root.address, TEST_TRANSFER);
      });
      
      it("shows the correct allowance", async function () {
        expect(await PROXY.allowance(root.address, root.address)).to.equal(TEST_TRANSFER);
      });
    });

    context("function: transferFrom()", () => {
      it("transfers from one user to another", async function () {
        const taxDeducted = TEST_TRANSFER*(TAX_RATE/BASIS_POINTS);

        expect(await PROXY.transferFrom(root.address, user1.address, TEST_TRANSFER))
          .to.emit(PROXY, "Transfer")
            .withArgs(root.address, user1.address, (TEST_TRANSFER-taxDeducted).toString());

      });
      it("allocates the fees to the collector", async function () {
        const taxCollected = TEST_TRANSFER*(TAX_RATE/BASIS_POINTS);

        expect(await PROXY.balanceOf(multisig.address)).to.equal(taxCollected.toString());
      })
      it("correctly substracts the fees from the sender", async function () {
        const taxAmount = TEST_TRANSFER*(1-(TAX_RATE/BASIS_POINTS));

        expect(await PROXY.balanceOf(user1.address)).to.equal(taxAmount.toString());
      });
      it("transfers from one user to another when tax is zero", async function () {
        await PROXY.setTaxRate(0);
        await PROXY.approve(root.address, TEST_TRANSFER);

        expect(await PROXY.transferFrom(root.address, user2.address, TEST_TRANSFER))
          .to.emit(PROXY, "Transfer")
            .withArgs(root.address, user2.address, (TEST_TRANSFER).toString());


        expect(await PROXY.balanceOf(user2.address)).to.equal(TEST_TRANSFER.toString());

        await PROXY.setTaxRate(TAX_RATE);
      });
      it("it fails to transfers from one user to another if not enough tokens", async function () {
        await expect(PROXY.connect(user3).transfer(user1.address, TEST_TRANSFER)).to.be.revertedWith(
          'InvalidTransfer()'
        );
      });
      it("it fails to transfers from one user to another if zero address", async function () {
        await expect(PROXY.transfer(ZERO_ADDRESS, TEST_TRANSFER)).to.be.revertedWith(
          'InvalidTransfer()'
        );
      });
    });

    context("function: viewRate()", () => {
      it("returns the current tax rate", async function () {
        expect(await PROXY.taxRate()).
          to.equal(TAX_RATE);
      });
    });

    context("function: viewCollector()", () => {
      it("returns the current fee collector", async function () {
        expect(await PROXY.taxController()).
          to.equal(multisig.address);
      });
    });

    context("function: upgradeTo()", () => {
      it("upgrades the implementation used for the proxy", async function () {
        expect(await AMOR_BEACON.upgradeTo(MOCK_UPGRADE_IMPLEMENTATION.address)).
          to.emit(AMOR_BEACON, "Upgraded").
            withArgs(MOCK_UPGRADE_IMPLEMENTATION.address);
      });
      it("returns the new implementation address", async function () {
        expect(await PROXY_CONTRACT.implementation()).
          to.equal(MOCK_UPGRADE_IMPLEMENTATION.address);
      });
    })

    context("function: setTaxRate()", () => {
      it("sets new tax rate", async function () {
        expect(await PROXY.taxRate()).
          to.equal(TAX_RATE);

        const NEW_TAX_RATE = 321;
        await PROXY.setTaxRate(NEW_TAX_RATE);
        
        expect(await PROXY.taxRate()).
          to.equal(NEW_TAX_RATE);
      });

      it("fails to set new tax rate if InvalidRate", async function () {
        const NEW_TAX_RATE = 501;
        await expect(PROXY.setTaxRate(NEW_TAX_RATE)).to.be.revertedWith(
          'InvalidRate()'
        );
      });
    });

    context("function: updateController()", () => {
      it("sets new controller address", async function () {
        expect(await PROXY.taxController()).
          to.equal(multisig.address);

        const NEW_ADDRESS = user1.address;
        await PROXY.updateController(NEW_ADDRESS);

        expect(await PROXY.taxController()).
          to.equal(NEW_ADDRESS);
      });

      it("fails to set new controller address if InvalidTaxCollector", async function () {
        const NEW_ADDRESS = PROXY.address;
        await expect(PROXY.updateController(NEW_ADDRESS)).to.be.revertedWith(
          'InvalidTaxCollector()'
        );
      });
    });

    context("function: pause() and unpause()", () => {
      it("it pauses the contract", async function () {
        expect(await PROXY.pause()).
          to.emit(PROXY, "Paused")
          .withArgs(root.address);
      });

      it("it unpauses the contract", async function () {
        expect(await PROXY.unpause()).
          to.emit(PROXY, "Unpaused")
          .withArgs(root.address);
      });
    });
});
