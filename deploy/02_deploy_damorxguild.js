const { getAddresses, multisig } = require('../../config');
const addresses = getAddresses();
const { ONE_HUNDRED_ETHER } = require('../helpers/constants.js');

async function main() {
    const [deployer] = await ethers.getSigners();
    const admin = addresses[multisig]; // 0xdd634602038eBf699581D34d6142a4FB5aa66Ff5
    const deployedAMORxGuild = await addresses[AMORxGuild].deployed();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());
      
    const dAMORxGuildToken = await ethers.getContractFactory("dAMORxGuild");
    const dAMORxGuild = await dAMORxGuildToken.deploy();

    const amount = ONE_HUNDRED_ETHER;
    const tx = await dAMORxGuild.init("dAMORxGuild Token", "dAMORxGuild", admin, deployedAMORxGuild, amount);
    console.log("tx is %s", tx);
    console.log("dAMORxGuild address:", dAMORxGuild.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  