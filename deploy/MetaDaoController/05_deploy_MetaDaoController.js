module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    await deploy('MetaDaoController', {
        from: deployer,
        log: true,
        gasLimit: process.env.GAS_LIMIT,
        args: [deployer],
    });

    await deploy('MetaDaoProxy', {
        from: deployer,
        log: true,
        gasLimit: process.env.GAS_LIMIT,
        contract: 'DoinGudProxy',
        args: []
    })
};

module.exports.tags = ['MetaDaoController'];
module.exports.id = ['MetaDaoController'];