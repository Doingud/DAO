async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());
  
    const ERC20MockFactory = await ethers.getContractFactory("ERC20Mock");
    const ERC20Mock = await ERC20MockFactory.deploy("ERC20 Mock Token", "ERC20Mock");

    console.log("ERC20Mock address:", ERC20Mock.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  