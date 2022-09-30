async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // deploy guild controller
    const GuildControllerFactory = await ethers.getContractFactory("GuildController");
    const GuildController = await GuildControllerFactory.deploy();
    console.log("GuildController address:", GuildController.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  