const { getAddresses } = require('../config');
const addresses = getAddresses();

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    const AvatarxGuild = addresses.Avatar;
    const MetaDao = addresses.MetaDAOController;
    const AMORToken = addresses.AMOR;
    const GuildController_ = addresses.GuildController;
    const AMORxGuild_ = addresses.AMORxGuild;
    const FXAMORxGuild_ = addresses.FXAMORxGuild;

    // connect GuildController
    let a  = await ethers.getContractFactory('GuildControllerVersionForTesting')
    let b = await a.attach(GuildController_)
    let Controller = await b.deployed();
    console.log("GuildController address:", Controller.address);
    console.log("GuildController owner is %s", await Controller.owner());

    let tx = await Controller.init(AvatarxGuild, AMORToken, AMORxGuild_, FXAMORxGuild_, MetaDao);
    console.log("tx is %s", tx);


    // await Controller.donate(1500, AMORToken)
    // await Controller.donate(30, FXAMORxGuild_) 

  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  