const { ethers } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");

use(solidity);

describe("AMORxGuilds", function () {

  // quick fix to let gas reporter fetch data from gas station & coinmarketcap
  before((done) => {
    setTimeout(done, 2000);
  });

  //  The contract with the execution logic
  let IMPLEMENTATION;
  //  The contract which houses the Proxy Factory 
  let FACTORY;
  //  The contract which stores the data
  let PROXY_CONTRACT;
  //  The PROXY_CONTRACT with the implemenation
  let PROXY;

  let GUILDS;

  let GUILD_ONE;
  let GUILD_TWO;
  let GUILD_THREE;
  let AMOR_TOKEN;

  const RATE = 500;
  const TOKEN_NAME = "DoinGud MetaDAO";
  const TOKEN_SYMBOL = "AMOR";
  const TEST_TRANSFER = 100;
  const BASIS_POINTS = 10000;
  const INIT_MINT = 10000000;

  const GUILDS_NAMES = ["GuildOne", "GuildTwo", "GuildThree"];
  const GUILDS_SYMBOLS = ["TokenOne", "TokenTwo", "TokenThree"];

  describe("AMOR deployment", function() {
    it("Should deploy AMOR token", async function () {
      const AMORToken = await ethers.getContractFactory("DoinGud");

      AMOR_TOKEN = await AMORToken.deploy();
    });
  })

    describe("Implementation deployment", function() {
      it("Should deploy AMORxGuild", async function () {
        const [address1, address2, address3] = await ethers.getSigners();
  
        const AMORxGuild = await ethers.getContractFactory("AMORxGuild");
  
        const token = await AMORxGuild.deploy();
  
        IMPLEMENTATION = token;
      });
    })

    describe("Proxy Factory deployment", function() {
      it("Should deploy GuildFactory", async function () {
        const [address1, address2, address3] = await ethers.getSigners();
  
        const guildFactory = await ethers.getContractFactory("GuildTokenFactory");
  
        const factory = await guildFactory.deploy(IMPLEMENTATION.address, AMOR_TOKEN.address);
  
        FACTORY = factory;
      });
    })

    describe("Initiate Proxy Factory Production", function () {
      it("Should deploy 3 different AMORxGuild clones", async function () {

        const Clones = await FACTORY.deployTokens(GUILDS_NAMES, GUILDS_SYMBOLS);
        GUILDS = await FACTORY.viewGuilds()

        //  Attach the DoinGudToken contract's ABI to the proxy, so that the correct function selector is called
        GUILD_ONE = IMPLEMENTATION.attach(GUILDS[0]);
        GUILD_TWO = IMPLEMENTATION.attach(GUILDS[1]);
        GUILD_THREE = IMPLEMENTATION.attach(GUILDS[2]);
      }); 

      it("Should have initialized Guild One", async function () {
        expect(await GUILD_ONE.name()).to.equal(GUILDS_NAMES[0]);
        expect(await GUILD_ONE.symbol()).to.equal(GUILDS_SYMBOLS[0]);
      })

      it("Should have initialized Guild Two", async function () {
        expect(await GUILD_TWO.name()).to.equal(GUILDS_NAMES[1]);
        expect(await GUILD_TWO.symbol()).to.equal(GUILDS_SYMBOLS[1]);
      })

      it("Should have initialized Guild Three", async function () {
        expect(await GUILD_THREE.name()).to.equal(GUILDS_NAMES[2]);
        expect(await GUILD_THREE.symbol()).to.equal(GUILDS_SYMBOLS[2]);
      })
    
    });

    describe("AMOR initialization for token staking", function () {
      it("Should initialize AMOR token", async function () {
        const [address1, address2, address3] = await ethers.getSigners();

        expect(await AMOR_TOKEN.init(
          TOKEN_NAME,
          TOKEN_SYMBOL,
          address2.address,
          RATE
        )).
          to.emit(AMOR_TOKEN, "Initialized")
            .withArgs(true, address2.address, RATE);
      });

      it("Should have minted 10 Million AMOR to address 1", async function () {
        const [address1, address2, address3] = await ethers.getSigners();

        expect(await AMOR_TOKEN.balanceOf(address1.address)).
          to.equal(ethers.utils.parseEther(INIT_MINT.toString()));
      });
    })

    describe("Staking AMOR for AMORxGuild", function () {
      it("Should stake 100 AMOR in GuildOne", async function () {
        const [address1, address2, address3] = await ethers.getSigners();

        await AMOR_TOKEN.approve(GUILD_ONE.address, ethers.utils.parseEther(TEST_TRANSFER.toString()));

        expect(await GUILD_ONE.stakeAmor(address1.address, ethers.utils.parseEther(TEST_TRANSFER.toString()))).
          to.emit(GUILD_ONE, "Stake").
            withArgs(address1.address, address1.address, ethers.utils.parseEther(TEST_TRANSFER.toString()));
      });

      //  **  This returns the expected amount given the bonding curve
      //  **  But this amount will be perceived as too little by users
      //  **  0.000001 AMORxGuild per 100 AMOR staked   
      it("Should have received 10000000000 GUILD_ONE", async function () {
        const [address1, address2, address3] = await ethers.getSigners();

        expect(await GUILD_ONE.balanceOf(address1.address)).to.equal(10000000000);
      }); 
      
      it("Should stake 100 AMOR in GuildTwo", async function () {
        const [address1, address2, address3] = await ethers.getSigners();

        await AMOR_TOKEN.approve(GUILD_TWO.address, ethers.utils.parseEther(TEST_TRANSFER.toString()));

        expect(await GUILD_TWO.stakeAmor(address1.address, ethers.utils.parseEther(TEST_TRANSFER.toString()))).
          to.emit(GUILD_TWO, "Stake").
            withArgs(address1.address, address1.address, ethers.utils.parseEther(TEST_TRANSFER.toString()));
      });

      //  **  This returns the expected amount given the bonding curve
      //  **  But this amount will be perceived as too little by users
      //  **  0.000001 AMORxGuild per 100 AMOR staked   
      it("Should have received 10000000000 GUILD_TWO", async function () {
        const [address1, address2, address3] = await ethers.getSigners();

        expect(await GUILD_TWO.balanceOf(address1.address)).to.equal(10000000000);
      });
      
      it("Should stake 100 AMOR in GuildThree", async function () {
        const [address1, address2, address3] = await ethers.getSigners();

        await AMOR_TOKEN.approve(GUILD_THREE.address, ethers.utils.parseEther(TEST_TRANSFER.toString()));

        expect(await GUILD_THREE.stakeAmor(address1.address, ethers.utils.parseEther(TEST_TRANSFER.toString()))).
          to.emit(GUILD_THREE, "Stake").
            withArgs(address1.address, address1.address, ethers.utils.parseEther(TEST_TRANSFER.toString()));
      });

      //  **  This returns the expected amount given the bonding curve
      //  **  But this amount will be perceived as too little by users
      //  **  0.000001 AMORxGuild per 100 AMOR staked   
      it("Should have received 10000000000 GUILD_THREE", async function () {
        const [address1, address2, address3] = await ethers.getSigners();

        expect(await GUILD_THREE.balanceOf(address1.address)).to.equal(10000000000);
      });
    })

    describe("AMORxGuild Withdrawals", function () {
      it("Should allow withdrawals of AMORxGuild", async function () {

      });
    })


  });
