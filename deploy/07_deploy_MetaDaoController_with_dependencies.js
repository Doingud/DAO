const { getAddresses } = require('../config');
const addresses = getAddresses();

async function main() {
    const [deployer] = await ethers.getSigners();
    const admin = addresses.multisig;

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // deploy and init Avatar, dAMOR, Governor for MetaDaoController
    // Avatar
    const AvatarFactory = await ethers.getContractFactory("AvatarxGuild");
    const Avatar = await AvatarFactory.deploy();
    console.log("Avatar for MetaDaoController address:", Avatar.address);
    let a  = await ethers.getContractFactory('DoinGudProxy')
    let proxy = await a.deploy();
    console.log("Avatar for MetaDaoController proxy address:", proxy.address);
    let tx = await proxy.initProxy(Avatar.address);
    console.log("tx is %s", tx);
    const UPDATED_Avatar = Avatar.attach(proxy.address);
    console.log("UPDATED_Avatar address is %s", UPDATED_Avatar.address);

    // dAMOR
    const dAMORToken = await ethers.getContractFactory("dAMORxGuild");
    const dAMOR = await dAMORToken.deploy();
    console.log("dAMOR for MetaDaoController address:", dAMOR.address);
    a  = await ethers.getContractFactory('DoinGudProxy')
    proxy = await a.deploy();
    console.log("dAMOR for MetaDaoController proxy address:", proxy.address);
    tx = await proxy.initProxy(dAMOR.address);
    console.log("tx is %s", tx);
    const UPDATED_dAMOR = dAMOR.attach(proxy.address);
    console.log("UPDATED_dAMOR for MetaDaoController address is %s", UPDATED_dAMOR.address);

    // Governor
    const DoinGudGovernorFactory = await ethers.getContractFactory("DoinGudGovernor");
    const DoinGudGovernor = await DoinGudGovernorFactory.deploy();
    console.log("DoinGudGovernor for MetaDaoController address:", DoinGudGovernor.address);
    a  = await ethers.getContractFactory('DoinGudProxy')
    proxy = await a.deploy();
    console.log("proxy address:", proxy.address);
    tx = await proxy.initProxy(DoinGudGovernor.address);
    console.log("tx is %s", tx);
    const UPDATED_DoinGudGovernor = DoinGudGovernor.attach(proxy.address);
    console.log("UPDATED_DoinGudGovernor address is %s", UPDATED_DoinGudGovernor.address);


    // deploy MetaDaoController
    const MetaDaoControllerFactory = await ethers.getContractFactory("MetaDaoController");
    const MetaDaoController = await MetaDaoControllerFactory.deploy(admin);
    console.log("MetaDaoController address:", MetaDaoController.address);

    a  = await ethers.getContractFactory('DoinGudProxy')
    proxy = await a.deploy();
    console.log("proxy address:", proxy.address);
    tx = await proxy.initProxy(MetaDaoController.address);
    console.log("tx is %s", tx);

    const UPDATED_MetaDaoController = MetaDaoController.attach(proxy.address);
    console.log("UPDATED_MetaDaoController address is %s", UPDATED_MetaDaoController.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  