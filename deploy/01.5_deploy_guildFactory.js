const { getAddresses,
        AMOR,
        AMORxGuild,
        FXAMORxGuild,
        dAMORxGuild,
        DoinGudProxy,
        GuildController,
        MetaDAOController,
        multisig
} = require('../config');
const addresses = getAddresses();

async function main() {
    const [deployer] = await ethers.getSigners();
    const multisig_ = addresses[multisig]; // 0xdd634602038eBf699581D34d6142a4FB5aa66Ff5
    const AMOR_ = addresses[AMOR];
    const AMORxGuild_ = addresses[AMORxGuild];
    const FXAMORxGuild_ = addresses[FXAMORxGuild];
    const dAMORxGuild_ = addresses[dAMORxGuild];
    const DoinGudProxy_ = addresses[DoinGudProxy];
    const GuildController_ = addresses[GuildController];
    const MetaDAOController_ = addresses[MetaDAOController];

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // deploy guildFactory
    const guildFactoryFactory = await ethers.getContractFactory("GuildFactory");
    const guildFactory = await guildFactoryFactory.deploy(
        // admin,admin,admin,admin,admin,admin,admin,admin // works with this
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

    // // connect MetaDaoController
    // let a  = await ethers.getContractFactory('MetaDaoController')
    // let b = await a.attach('0xdFA7E41fc1Babea56E85F65BBA006E38cFb77925')
    // let MetaDaoController = await b.deployed();
    // console.log("MetaDaoController address:", MetaDaoController.address);



    // const tx = await MetaDaoController.init("AMORxGuild Token", "AMORxGuild", deployedAMOR, GuildController);
    // console.log("tx is %s", tx);
    // console.log("MetaDaoController address:", MetaDaoController.address);


    // init MetaDaoController (need guildFactory)
    // init guild controller
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  