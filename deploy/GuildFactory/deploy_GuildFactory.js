const { getAddresses } = require('../../ config')

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    const { multisig } = await getAddresses();

    const amor = await deployments.get('AMORToken')
    const amorXGuild = await deployments.get('AMORxGuildToken')
    const fxAmorXGuild = await deployments.get('FXAMORxGuild')
    const dAmorXGuild = await deployments.get('dAMORxGuild')
    const doinGudProxy = await deployments.get('DoinGudProxy')
    const guildController = await deployments.get('GuildController')
    const metaDaoController = await deployments.get('MetaDaoController')

    // Factory is initialized with implementation contracts, and doinGudProxy (proxy contract) because it is cloning them
    const args = [amor.address, amorXGuild.address, fxAmorXGuild.address, dAmorXGuild.address, doinGudProxy.address, guildController.address, metaDaoController.address, multisig]

    await deploy('GuildFactory', {
        from: deployer,
        log: true,
        gasLimit: process.env.GAS_LIMIT,
        args,
    });
};

module.exports.tags = ['GuildFactory'];
module.exports.id = ['GuildFactory'];
module.exports.dependencies = ['tokens', 'DoinGudProxy', 'GuildController', 'MetaDaoController'];