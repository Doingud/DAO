async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());
      
    const DoinGudGovernorFactory = await ethers.getContractFactory("DoinGudGovernorVersionForTesting");
    const DoinGudGovernor = await DoinGudGovernorFactory.deploy();
    console.log("DoinGudGovernor address:", DoinGudGovernor.address);

    let a  = await ethers.getContractFactory('DoinGudProxy')
    let proxy = await a.deploy();
    console.log("proxy address:", proxy.address);

    let tx = await proxy.initProxy(DoinGudGovernor.address);
    console.log("tx is %s", tx);

    const PROXIED_DoinGudGovernor = DoinGudGovernor.attach(proxy.address);
    console.log("PROXIED_DoinGudGovernor address is %s", PROXIED_DoinGudGovernor.address);

    //await for 5 block transactions to ensure deployment before verifying
    await DoinGudGovernor.deployTransaction.wait(5);
    console.log("PROXIED_DoinGudGovernor_IMPLEMENTATION address is %s", await proxy.viewImplementation());

    //verify
    await hre.run("verify:verify", {
      address: DoinGudGovernor.address,
      contract: "contracts/test/DoinGudGovernorVersionForTesting.sol:DoinGudGovernorVersionForTesting", //Filename.sol:ClassName
    });
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  