const { getAddresses } = require('../config');
const addresses = getAddresses();

async function main() {
    const [deployer] = await ethers.getSigners();
    const admin = addresses.multisig; // 0xdd634602038eBf699581D34d6142a4FB5aa66Ff5

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());


    // deploy MetaDaoController
    const MetaDaoControllerFactory = await ethers.getContractFactory("MetaDaoController");
    const MetaDaoController = await MetaDaoControllerFactory.deploy(admin);
    console.log("MetaDaoController address:", MetaDaoController.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  