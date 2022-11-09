async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // deploy guild controller
    const GuildControllerFactory = await ethers.getContractFactory("GuildControllerVersionForTesting");
    const GuildController = await GuildControllerFactory.deploy();
    console.log("GuildController address:", GuildController.address);

    let a  = await ethers.getContractFactory('DoinGudProxy')
    let proxy = await a.deploy();
    console.log("proxy address:", proxy.address);

    let tx = await proxy.initProxy(GuildController.address);
    console.log("tx is %s", tx);

    const PROXIED_GuildController = GuildController.attach(proxy.address);
    console.log("PROXIED_GuildController address is %s", PROXIED_GuildController.address);
  
    //await for 5 block transactions to ensure deployment before verifying
    await GuildController.deployTransaction.wait(5);
    console.log("PROXIED_GuildController_IMPLEMENTATION address is %s", await proxy.viewImplementation());

    //verify
    await hre.run("verify:verify", {
      address: GuildController.address,
      contract: "contracts/test/GuildControllerVersionForTesting.sol:GuildControllerVersionForTesting", //Filename.sol:ClassName
    });
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  