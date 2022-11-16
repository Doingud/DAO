async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // deploy and init AMORx, Avatar, Governor for MetaDaoController
    // AMORx
    const AMORxGuildToken = await ethers.getContractFactory("AMORxGuildToken");
    const AMORxGuild = await AMORxGuildToken.deploy();
    console.log("AMORxGuild address:", AMORxGuild.address);
    a  = await ethers.getContractFactory('DoinGudProxy')
    proxy = await a.deploy();
    console.log("proxy address:", proxy.address);
    tx = await proxy.initProxy(AMORxGuild.address);
    console.log("tx is %s", tx);
    const PROXIED_AMORxGuild = AMORxGuild.attach(proxy.address);
    console.log("PROXIED_AMORxGuild address is %s", PROXIED_AMORxGuild.address);

    // Avatar
    const AvatarFactory = await ethers.getContractFactory("AvatarxGuild");
    const Avatar = await AvatarFactory.deploy();
    console.log("Avatar for MetaDaoController address:", Avatar.address);
    let a  = await ethers.getContractFactory('DoinGudProxy')
    let proxy = await a.deploy();
    console.log("Avatar for MetaDaoController proxy address:", proxy.address);
    let tx = await proxy.initProxy(Avatar.address);
    console.log("tx is %s", tx);
    const PROXIED_Avatar = Avatar.attach(proxy.address);
    console.log("PROXIED_Avatar address is %s", PROXIED_Avatar.address);

    // Governor
    const DoinGudGovernorFactory = await ethers.getContractFactory("DoinGudGovernor");
    const DoinGudGovernor = await DoinGudGovernorFactory.deploy();
    console.log("DoinGudGovernor for MetaDaoController address:", DoinGudGovernor.address);
    a  = await ethers.getContractFactory('DoinGudProxy')
    proxy = await a.deploy();
    console.log("proxy address:", proxy.address);
    tx = await proxy.initProxy(DoinGudGovernor.address);
    console.log("tx is %s", tx);
    const PROXIED_DoinGudGovernor = DoinGudGovernor.attach(proxy.address);
    console.log("PROXIED_DoinGudGovernor address is %s", PROXIED_DoinGudGovernor.address);


    // deploy MetaDaoController
    const MetaDaoControllerFactory = await ethers.getContractFactory("MetaDaoController");
    const MetaDaoController = await MetaDaoControllerFactory.deploy();
    console.log("MetaDaoController address:", MetaDaoController.address);

    a  = await ethers.getContractFactory('DoinGudProxy')
    proxy = await a.deploy();
    console.log("proxy address:", proxy.address);

    tx = await proxy.initProxy(MetaDaoController.address);
    console.log("tx is %s", tx);

    const PROXIED_METADAO = MetaDaoController.attach(proxy.address);
    console.log("PROXIED_METADAO address is %s", PROXIED_METADAO.address);

    //await for 5 block transactions to ensure deployment before verifying
    await MetaDaoController.deployTransaction.wait(5);
    console.log("PROXIED_MetaDaoController_IMPLEMENTATION address is %s", await proxy.viewImplementation());

    //verify
    await hre.run("verify:verify", {
      address: MetaDaoController.address,
      contract: "contracts/MetaDaoController.sol:MetaDaoController", //Filename.sol:ClassName
    });
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  