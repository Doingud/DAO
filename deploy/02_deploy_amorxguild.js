async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    const AMORxGuildToken = await ethers.getContractFactory("AMORxGuildToken");
    const AMORxGuild = await AMORxGuildToken.deploy();
    console.log("AMORxGuild address:", AMORxGuild.address);

    // connect DoinGudProxy
    let a  = await ethers.getContractFactory('DoinGudProxy')
    let b = await a.attach(addresses.DoinGudProxy)
    let DoinGudProxy = await b.deployed();
    console.log("DoinGudProxy address:", addresses.DoinGudProxy);

    let tx = await DoinGudProxy.initProxy(AMORxGuild.address);
    console.log("tx is %s", tx);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  