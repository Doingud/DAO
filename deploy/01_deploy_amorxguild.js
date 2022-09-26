const { getAddresses, multisig, AMOR } = require('../../config');
const addresses = getAddresses();

async function main() {
    const [deployer] = await ethers.getSigners();
    const admin = addresses[multisig]; // 0xdd634602038eBf699581D34d6142a4FB5aa66Ff5
    const deployedAMOR = addresses[AMOR]; // 0x9E4A13E5c30e14AA96A0bC147A106e4166248343

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    const AMORxGuildToken = await ethers.getContractFactory("AMORxGuildToken");
    const AMORxGuild = await AMORxGuildToken.deploy();
    console.log("AMORxGuild address:", AMORxGuild.address);

    // deploy guild controller
    const GuildControllerFactory = await ethers.getContractFactory("GuildController");
    const GuildController = await GuildControllerFactory.deploy();
    console.log("GuildController address:", GuildController.address);

    const tx = await AMORxGuild.init("AMORxGuild Token", "AMORxGuild", deployedAMOR, GuildController.address);
    console.log("tx is %s", tx);
    console.log("AMORxGuild address:", AMORxGuild.address);

    // deploy and init FXAMORxGuild
    const FXAMORxGuildToken = await ethers.getContractFactory("FXAMORxGuild");
    const FXAMORxGuild = await FXAMORxGuildToken.deploy();
    const tx2 = await FXAMORxGuild.init("FXAMORxGuild Token", "FXAMORxGuild", admin, AMORxGuild.address);
    console.log("tx2 is %s", tx2);
    console.log("FXAMORxGuild address:", FXAMORxGuild.address);


    // deploy MetaDaoController
    const MetaDaoControllerFactory = await ethers.getContractFactory("MetaDaoController");
    const MetaDaoController = await MetaDaoControllerFactory.deploy(admin);
    console.log("MetaDaoController address:", MetaDaoController.address);


    // init MetaDaoController (need guildFactory)
    // init guild controller
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  