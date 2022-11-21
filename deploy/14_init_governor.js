const { getAddresses } = require('../config');
const addresses = getAddresses();

async function main() {
    const [deployer] = await ethers.getSigners();
    const AMORxGuild_ = addresses.AMORxGuildProxy;
    const Avatar_ = addresses.AvatarProxy;
    const Governor_ = addresses.GovernorProxy;
    const initialGuardian = addresses.multisig;

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // connect Governor
    let a  = await ethers.getContractFactory('DoinGudGovernorVersionForTesting');
    let b = await a.attach(Governor_)
    let Governor = await b.deployed();
    console.log("Governor address:", Governor.address);


    let tx = await Governor.init(AMORxGuild_, Avatar_, initialGuardian);
    console.log("tx is %s", tx);
    console.log("Governor address:", Governor.address);
}
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  