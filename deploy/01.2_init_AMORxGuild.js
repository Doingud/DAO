const { getAddresses} = require('../config');
const addresses = getAddresses();

async function main() {
    const [deployer] = await ethers.getSigners();
    const deployedAMOR = addresses.AMOR;

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    const GuildController = '0xB19bFADCca6b4AbE42d7e362B629a2632473aDBE'

    let a  = await ethers.getContractFactory('AMORxGuildToken')
    let b = await a.attach('0x3D0641b6f4B938af344FB81b70A2b0bE46f5feca')
    let deployedAMORxGuild = await b.deployed();

    const tx = await deployedAMORxGuild.init("AMORxGuild Token", "AMORxGuild", deployedAMOR, GuildController);
    console.log("tx is %s", tx);
    console.log("AMORxGuild address:", deployedAMORxGuild.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  