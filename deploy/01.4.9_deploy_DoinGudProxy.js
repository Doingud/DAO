const { getAddresses, multisig } = require('../config');
const addresses = getAddresses();

async function main() {
    const [deployer] = await ethers.getSigners();
    const admin = addresses[multisig]; // 0xdd634602038eBf699581D34d6142a4FB5aa66Ff5

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());


    // deploy DoinGudProxy
    const DoinGudProxyFactory = await ethers.getContractFactory("DoinGudProxy");
    const DoinGudProxy = await DoinGudProxyFactory.deploy();
    console.log("DoinGudProxy address:", DoinGudProxy.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  