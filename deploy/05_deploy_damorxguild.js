async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // deploy and init dAMORxGuild
    const dAMORxGuildToken = await ethers.getContractFactory("dAMORxGuild");
    const dAMORxGuild = await dAMORxGuildToken.deploy();
    console.log("dAMORxGuild address:", dAMORxGuild.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  