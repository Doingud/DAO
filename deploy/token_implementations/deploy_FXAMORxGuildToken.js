module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    await deploy('FXAMORxGuild', {
        from: deployer,
        log: true,
        gasLimit: process.env.GAS_LIMIT,
    });

    // Technically we don't need to call init on implementations
    // Leaving it commented out
    // await execute('FXAMORxGuild', {
    //     from: deployer,
    //     gasLimit: process.env.GAS_LIMIT,
    //     log: true,
    //     // Last parameter (Guild controller) can be zero address, because this is implementation contract deployment
    // }, 'init', 'FXAMORxDAOISM', 'FXAXD', ZERO_ADDRESS, ZERO_ADDRESS) 
};

module.exports.tags = ['FXAMORxGuild', 'tokens'];
module.exports.id = ['FXAMORxGuild'];