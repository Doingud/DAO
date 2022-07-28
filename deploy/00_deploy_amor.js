const { getAddresses } = require('../config');

const deployFunction = async ({ getNamedAccounts, deployments }) => {
    const { deploy } = deployments;
    const { root } = await getNamedAccounts();

    const addresses = getAddresses();

    await deploy("AMORToken", {
        from: root,
        args: [],
        log: true,
        gasLimit: process.env.GAS_LIMIT,
    });

    const AMOR = await ethers.getContract("AMORToken");
    await AMOR.init(["AMOR Token", "AMOR", addresses.taxController, 500, addresses.multisig]);
};

module.exports = deployFunction;
module.exports.tags = ["AMORToken"];
