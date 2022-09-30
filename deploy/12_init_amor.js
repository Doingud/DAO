const { getAddresses } = require('../config');
const addresses = getAddresses();

async function main() {
    const [deployer] = await ethers.getSigners();
    const admin = addresses.multisig; // 0xdd634602038eBf699581D34d6142a4FB5aa66Ff5
    const taxCollector = addresses.MetaDAOController;
    const AMOR_ = addresses.AMOR;
    const defaulTaxRate = 0;

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // connect AMOR
    let a  = await ethers.getContractFactory('AMORToken')
    let b = await a.attach(AMOR_)
    let AMORToken = await b.deployed();
    console.log("AMORToken address:", AMORToken.address);

    const tx = await AMORToken.init("AMOR Token", "AMOR", taxCollector, defaulTaxRate, admin);
    console.log("tx is %s", tx);
    console.log("AMOR address:", AMORToken.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  