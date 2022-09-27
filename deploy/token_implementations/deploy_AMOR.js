module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    await deploy('AMORToken', {
        from: deployer,
        log: true,
        gasLimit: process.env.GAS_LIMIT,
    });

    // Technically we don't need to call init on implementations
    // Leaving it commented out
    // await execute('AMORToken', {
    //     from: deployer,
    //     gasLimit: process.env.GAS_LIMIT,
    //     log: true,
    // }, 'init', 'AMOR Token', 'AMOR', taxController, 0, multisig)
};

module.exports.tags = ['AMORToken', 'tokens'];
module.exports.id = ['AMORToken'];