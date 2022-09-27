module.exports = async ({ getNamedAccounts, deployments }) => {
    const { execute } = deployments;
    const { deployer } = await getNamedAccounts();

    const amor = await deployments.get('AMORToken');

    // We need to initialize this one
    await execute('DoinGudProxy', {
        from: deployer,
        gasLimit: process.env.GAS_LIMIT,
        log: true,
    }, 'initProxy', amor.address) 

    // Return true indicates that this script only once
    return true; 
};

module.exports.tags = ['DoinGudProxyInit'];
module.exports.id = ['DoinGudProxyInit'];
module.exports.dependencies = ['DoinGudProxy', 'AMORToken'];