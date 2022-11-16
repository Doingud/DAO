async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // deploy FXAMORxGuild
    const FXAMORxGuildToken = await ethers.getContractFactory("FXAMORxGuild");
    const FXAMORxGuild = await FXAMORxGuildToken.deploy();
    console.log("FXAMORxGuild address:", FXAMORxGuild.address);
  
    let a  = await ethers.getContractFactory('DoinGudProxy')
    let proxy = await a.deploy();
    console.log("proxy address:", proxy.address);

    let tx = await proxy.initProxy(FXAMORxGuild.address);
    console.log("tx is %s", tx);

    const UPDATED_FXAMORxGuild = FXAMORxGuild.attach(proxy.address);
    console.log("UPDATED_FXAMORxGuild address is %s", UPDATED_FXAMORxGuild.address);
  
    //await for 5 block transactions to ensure deployment before verifying
    await FXAMORxGuild.deployTransaction.wait(5);

    //verify
    await hre.run("verify:verify", {
      address: FXAMORxGuild.address,
      contract: "contracts/FXAMORxGuildToken.sol:FXAMORxGuild", //Filename.sol:ClassName
    });
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  