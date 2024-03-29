const { getAddresses } = require('../config');
const addresses = getAddresses();

async function main() {
    const [deployer] = await ethers.getSigners();
    const MetaDao = addresses.MetaDAOControllerProxy;
    const AMOR_ = addresses.AMORTokenProxy;
    const AMORxGuild_ = addresses.AMORxGuildProxy;

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // connect AMOR
    let a  = await ethers.getContractFactory('AMORxGuildToken')
    let b = await a.attach(AMORxGuild_)
    let AMORxGuild = await b.deployed();
    console.log("AMORxGuildToken address:", AMORxGuild.address);
    console.log("AMORxGuildToken owner is %s", await AMORxGuild.owner());

    const tx = await AMORxGuild.init("AMORxMETADAO", "AMORxG", AMOR_, MetaDao);
    console.log("tx is %s", tx);
    console.log("AMORxGuildToken address:", AMORxGuild.address);

    // stake AMOR
    a  = await ethers.getContractFactory('AMORToken')
    b = await a.attach(AMOR_)
    AMORToken = await b.deployed();
    await AMORToken.approve(AMORxGuild.address, 10000)

    const multisig_ = addresses.multisig;
    await AMORxGuild.stakeAmor(multisig_, 10000)

  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  