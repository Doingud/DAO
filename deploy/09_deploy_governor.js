async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());
      
    const DoinGudGovernorFactory = await ethers.getContractFactory("DoinGudGovernor");
    const DoinGudGovernor = await DoinGudGovernorFactory.deploy();
    console.log("DoinGudGovernor address:", DoinGudGovernor.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  