const { getAddresses } = require('../config');
const addresses = getAddresses();

async function main() {
    const [deployer] = await ethers.getSigners();
    const admin = addresses.multisig; // 0xdd634602038eBf699581D34d6142a4FB5aa66Ff5

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    const GuildFactory = '0xc628c2Af0Af6f3E9891871b59933e2269D697270';
    const AMOR = '0x9E4A13E5c30e14AA96A0bC147A106e4166248343';

    // connect MetaDaoController
    let a  = await ethers.getContractFactory('MetaDaoController')
    let b = await a.attach('0xdFA7E41fc1Babea56E85F65BBA006E38cFb77925')
    let MetaDaoController = await b.deployed();
    console.log("MetaDaoController address:", MetaDaoController.address);


    const tx = await MetaDaoController.init(AMOR, GuildFactory);
    console.log("tx is %s", tx);
    console.log("MetaDaoController address:", MetaDaoController.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  