const { getAddresses } = require('../config');
const addresses = getAddresses();

async function main() {
    const [deployer] = await ethers.getSigners();
    const MetaDao = addresses.MetaDAOControllerProxy;
    const AMORxGuild_ = addresses.AMORxGuildProxy;
    const dAMORxGuild_ = addresses.dAMORxGuildProxy;
    const GUARDIAN_THRESHOLD = 10;

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // connect AMOR
    let a  = await ethers.getContractFactory('dAMORxGuild')
    let b = await a.attach(dAMORxGuild_)
    let DAMOR = await b.deployed();
    console.log("dAMORxGuild address:", DAMOR.address);
    console.log("dAMORxGuild owner is %s", await DAMOR.owner());

    const tx = await DAMOR.init("DoinGud dAMOR", "DAMOR", MetaDao, AMORxGuild_, GUARDIAN_THRESHOLD);
    console.log("tx is %s", tx);
    console.log("DAMOR address:", DAMOR.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  