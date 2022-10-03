const { getAddresses } = require('../config');
const addresses = getAddresses();

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());
  
    const AMORToken = await ethers.getContractFactory("AMORToken");
    const AMOR = await AMORToken.deploy();
    console.log("AMOR address:", AMOR.address);

    // connect DoinGudProxy
    let a  = await ethers.getContractFactory('DoinGudProxy')
    let b = await a.attach(addresses.DoinGudProxy)
    let DoinGudProxy = await b.deployed();
    console.log("DoinGudProxy address:", addresses.DoinGudProxy);

    let tx = await DoinGudProxy.initProxy(AMOR.address);
    console.log("tx is %s", tx);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  