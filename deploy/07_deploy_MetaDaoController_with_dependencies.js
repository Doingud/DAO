const { getAddresses } = require('../config');
const addresses = getAddresses();

async function main() {
    const [deployer] = await ethers.getSigners();
    const admin = addresses.multisig;

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // deploy and init Avatar, dAMOR, Governor for MetaDaoController
    const AvatarFactory = await ethers.getContractFactory("AvatarxGuild");
    const Avatar = await AvatarFactory.deploy();
    console.log("Avatar for MetaDaoController address:", Avatar.address);
    let a  = await ethers.getContractFactory('DoinGudProxy')
    let proxy = await a.deploy();
    console.log("Avatar for MetaDaoController proxy address:", proxy.address);
    let tx = await proxy.initProxy(Avatar.address);
    console.log("tx is %s", tx);
    
    const dAMORToken = await ethers.getContractFactory("dAMORxGuild");
    const dAMOR = await dAMORToken.deploy();
    console.log("dAMOR for MetaDaoController address:", dAMOR.address);
    a  = await ethers.getContractFactory('DoinGudProxy')
    proxy = await a.deploy();
    console.log("dAMOR for MetaDaoController proxy address:", proxy.address);
    tx = await proxy.initProxy(dAMOR.address);
    console.log("tx is %s", tx);

    const DoinGudGovernorFactory = await ethers.getContractFactory("DoinGudGovernor");
    const DoinGudGovernor = await DoinGudGovernorFactory.deploy();
    console.log("DoinGudGovernor for MetaDaoController address:", DoinGudGovernor.address);


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
  