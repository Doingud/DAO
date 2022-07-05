const { ethers } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");
const init = require('../test-init.js');

use(solidity);

const RATE = 500;
const TOKEN_NAME = "DoinGud MetaDAO";
const TOKEN_SYMBOL = "AMOR";
const TEST_TRANSFER = 100;
const BASIS_POINTS = 10000;

//  The contract with the execution logic
let IMPLEMENTATION;
//  The contract which stores the data
let PROXY_CONTRACT;
//  The PROXY_CONTRACT with the implemenation
let PROXY;

let buyer1;
let collector;
let multisig;


describe("unit - Contract: AMORToken Token", function () {

    const setupTests = deployments.createFixture(async () => {
        const signers = await ethers.getSigners();
        const setup = await init.initialize(signers);
        await init.getTokens(setup);

        multisig = setup.roles.root;
        collector = setup.roles.authorizer_adaptor;
        buyer1 = setup.roles.buyer1;
    });

    // quick fix to let gas reporter fetch data from gas station & coinmarketcap
    before((done) => {
      setTimeout(done, 2000);
    });

    before('>>> setup', async function() {
        await setupTests();
    });

    describe("Implementation deployment", function() {
      it("Should deploy AMORToken", async function () {  
        const DoinGudToken = await ethers.getContractFactory("AMORToken");
  
        const token = await DoinGudToken.deploy();
  
        IMPLEMENTATION = token;
      });
    })

    describe("Proxy Deployment and Setup", function () {
        //  Deploy the proxy contract and point it to the correct implementation
      it("Should deploy DoinGudProxy", async function () {

        const DoinGudProxy = await ethers.getContractFactory("AMORTokenProxy");

        const token = await DoinGudProxy.deploy(IMPLEMENTATION.address, []);
        PROXY_CONTRACT = token;

        //  Attach the DoinGudToken contract's ABI to the proxy, so that the correct function selector is called
        PROXY = IMPLEMENTATION.attach(PROXY_CONTRACT.address);
      });
      //  Make sure the proxy contract is linked to the implementation address
      it("Should return the implementation address", async function () {

        expect(await PROXY_CONTRACT.getImplementation()).to.equal(IMPLEMENTATION.address);
      });
    });

    //  Run the init function
    describe("init()", function () {
      //  Initialization is vital for the storage contract
      it("Should initialize the proxy", async function () {        
        expect(await PROXY.init(
          TOKEN_NAME,
          TOKEN_SYMBOL,
          collector.address,
          RATE,
          multisig.address
        )).
          to.emit(PROXY, "Initialized")
            .withArgs(true, collector.address, RATE);
      });

      it("Should have a totalSupply of 10 Million AMOR", async function () {
        expect(await PROXY.totalSupply()).
          to.equal(ethers.utils.parseEther("10000000"));
      });

      it("Should show address1 has 10 Million AMOR", async function () {
        expect(await PROXY.balanceOf(multisig.address)).
          to.equal(ethers.utils.parseEther("10000000"));
      });

      it("Should have the name DoinGud MetaDAO", async function () {
        expect(await PROXY.name()).
          to.equal("DoinGud MetaDAO");
      });

      it("Should have the symbol AMOR", async function () {
        expect(await PROXY.symbol()).
          to.equal("AMOR");
      });

      it("Should show the tax rate", async function () {
        expect(await PROXY.viewRate()).
          to.equal(RATE);
      });

      it("Should show the tax collector", async function () {
        expect(await PROXY.viewCollector()).
          to.equal(collector.address);
      });

    })

    //  ERC20 approve function
    describe("approve()", function () {
      it("Should approve 100 AMOR to be transferred", async function () {
        //  Approve AMOR to be transferred
        expect(await PROXY.approve(multisig.address, ethers.utils.parseEther(TEST_TRANSFER.toString()))).
          to.emit(PROXY, "Approval").
            withArgs(multisig.address, multisig.address, ethers.utils.parseEther(TEST_TRANSFER.toString()));
      })

    })

    //  ERC20 transfer function
    describe("transfer()", function () {
      it("Should transfer 100 AMOR", async function () {
        const taxDeducted = TEST_TRANSFER*(1-RATE/BASIS_POINTS);
        
        expect(await PROXY.transferFrom(multisig.address, buyer1.address, ethers.utils.parseEther(TEST_TRANSFER.toString())))
          .to.emit(PROXY, "Transfer")
            .withArgs(multisig.address, buyer1.address,ethers.utils.parseEther(taxDeducted.toString()));
      })
    })

    //  Check that fees are collected as required
    describe("tax collection", function () {
      it("Tax collector should have collected 5% tax", async function () {
        const taxAmount = TEST_TRANSFER*(RATE/BASIS_POINTS);

        expect(await PROXY.balanceOf(collector.address)).to.equal(ethers.utils.parseEther(taxAmount.toString()));
      })

      it("User should have tax deducted amount in his account", async function () {
        const taxAmount = TEST_TRANSFER*(1-(RATE/BASIS_POINTS));

        expect(await PROXY.balanceOf(buyer1.address)).to.equal(ethers.utils.parseEther(taxAmount.toString()));
      })
    })

  });
