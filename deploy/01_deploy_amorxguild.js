async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    const AMORxGuildToken = await ethers.getContractFactory("AMORxGuildToken");
    const AMORxGuild = await AMORxGuildToken.deploy();
    console.log("AMORxGuild address:", AMORxGuild.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  