const { getAddresses } = require('../config');
const addresses = getAddresses();

async function main() {
    const [deployer] = await ethers.getSigners();
    const AvatarxGuild_ = addresses.Avatar;
    const Governor_ = addresses.Governor;
    const MetaDao = addresses.MetaDAOController;
    const reality = addresses.multisig;
    const initialGuardian = addresses.multisig;

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // connect MetaDaoController
    let a  = await ethers.getContractFactory('MetaDaoController')
    let b = await a.attach(MetaDao)
    let MetaDaoController = await b.deployed();
    console.log("MetaDaoController address:", MetaDaoController.address);

    a  = await ethers.getContractFactory('DoinGudGovernor')
    b = await a.attach(Governor_)
    Governor = await b.deployed();
    console.log("Governor address:", Governor.address);

    a  = await ethers.getContractFactory('AvatarxGuild')
    b = await a.attach(AvatarxGuild_)
    AvatarxGuild = await b.deployed();
    console.log("AvatarxGuild address:", AvatarxGuild.address);

    // await MetaDaoController.createGuild(reality, initialGuardian, 'MetaDao GUILD 1', 'MG1'); // must be via avatar

    // governor executeProposal --> avatar.executeProposal --> MetaDaoController.createGuild
    // // generate data to create first guild
    let proposal = MetaDaoController.interface.encodeFunctionData('createGuild', [reality, initialGuardian, 'MetaDao GUILD 1', 'MG1']);
    console.log(1);

    await AvatarxGuild.proposeAfterVote([MetaDaoController.address], [0], [proposal]);
    let proposalId = await Governor.hashProposal([MetaDaoController.address], [0], [proposal]);
    // await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
    // time.increase(time.duration.days(5));

    await Governor.castVote(proposalId, true);
    console.log(2);

    // await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
    // time.increase(time.duration.days(10));
    await Governor.execute([MetaDaoController.address], [0], [proposal]);
    console.log(3);

    // let data = MetaDaoController.interface.encodeFunctionData('addExternalGuild', [GuildController_.address]);
    // console.log("data to create first guild is %s", data);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  