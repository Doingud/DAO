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
};

module.exports = deployFunction;
module.exports.tags = ["AMORToken"];