const { getAddresses } = require('../config');
const addresses = getAddresses();

async function main() {
    const [deployer] = await ethers.getSigners();
    const AvatarxGuild_ = addresses.AvatarProxy;
    const multisig_ = addresses.multisig;
    const Governor_ = addresses.GovernorProxy;

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // connect AvatarxGuild
    let a  = await ethers.getContractFactory('AvatarxGuild')
    let b = await a.attach(AvatarxGuild_)
    let AvatarxGuild = await b.deployed();
    console.log("AvatarxGuild address:", AvatarxGuild.address);

    let tx = await AvatarxGuild.init(multisig_, Governor_);
    console.log("tx is %s", tx);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  