const { getAddresses } = require('../../config');
const addresses = getAddresses();

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    const AvatarxGuild = addresses.AvatarProxy;
    const MetaDao = addresses.MetaDAOControllerProxy;
    const AMORToken = addresses.AMORTokenProxy;
    const GuildController_ = addresses.GuildControllerProxy;
    const AMORxGuild_ = addresses.AMORxGuildProxy;
    const FXAMORxGuild_ = addresses.FXAMORxGuildProxy;

    // connect GuildController
    let a  = await ethers.getContractFactory('GuildControllerVersionForTesting')
    let b = await a.attach(GuildController_)
    let Controller = await b.deployed();
    console.log("GuildController address:", Controller.address);
    console.log("GuildController owner is %s", await Controller.owner());

    let tx = await Controller.init(AvatarxGuild, AMORToken, AMORxGuild_, FXAMORxGuild_, MetaDao);
    console.log("tx is %s", tx);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  