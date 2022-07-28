// const deployFunction = async ({ getNamedAccounts, deployments }) => {
//     const { deploy, execute } = deployments;
//     const { root } = await getNamedAccounts();

//     const defaulTaxRate = 0;
//     const admin = '0xdd634602038eBf699581D34d6142a4FB5aa66Ff5';

//     const { address: amorAddress } = await deploy("AMORToken", {
//         from: root,
//         log: true,
//         gasLimit: process.env.GAS_LIMIT,
//     });

//     console.log("root is %s", root);
//     console.log("admin is %s", admin);
//     const AMOR = await ethers.getContract("AMORToken");

//     const AMORDeployed = await AMOR.deploy();

//     await AMORDeployed.init("AMOR Token", "AMOR", admin, defaulTaxRate, admin);

// console.log("AMORDeployed is %s", AMORDeployed.address);

//     // // console.log("tx is %s", tx);

//     // // tx = await AMOR.init("AMOR Token", "AMOR", admin, defaulTaxRate, admin, {
//     // //     from: admin,
//     // //     gasLimit: process.env.GAS_LIMIT,
//     // // });

//     // await execute('AMORToken', {
//     //     from: root, log: true, gasLimit: process.env.GAS_LIMIT,
//     // }, 'init', "AMOR Token", "AMOR", admin, defaulTaxRate, admin)

//     console.log('AMORToken: ', amorAddress);
//     // // await execute('AMORToken', { from: root, log: true, gasLimit: process.env.GAS_LIMIT }, 'init', "AMOR Token", "AMOR", admin, defaulTaxRate, admin)
//     // // await AMOR.init("AMOR Token", "AMOR", addresses.taxController, defaulTaxRate, addresses.multisig);
//     // console.log("tx is %s", tx);
// };

// module.exports = deployFunction;
// module.exports.tags = ["AMORToken"];


async function main() {
    const [deployer] = await ethers.getSigners();
    const admin = '0xdd634602038eBf699581D34d6142a4FB5aa66Ff5';
    const defaulTaxRate = 0;

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());
  
    const AMORToken = await ethers.getContractFactory("AMORToken");
    const AMOR = await AMORToken.deploy();

    const tx = await AMOR.init("AMOR Token", "AMOR", admin, defaulTaxRate, admin);
    console.log("tx is %s", tx);
    console.log("Token address:", AMOR.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  