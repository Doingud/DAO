const { getAddresses } = require('../config');
const addresses = getAddresses();

async function main() {
    const [deployer] = await ethers.getSigners();
    const MetaDao = addresses.MetaDAOController;
    const AMORxGuild_ = addresses.AMORxGuild;
    const FXAMORxGuild_ = addresses.FXAMORxGuild;

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // connect AMOR
    let a  = await ethers.getContractFactory('FXAMORxGuild')
    let b = await a.attach(FXAMORxGuild_)
    let FXAMORxGuild = await b.deployed();
    console.log("FXAMORxGuild address:", FXAMORxGuild.address);
    console.log("FXAMORxGuild owner is %s", await FXAMORxGuild.owner());

    const tx = await FXAMORxGuild.init("DoinGud FXAMOR", "FXAMOR", MetaDao, AMORxGuild_);
    console.log("tx is %s", tx);
    console.log("FXAMORxGuild address:", FXAMORxGuild.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  