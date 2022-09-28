const { getAddresses } = require('../config');
const addresses = getAddresses();

async function main() {
    const [deployer] = await ethers.getSigners();
    const Mock = addresses.MOCK_MODULE;
    const AMORxGuild_ = addresses.AMORxGuild;
    const Avatar_ = addresses.Avatar;

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // connect DoinGudGovernor
    let a  = await ethers.getContractFactory('DoinGudGovernor')
    let b = await a.attach(addresses.Governor)
    let DoinGudGovernor = await b.deployed();
    console.log("DoinGudGovernor address:", DoinGudGovernor.address);

    const tx = await DoinGudGovernor.init("DoinGudGovernor", AMORxGuild_, Mock, Avatar_);
    console.log("tx is %s", tx);
    console.log("DoinGudGovernor address:", DoinGudGovernor.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  