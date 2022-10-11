const { getAddresses } = require('../config');
const addresses = getAddresses();

async function main() {
    const [deployer] = await ethers.getSigners();
    const AMOR = addresses.AMOR;
    const DoinGudProxy_ = addresses.DoinGudProxy;

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // connect DoinGudProxy
    let a  = await ethers.getContractFactory('DoinGudProxy')
    let b = await a.attach(DoinGudProxy_)
    let DoinGudProxy = await b.deployed();
    console.log("DoinGudProxy address:", DoinGudProxy.address);

    let tx = await DoinGudProxy.initProxy(AMOR);
    console.log("tx is %s", tx);
    console.log("DoinGudProxy address:", DoinGudProxy.address);
}
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  