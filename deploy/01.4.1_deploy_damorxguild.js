const { getAddresses, multisig } = require('../config');
const addresses = getAddresses();

async function main() {
    const [deployer] = await ethers.getSigners();
    const admin = addresses[multisig]; // 0xdd634602038eBf699581D34d6142a4FB5aa66Ff5

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    const AMORxGuild = '0x3D0641b6f4B938af344FB81b70A2b0bE46f5feca'

    // deploy and init dAMORxGuild
    const dAMORxGuildToken = await ethers.getContractFactory("dAMORxGuild");
    const dAMORxGuild = await dAMORxGuildToken.deploy();
    const amount = 10e8;
    const tx = await dAMORxGuild.init("dAMORxGuild Token", "dAMORxGuild", admin, AMORxGuild, amount);
    console.log("tx is %s", tx);
    console.log("dAMORxGuild address:", dAMORxGuild.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  