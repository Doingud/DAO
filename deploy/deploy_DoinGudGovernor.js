module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    const doinGudProxy = await deployments.get('DoinGudProxy')
    
    await deploy('DoinGudGovernor', {
        from: deployer,
        log: true,
        gasLimit: process.env.GAS_LIMIT,
        args: [doinGudProxy.address]
    });
};

module.exports.tags = ['DoinGudGovernor'];
module.exports.id = ['DoinGudGovernor'];
module.exports.dependencies = ['DoinGudProxy'];