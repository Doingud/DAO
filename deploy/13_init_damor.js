const { getAddresses } = require('../config');
const addresses = getAddresses();

async function main() {
    const [deployer] = await ethers.getSigners();
    const multisig_ = addresses.multisig; // 0xdd634602038eBf699581D34d6142a4FB5aa66Ff5
    const AMORxGuild_ = addresses.AMORxGuild;
    const dAMORxGuild_ = addresses.dAMORxGuild;
    const GUARDIAN_THRESHOLD = 10;

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // connect AMOR
    let a  = await ethers.getContractFactory('dAMORxGuild')
    let b = await a.attach(dAMORxGuild_)
    let DAMOR = await b.deployed();
    console.log("dAMORxGuild address:", DAMOR.address);
    console.log("dAMORxGuild owner is %s", await DAMOR.owner());

    // const tx = await DAMOR.init("DoinGud dAMOR", "DAMOR", multisig_, AMORxGuild_, GUARDIAN_THRESHOLD);
    // console.log("tx is %s", tx);
    // console.log("DAMOR address:", DAMOR.address);

    const AMOR_ = addresses.AMOR;
    a  = await ethers.getContractFactory('AMORToken')
    b = await a.attach(AMOR_)
    AMORToken = await b.deployed();
    await AMORToken.approve(DAMOR.address, 10000)
    await DAMOR.stake(70, 36288000)
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  