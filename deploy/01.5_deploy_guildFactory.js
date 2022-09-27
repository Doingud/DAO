const { getAddresses} = require('../config')

const addresses = getAddresses();

async function main() {
    const [deployer] = await ethers.getSigners();
    const multisig_ = addresses.multisig; // 0xdd634602038eBf699581D34d6142a4FB5aa66Ff5
    const AMOR_ = addresses.AMOR;
    console.log("AMOR_ is %s", AMOR_);
    const AMORxGuild_ = '0x3D0641b6f4B938af344FB81b70A2b0bE46f5feca';//addresses.AMORxGuild; //contractAddresses[AMORxGuild];
    console.log("AMORxGuild is %s", addresses.AMORxGsuild);
    console.log("AMORxGuild_ is %s", AMORxGuild_);
    const FXAMORxGuild_ = '0xfD678C57Bd4518ff4d5F0de863724BC03759E37a';//addresses.FXAMORxGuild;
    const dAMORxGuild_ = '0x78abed850AD0f25eb9129F4971915277B17beF1a';//addresses.dAMORxGuild;
    const DoinGudProxy_ = '0x5840C0cdb9c13F14C36bc58f53f11AEB4d844138';//addresses.DoinGudProxy;
    const GuildController_ = '0xB19bFADCca6b4AbE42d7e362B629a2632473aDBE';//addresses.GuildController;
    const MetaDAOController_ = '0xdFA7E41fc1Babea56E85F65BBA006E38cFb77925';//addresses.MetaDAOController;

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
        MetaDAOController_,
        multisig_
    );

    console.log("guildFactory address:", guildFactory.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  