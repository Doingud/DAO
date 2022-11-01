async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // deploy DoinGudProxy
    const DoinGudProxyFactory = await ethers.getContractFactory("DoinGudProxy");
    const DoinGudProxy = await DoinGudProxyFactory.deploy();
    console.log("DoinGudProxy address:", DoinGudProxy.address);

    //await for 5 block transactions to ensure deployment before verifying
    await DoinGudProxy.deployTransaction.wait(5);

    //verify
    await hre.run("verify:verify", {
      address: DoinGudProxy.address,
      contract: "contracts/DoinGudProxy.sol:DoinGudProxy", //Filename.sol:ClassName
    });
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  