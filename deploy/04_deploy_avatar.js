const { getAddresses } = require('../config');
const addresses = getAddresses();

async function main() {
    const [deployer] = await ethers.getSigners();
    const admin = addresses.multisig; // 0xdd634602038eBf699581D34d6142a4FB5aa66Ff5
    const Governor_ = addresses.Governor;

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());
      
    const AvatarxGuildFactory = await ethers.getContractFactory("AvatarxGuild");
    const AvatarxGuild = await AvatarxGuildFactory.deploy();

    const tx = await AvatarxGuild.init(admin, Governor_);
    console.log("tx is %s", tx);
    console.log("AvatarxGuild address:", AvatarxGuild.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  