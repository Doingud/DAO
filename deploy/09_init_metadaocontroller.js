async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    const MetaDao = addresses.MetaDaoController;
    const GuildFactory = addresses.GuildFactory;
    const AMOR = addresses.AMOR;

    // connect MetaDaoController
    let a  = await ethers.getContractFactory('MetaDaoController')
    let b = await a.attach(MetaDao)
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
  