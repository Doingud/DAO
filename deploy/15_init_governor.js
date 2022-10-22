const { getAddresses } = require('../config');
const addresses = getAddresses();

async function main() {
    const [deployer] = await ethers.getSigners();
    const AMOR = addresses.AMOR;
    const Avatar = addresses.Avatar;
    const Snapshot = addresses.Snapshot;
    const Governor_ = addresses.Governor;

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // connect DoinGudProxy
    let a  = await ethers.getContractFactory('DoinGudGovernor')
    let b = await a.attach(Governor_)
    let Governor = await b.deployed();
    console.log("Governor address:", Governor.address);

    let tx = await Governor.init('Governor', AMOR, Snapshot, Avatar);
    console.log("tx is %s", tx);
    console.log("DoinGudProxy address:", Governor.address);
}
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  