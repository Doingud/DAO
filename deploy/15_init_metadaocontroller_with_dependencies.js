const { getAddresses } = require('../config');
const addresses = getAddresses();

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    const MetaDao = addresses.MetaDAOControllerProxy;
    const GuildFactory = addresses.GuildFactory;
    const AMOR_ = addresses.AMORTokenProxy;
    const AMORxGuild_ = addresses.AMORx_MetaDAOController;
    const multisig_ = addresses.multisig;
    const Governor_ = addresses.Governor_MetaDAOController;
    const Avatar_ = addresses.Avatar_MetaDAOController;
    const initialGuardian = addresses.multisig;
 
    // connect AMOR
    let a  = await ethers.getContractFactory('AMORxGuildToken')
    let b = await a.attach(AMORxGuild_)
    let AMORxGuild = await b.deployed();
    console.log("AMORxGuildToken address:", AMORxGuild.address);
    console.log("AMORxGuildToken owner is %s", await AMORxGuild.owner());

    tx = await AMORxGuild.init("AMORxMETADAO", "AMORxG", AMOR_, MetaDao);
    console.log("tx is %s", tx);
    console.log("AMORxGuildToken address:", AMORxGuild.address);

    // connect AvatarxGuild
    a  = await ethers.getContractFactory('AvatarxGuild')
    b = await a.attach(Avatar_)
    let AvatarxGuild = await b.deployed();
    console.log("AvatarxGuild address:", AvatarxGuild.address);

    tx = await AvatarxGuild.init(multisig_, Governor_);
    console.log("tx is %s", tx);

    // connect Governor
    a  = await ethers.getContractFactory('DoinGudGovernor');
    b = await a.attach(Governor_)
    let Governor = await b.deployed();
    console.log("Governor address:", Governor.address);


    tx = await Governor.init(Avatar_, initialGuardian);
    console.log("tx is %s", tx);
    console.log("Governor address:", Governor.address);

    // connect MetaDaoController
    a  = await ethers.getContractFactory('MetaDaoController')
    b = await a.attach(MetaDao)
    let MetaDaoController = await b.deployed();
    console.log("MetaDaoController address:", MetaDaoController.address);
    console.log("MetaDaoController owner is %s", await MetaDaoController.owner());

    tx = await MetaDaoController.init(AMOR_, GuildFactory, AvatarxGuild);
    console.log("tx is %s", tx);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  