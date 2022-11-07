const { getAddresses } = require('../config');
const addresses = getAddresses();

async function main() {
    const [deployer] = await ethers.getSigners();
    const multisig_ = addresses.multisig;
    const taxCollector = addresses.MetaDAOControllerProxy;
    const AMOR_ = addresses.AMORTokenProxy;
    const defaulTaxRate = 10;

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // connect AMOR
    let a  = await ethers.getContractFactory('AMORToken')
    let b = await a.attach(AMOR_)
    let AMORToken = await b.deployed();
    console.log("AMORToken address:", AMORToken.address);
    console.log("AMORToken owner is %s", await AMORToken.owner());

    const tx = await AMORToken.init("AMOR Token", "AMOR", taxCollector, defaulTaxRate, multisig_);
    console.log("tx is %s", tx);
    console.log("AMOR address:", AMORToken.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  