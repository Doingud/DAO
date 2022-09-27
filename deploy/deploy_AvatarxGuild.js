module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    
    await deploy('AvatarxGuild', {
        from: deployer,
        log: true,
        gasLimit: process.env.GAS_LIMIT,
    });

    // TODO: init missing
};

module.exports.tags = ['AvatarxGuild'];
module.exports.id = ['AvatarxGuild'];
module.exports.dependencies = [];