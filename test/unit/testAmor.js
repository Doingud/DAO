const { ethers } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");
const { TAX_RATE, BASIS_POINTS, AMOR_TOKEN_NAME, AMOR_TOKEN_SYMBOL } = require('../helpers/constants.js');
const init = require('../test-init.js');

use(solidity);

  //  The contract with the execution logic
  let IMPLEMENTATION;
  //  The contract which stores the data
  let PROXY_CONTRACT;
  //  The PROXY_CONTRACT with the implemenation
  let PROXY;

  const TEST_TRANSFER = 100;
  //const BASIS_POINTS = 10000;

describe("unit - AMOR Token", function () {

  const setupTests = deployments.createFixture(async () => {
    const signers = await ethers.getSigners();
    const setup = await init.initialize(signers);
    await init.getTokens(setup);

    IMPLEMENTATION = setup.tokens.AmorTokenImplementation;
    PROXY_CONTRACT = setup.tokens.AmorTokenProxy;
    
    root = setup.roles.root;
    
});

  before('Setup', async function() {
    await setupTests();
  });

  
  context(">>> AmorToken testing", () => {
    describe("Proxy functions", function () {
        //  Deploy the proxy contract and point it to the correct implementation
      it("attach ABI to proxy", async function () {
        //  Attach the AmorToken contract's ABI to the proxy, so that the correct function selector is called
        PROXY = IMPLEMENTATION.attach(PROXY_CONTRACT.address);
      });
      //  Make sure the proxy contract is linked to the implementation address
      it("function: getImplementation()", async function () {
        expect(await PROXY_CONTRACT.getImplementation()).to.equal(IMPLEMENTATION.address);
      });

      it("function: init()", async function () {
        const [address1, address2] = await ethers.getSigners();
        
        expect(await PROXY.init(
          AMOR_TOKEN_NAME,
          AMOR_TOKEN_SYMBOL,
          address2.address,
          TAX_RATE,
          address1.address
        )).
          to.emit(PROXY, "Initialized")
            .withArgs(true, address2.address, TAX_RATE);
        });
      });

    describe("ERC20 functions", async function () {
      it("function: totalSupply()", async function () {
        expect(await PROXY.totalSupply()).
          to.equal(ethers.utils.parseEther("10000000"));
      });

      it("function: balanceOf()", async function () {
        const [address1] = await ethers.getSigners();

        expect(await PROXY.balanceOf(address1.address)).
          to.equal(ethers.utils.parseEther("10000000"));
      });

      it("function: name()", async function () {
        expect(await PROXY.name()).
          to.equal(AMOR_TOKEN_NAME);
      });

      it("function: symbol()", async function () {
        expect(await PROXY.symbol()).
          to.equal(AMOR_TOKEN_SYMBOL);
      });

      it("function: approve()", async function () {
        const [address1] = await ethers.getSigners();
        //  Approve AMOR to be transferred
        expect(await PROXY.approve(address1.address, ethers.utils.parseEther(TEST_TRANSFER.toString()))).
          to.emit(PROXY, "Approval").
            withArgs(address1.address, address1.address, ethers.utils.parseEther(TEST_TRANSFER.toString()));
      })

      it("function: transfer()", async function () {
        const [address1, address2, address3] = await ethers.getSigners();
        const taxDeducted = TEST_TRANSFER*(1-TAX_RATE/BASIS_POINTS);
        
        
        expect(await PROXY.transferFrom(address1.address, address3.address, ethers.utils.parseEther(TEST_TRANSFER.toString())))
          .to.emit(PROXY, "Transfer")
            .withArgs(address1.address, address3.address,ethers.utils.parseEther(taxDeducted.toString()));
      })

    });

    describe("ERC20Taxable", async function () {
      it("function: viewRate()", async function () {
        expect(await PROXY.viewRate()).
          to.equal(TAX_RATE);
      });

      it("function: viewCollector()", async function () {
        const [address1, address2] = await ethers.getSigners();
        expect(await PROXY.viewCollector()).
          to.equal(address2.address);
      });

      it("correct tax collector balance", async function () {
        const taxAmount = TEST_TRANSFER*(TAX_RATE/BASIS_POINTS);
        const [address1, address2, address3] = await ethers.getSigners();

        expect(await PROXY.balanceOf(address2.address)).to.equal(ethers.utils.parseEther(taxAmount.toString()));
      })

      it("correct user balance", async function () {
        const taxAmount = TEST_TRANSFER*(1-(TAX_RATE/BASIS_POINTS));
        const [address1, address2, address3] = await ethers.getSigners();

        expect(await PROXY.balanceOf(address3.address)).to.equal(ethers.utils.parseEther(taxAmount.toString()));
      });
    });

  });
});