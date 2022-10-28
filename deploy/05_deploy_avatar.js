async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());
      
    const AvatarxGuildFactory = await ethers.getContractFactory("AvatarxGuild");
    const AvatarxGuild = await AvatarxGuildFactory.deploy();

    console.log("AvatarxGuild address:", AvatarxGuild.address);

    let a  = await ethers.getContractFactory('DoinGudProxy')
    let proxy = await a.deploy();
    console.log("proxy address:", proxy.address);

    let tx = await proxy.initProxy(AvatarxGuild.address);
    console.log("tx is %s", tx);
  
    const UPDATED_AvatarxGuild = AvatarxGuild.attach(proxy.address);
    console.log("UPDATED_AvatarxGuild address is %s", UPDATED_AvatarxGuild.address);

    //await for 5 block transactions to ensure deployment before verifying
    await AvatarxGuild.deployTransaction.wait(5);

    //verify
    await hre.run("verify:verify", {
      address: AvatarxGuild.address,
      contract: "contracts/AvatarxGuild.sol:AvatarxGuild", //Filename.sol:ClassName
    });
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  