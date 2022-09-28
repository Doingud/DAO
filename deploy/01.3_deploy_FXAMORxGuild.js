const { getAddresses } = require('../config');
const addresses = getAddresses();

async function main() {
    const [deployer] = await ethers.getSigners();
    const admin = addresses.multisig; // 0xdd634602038eBf699581D34d6142a4FB5aa66Ff5

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    const AMORxGuild = addresses.AMORxGuild;

    // deploy and init FXAMORxGuild
    const FXAMORxGuildToken = await ethers.getContractFactory("FXAMORxGuild");
    const FXAMORxGuild = await FXAMORxGuildToken.deploy();
    const tx = await FXAMORxGuild.init("FXAMORxGuild Token", "FXAMORxGuild", admin, AMORxGuild);
    console.log("tx is %s", tx);
    console.log("FXAMORxGuild address:", FXAMORxGuild.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  