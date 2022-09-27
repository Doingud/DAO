const { getAddresses } = require('../ config')

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { execute } = deployments;
    const { deployer } = await getNamedAccounts();

    const { snapshot } = getAddresses()

    const amor = await deployments.get('AMORToken');
    const avatarxGuild = await deployments.get('AvatarxGuild');

    // We need to initialize this one
    await execute('DoinGudGovernor', {
        from: deployer,
        gasLimit: process.env.GAS_LIMIT,
        log: true,
    }, 'init', amor.address, snapshot, avatarxGuild.address) 

    // Return true indicates that this script only once
    return true; 
};

module.exports.tags = ['DoinGudGovernorInit'];
module.exports.id = ['DoinGudGovernorInit'];
module.exports.dependencies = ['DoinGudGovernor', 'AvatarxGuild'];