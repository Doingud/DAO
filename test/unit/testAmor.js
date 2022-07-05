const { ethers } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");

use(solidity);

describe("DoinGud MetaDAO", function () {

  // quick fix to let gas reporter fetch data from gas station & coinmarketcap
  before((done) => {
    setTimeout(done, 2000);
  });

  //  The contract with the execution logic
  let IMPLEMENTATION;
  //  The contract which stores the data
  let PROXY_CONTRACT;
  //  The PROXY_CONTRACT with the implemenation
  let PROXY;

  const RATE = 500;
  const TOKEN_NAME = "DoinGud MetaDAO";
  const TOKEN_SYMBOL = "AMOR";
  const TEST_TRANSFER = 100;
  const BASIS_POINTS = 10000;

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
        const [address1, address2] = await ethers.getSigners();
        
        expect(await PROXY.init(
          TOKEN_NAME,
          TOKEN_SYMBOL,
          address2.address,
          RATE,
          address1.address
        )).
          to.emit(PROXY, "Initialized")
            .withArgs(true, address2.address, RATE);
      });

      it("Should have a totalSupply of 10 Million AMOR", async function () {

        expect(await PROXY.totalSupply()).
          to.equal(ethers.utils.parseEther("10000000"));
      });

      it("Should show address1 has 10 Million AMOR", async function () {
        const [address1] = await ethers.getSigners();

        expect(await PROXY.balanceOf(address1.address)).
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
        const [address2] = await ethers.getSigners();
        expect(await PROXY.viewCollector()).
          to.equal(address2.address);
      });

    })

    //  ERC20 approve function
    describe("approve()", function () {
      it("Should approve 100 AMOR to be transferred", async function () {
        const [address1] = await ethers.getSigners();
        //  Approve AMOR to be transferred
        expect(await PROXY.approve(address1.address, ethers.utils.parseEther(TEST_TRANSFER.toString()))).
          to.emit(PROXY, "Approval").
            withArgs(address1.address, address1.address, ethers.utils.parseEther(TEST_TRANSFER.toString()));
      })

    })

    //  ERC20 transfer function
    describe("transfer()", function () {
      it("Should transfer 100 AMOR", async function () {
        const [address1, address3] = await ethers.getSigners();
        const taxDeducted = TEST_TRANSFER*(1-RATE/BASIS_POINTS);
        
        
        expect(await PROXY.transferFrom(address1.address, address3.address, ethers.utils.parseEther(TEST_TRANSFER.toString())))
          .to.emit(PROXY, "Transfer")
            .withArgs(address1.address, address3.address,ethers.utils.parseEther(taxDeducted.toString()));
      })
    })

    //  Check that fees are collected as required
    describe("tax collection", function () {
      it("Tax collector should have collected 5% tax", async function () {
        const taxAmount = TEST_TRANSFER*(RATE/BASIS_POINTS);
        const [address2] = await ethers.getSigners();

        expect(await PROXY.balanceOf(address2.address)).to.equal(ethers.utils.parseEther(taxAmount.toString()));
      })

      it("User should have tax deducted amount in his account", async function () {
        const taxAmount = TEST_TRANSFER*(1-(RATE/BASIS_POINTS));
        const [address3] = await ethers.getSigners();

        expect(await PROXY.balanceOf(address3.address)).to.equal(ethers.utils.parseEther(taxAmount.toString()));
      })
    })

  });
