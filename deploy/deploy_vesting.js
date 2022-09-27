const { getAddresses } = require("../ config");

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    
    const { multisig } = getAddresses();

    const amor = await deployments.get('DoinGudProxy');

    await deploy('Vesting', {
        from: deployer,
        log: true,
        gasLimit: process.env.GAS_LIMIT,
        args: [multisig, amor.address]
    });
};

module.exports.tags = ['Vesting'];
module.exports.id = ['Vesting'];
module.exports.dependencies = ['DoinGudProxy'];