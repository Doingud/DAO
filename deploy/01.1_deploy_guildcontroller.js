const { getAddresses, multisig, AMOR, AMORxGuild } = require('../config');
const addresses = getAddresses();

async function main() {
    const [deployer] = await ethers.getSigners();
    const admin = addresses[multisig]; // 0xdd634602038eBf699581D34d6142a4FB5aa66Ff5
    const deployedAMOR = addresses[AMOR]; // 0x9E4A13E5c30e14AA96A0bC147A106e4166248343
    // const deployedAMORxGuild = addresses['0x3D0641b6f4B938af344FB81b70A2b0bE46f5feca']; // 0x3D0641b6f4B938af344FB81b70A2b0bE46f5feca
    // const deployedAMORxGuild = addresses[AMORxGuild];//.deployed();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());


    // deploy guild controller
    const GuildControllerFactory = await ethers.getContractFactory("GuildController");
    const GuildController = await GuildControllerFactory.deploy();
    console.log("GuildController address:", GuildController.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  