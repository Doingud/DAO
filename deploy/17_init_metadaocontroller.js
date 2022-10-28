const { getAddresses } = require('../config');
const addresses = getAddresses();

async function main() {
    const [deployer] = await ethers.getSigners();
    const AvatarxGuild = addresses.Avatar;

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    const MetaDao = addresses.MetaDAOController;
    const GuildFactory = addresses.GuildFactory;
    const AMORToken = addresses.AMOR;

    // connect MetaDaoController
    let a  = await ethers.getContractFactory('MetaDaoController')
    let b = await a.attach(MetaDao)
    let MetaDaoController = await b.deployed();
    console.log("MetaDaoController address:", MetaDaoController.address);
    console.log("MetaDaoController owner is %s", await MetaDaoController.owner());

    let tx = await MetaDaoController.init(AMORToken, GuildFactory, AvatarxGuild);
    console.log("tx is %s", tx);
  
    await MetaDaoController.createGuild(GuildController_.address, 'MetaDao GUILD 1', 'MG1');

    // generate data to create first guild
    const GuildController_ = addresses.GuildController;
    let data = MetaDaoController.interface.encodeFunctionData('addExternalGuild', [GuildController_.address]);
    console.log("data to create first guild is %s", data);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  