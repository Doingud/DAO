const { getAddresses } = require('../config');
const addresses = getAddresses();

async function main() {
    const [deployer] = await ethers.getSigners();
    const MetaDao = addresses.MetaDAOController;
    const AMOR_ = addresses.AMOR;
    const AMORxGuild_ = addresses.AMORxGuild;

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // connect AMOR
    let a  = await ethers.getContractFactory('AMORxGuildToken')
    let b = await a.attach(AMORxGuild_)
    let AMORxGuild = await b.deployed();
    console.log("AMORxGuildToken address:", AMORxGuild.address);
    console.log("AMORxGuildToken owner is %s", await AMORxGuild.owner());

    const tx = await AMORxGuild.init("AMORxMETADAO", "AMORxG", AMOR_, MetaDao);
    console.log("tx is %s", tx);
    console.log("AMORxGuildToken address:", AMORxGuild.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  