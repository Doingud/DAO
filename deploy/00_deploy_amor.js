const { getAddresses } = require("../config");

const deployFunction = async ({ getNamedAccounts, deployments }) => {
    const { deploy } = deployments;
    const { root } = await getNamedAccounts();

    const addresses = getAddresses();

    await deploy("AMORToken", {
        contract: "AMORToken",
        from: root,
        args: ["AMOR Token", "AMOR", addresses.taxController, 500, addresses.multisig],
        log: true,
        gasLimit: process.env.GAS_LIMIT,
    });
    // await setup.tokens.AmorTokenImplementation.init(
    //     AMOR_TOKEN_NAME, 
    //     AMOR_TOKEN_SYMBOL, 
    //     setup.roles.authorizer_adaptor.address, //taxController
    //     TAX_RATE,
    //     setup.roles.root.address // multisig
    //   );

};

module.exports = deployFunction;
module.exports.tags = ["AMORToken"];


const { getAddresses, tags: { VoterProxy, BalDepositor, D2DBal, deployment } } = require('../config');

const deployFunction = async ({ getNamedAccounts, deployments }) => {
  const { deploy, execute } = deployments;
  const { root } = await getNamedAccounts();

  const addresses = getAddresses();

  const voterProxy = await deployments.get('VoterProxy');

  const { address: d2dBalAddress } = await deploy("D2DBal", {
    from: root,
    log: true,
    gasLimit: process.env.GAS_LIMIT,
  })

  const { address: balDepositor } = await deploy("BalDepositor", {
    from: root,
    args: [addresses.wethBal, addresses.veBal, voterProxy.address, d2dBalAddress],
    log: true,
    gasLimit: process.env.GAS_LIMIT,
  });

  // Owner of D2DBal should be BalDepositor
  await execute('D2DBal', { from: root, log: true, gasLimit: process.env.GAS_LIMIT }, 'transferOwnership', balDepositor)
};

module.exports = deployFunction;
module.exports.tags = [BalDepositor, D2DBal, deployment];
module.exports.dependencies = [VoterProxy];