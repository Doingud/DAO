async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    const AMORxGuildToken = await ethers.getContractFactory("AMORxGuildToken");
    const AMORxGuild = await AMORxGuildToken.deploy();
    console.log("AMORxGuild address:", AMORxGuild.address);

    let a  = await ethers.getContractFactory('DoinGudProxy')
    let proxy = await a.deploy();
    console.log("proxy address:", proxy.address);

    let tx = await proxy.initProxy(AMORxGuild.address);
    console.log("tx is %s", tx);

    const PROXIED_AMORxGuild = AMORxGuild.attach(proxy.address);
    console.log("PROXIED_AMORxGuild address is %s", PROXIED_AMORxGuild.address);
  
    //await for 5 block transactions to ensure deployment before verifying
    await AMORxGuild.deployTransaction.wait(5);
    console.log("PROXIED_AMORxGuild_IMPLEMENTATION address is %s", await proxy.viewImplementation());

    //verify
    await hre.run("verify:verify", {
      address: AMORxGuild.address,
      contract: "contracts/tokens/AMORxGuild.sol:AMORxGuildToken", //Filename.sol:ClassName
    });
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  