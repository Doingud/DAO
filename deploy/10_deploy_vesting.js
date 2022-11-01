const { getAddresses } = require('../config');
const addresses = getAddresses();

async function main() {
    const [deployer] = await ethers.getSigners();
    const AMOR_ = addresses.AMOR;
    const MetaDAOController_ = addresses.MetaDAOController;

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());
      
    const VestingFactory = await ethers.getContractFactory("Vesting");
    const Vesting = await VestingFactory.deploy(MetaDAOController_, AMOR_);
    console.log("Vesting address:", Vesting.address);

    //await for 5 block transactions to ensure deployment before verifying
    await Vesting.deployTransaction.wait(5);

    //verify
    await hre.run("verify:verify", {
      address: Vesting.address,
      contract: "contracts/Vesting.sol:Vesting", //Filename.sol:ClassName
      constructorArguments: [MetaDAOController_, AMOR_],
    });
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  