async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // deploy guild controller
    const GuildControllerFactory = await ethers.getContractFactory("GuildController");
    const GuildController = await GuildControllerFactory.deploy();
    console.log("GuildController address:", GuildController.address);

    let a  = await ethers.getContractFactory('DoinGudProxy')
    let proxy = await a.deploy();
    console.log("proxy address:", proxy.address);

    let tx = await proxy.initProxy(GuildController.address);
    console.log("tx is %s", tx);

    const UPDATED_GuildController = GuildController.attach(proxy.address);
    console.log("UPDATED_GuildController address is %s", UPDATED_GuildController.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  