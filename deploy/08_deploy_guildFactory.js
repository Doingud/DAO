const { getAddresses} = require('../config')

const addresses = getAddresses();

async function main() {
    const [deployer] = await ethers.getSigners();
    const AMOR_ = addresses.AMOR;
    const AMORxGuild_ = addresses.AMORxGuild;
    const FXAMORxGuild_ = addresses.FXAMORxGuild;
    const dAMORxGuild_ = addresses.dAMORxGuild;
    const DoinGudProxy_ = addresses.DoinGudProxy;
    const GuildController_ = addresses.GuildController;
    const Governor_ = addresses.Governor;
    const AvatarxGuild_ = addresses.Avatar;
    const MetaDAOController_ = addresses.MetaDAOController;

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // deploy guildFactory
    const guildFactoryFactory = await ethers.getContractFactory("GuildFactory");
    const guildFactory = await guildFactoryFactory.deploy(
        AMOR_,
        AMORxGuild_,
        FXAMORxGuild_,
        dAMORxGuild_,
        DoinGudProxy_,
        GuildController_,
        Governor_,
        AvatarxGuild_,
        MetaDAOController_
    );

    console.log("guildFactory address:", guildFactory.address);

    //await for 5 block transactions to ensure deployment before verifying
    await guildFactory.deployTransaction.wait(5);

    //verify
    await hre.run("verify:verify", {
      address: guildFactory.address,
      contract: "contracts/GuildFactory.sol:GuildFactory", //Filename.sol:ClassName
      constructorArguments: [
        AMOR_,
        AMORxGuild_,
        FXAMORxGuild_,
        dAMORxGuild_,
        DoinGudProxy_,
        GuildController_,
        Governor_,
        AvatarxGuild_,
        MetaDAOController_
      ],
    });
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  