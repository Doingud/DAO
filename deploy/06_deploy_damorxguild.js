async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // deploy and init dAMORxGuild
    const dAMORxGuildToken = await ethers.getContractFactory("dAMORxGuild");
    const dAMORxGuild = await dAMORxGuildToken.deploy();
    console.log("dAMORxGuild address:", dAMORxGuild.address);

    let a  = await ethers.getContractFactory('DoinGudProxy')
    let proxy = await a.deploy();
    console.log("proxy address:", proxy.address);

    let tx = await proxy.initProxy(dAMORxGuild.address);
    console.log("tx is %s", tx);

    const PROXIED_dAMORxGuild = dAMORxGuild.attach(proxy.address);
    console.log("PROXIED_dAMORxGuild address is %s", PROXIED_dAMORxGuild.address);

    //await for 5 block transactions to ensure deployment before verifying
    await dAMORxGuild.deployTransaction.wait(5);
    console.log("PROXIED_dAMORxGuild_IMPLEMENTATION address is %s", await proxy.viewImplementation());

    //verify
    await hre.run("verify:verify", {
      address: dAMORxGuild.address,
      contract: "contracts/tokens/dAMORxGuild.sol:dAMORxGuild", //Filename.sol:ClassName
    });
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  