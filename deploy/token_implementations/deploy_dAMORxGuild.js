module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    await deploy('dAMORxGuild', {
        from: deployer,
        log: true,
        gasLimit: process.env.GAS_LIMIT,
    });

    // Technically we don't need to call init on implementations
    // Leaving it commented out
    // await execute('dAMORxGuild', {
    //     from: deployer,
    //     gasLimit: process.env.GAS_LIMIT,
    //     log: true,
    //     // Last parameter (Guild controller) can be zero address, because this is implementation contract deployment
    // }, 'init', 'dAMOR', 'DAMOR', ZERO_ADDRESS, ZERO_ADDRESS, 0) 
};

module.exports.tags = ['dAMORxGuild', 'tokens'];
module.exports.id = ['dAMORxGuild'];