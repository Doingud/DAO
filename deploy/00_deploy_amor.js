const { getAddresses, multisig } = require('../../config');
const addresses = getAddresses();

async function main() {
    const [deployer] = await ethers.getSigners();
    const admin = addresses[multisig]; // 0xdd634602038eBf699581D34d6142a4FB5aa66Ff5
    const defaulTaxRate = 0;

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());
  
    const AMORToken = await ethers.getContractFactory("AMORToken");
    const AMOR = await AMORToken.deploy();

    const tx = await AMOR.init("AMOR Token", "AMOR", admin, defaulTaxRate, admin);
    console.log("tx is %s", tx);
    console.log("AMOR address:", AMOR.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  