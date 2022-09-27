module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    await deploy('AMORxGuildToken', {
        from: deployer,
        log: true,
        gasLimit: process.env.GAS_LIMIT,
    });

    // Technically we don't need to call init on implementations
    // Leaving it commented out
    // await execute('AMORxGuildToken', {
    //     from: deployer,
    //     gasLimit: process.env.GAS_LIMIT,
    //     log: true,
    //     // Addresses can be ZERO_ADDRESS can be zero address, because this is implementation contract deployment
    // }, 'init', 'AMORxDAOISM', 'AXD', ZERO_ADDRESS, ZERO_ADDRESS) 
};

module.exports.tags = ['AMORxGuildToken', 'tokens'];
module.exports.id = ['AMORxGuildToken'];