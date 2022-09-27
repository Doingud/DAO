module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    await deploy('DoinGudProxy', {
        from: deployer,
        log: true,
        gasLimit: process.env.GAS_LIMIT,
    });
};

module.exports.tags = ['DoinGudProxy'];
module.exports.id = ['DoinGudProxy'];
module.exports.dependencies = [];