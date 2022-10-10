async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());
      
    const DoinGudGovernorFactory = await ethers.getContractFactory("DoinGudGovernor");
    const DoinGudGovernor = await DoinGudGovernorFactory.deploy();
    console.log("DoinGudGovernor address:", DoinGudGovernor.address);

    let a  = await ethers.getContractFactory('DoinGudProxy')
    let proxy = await a.deploy();
    console.log("proxy address:", proxy.address);

    let tx = await proxy.initProxy(DoinGudGovernor.address);
    console.log("tx is %s", tx);

    const UPDATED_DoinGudGovernor = DoinGudGovernor.attach(proxy.address);
    console.log("UPDATED_DoinGudGovernor address is %s", UPDATED_DoinGudGovernor.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  