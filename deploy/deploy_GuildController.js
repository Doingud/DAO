module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    
    await deploy('GuildController', {
        from: deployer,
        log: true,
        gasLimit: process.env.GAS_LIMIT,
    });
};

module.exports.tags = ['GuildController'];
module.exports.id = ['GuildController'];
module.exports.dependencies = ['tokens', 'MetaDaoController'];