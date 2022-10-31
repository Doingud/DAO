const { getAddresses } = require('../config');
const addresses = getAddresses();

async function main() {
    const [deployer] = await ethers.getSigners();
    const AMORxGuild_ = addresses.AMORxGuild;
    const Avatar_ = addresses.Avatar;
    const Governor_ = addresses.Governor;
    const initialGuardian = addresses.multisig;

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // connect Governor
    let a  = await ethers.getContractFactory('DoinGudGovernor')
    let b = await a.attach(Governor_)
    let Governor = await b.deployed();
    console.log("Governor address:", Governor.address);


    let tx = await Governor.init(AMORxGuild_, Avatar_, initialGuardian);
    console.log("tx is %s", tx);
    console.log("Governor address:", Governor.address);


    // IMPACT_MAKERS = [multisig_.address];
    // IMPACT_MAKERS_WEIGHTS = [20];
    // let setImpactMakersData = Governor.interface.encodeFunctionData("setImpactMakers", [IMPACT_MAKERS, IMPACT_MAKERS_WEIGHTS]);
    // await metaHelper([Governor.address], [0], [setImpactMakersData], [user1, user2], authorizer_adaptor, Avatar_.address, GUILD_ONE_GOVERNORXGUILD.address)
}
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  