async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());
  
    const AMORToken = await ethers.getContractFactory("AMORToken");
    const AMOR = await AMORToken.deploy();
    console.log("AMOR address:", AMOR.address);

    let a  = await ethers.getContractFactory('DoinGudProxy')
    let proxy = await a.deploy();
    console.log("proxy address:", proxy.address);

    let tx = await proxy.initProxy(AMOR.address);
    console.log("tx is %s", tx);

    const PROXIED_AMOR = AMOR.attach(proxy.address);
    console.log("PROXIED_AMOR address is %s", PROXIED_AMOR.address);

    //await for 5 block transactions to ensure deployment before verifying
    await AMOR.deployTransaction.wait(5);
    console.log("PROXIED_AMOR_IMPLEMENTATION address is %s", await proxy.viewImplementation());

    //verify
    await hre.run("verify:verify", {
      address: AMOR.address,
      contract: "contracts/tokens/AMOR.sol:AMORToken", //Filename.sol:ClassName
    });
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  