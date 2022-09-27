const { ethers } = require("hardhat");

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { execute } = deployments;
    const { deployer } = await getNamedAccounts();

    const guildFactory = await deployments.get('GuildFactory');
    // This is AMOR token
    const doinGudProxy = await deployments.get('DoinGudProxy');
    const metaDaoControlerImplementation = await deployments.get('MetaDaoController')
    const metaDaoProxy = await deployments.get('MetaDaoProxy')

    // Initialize proxy and attach meta dao controller implementation
    await execute('MetaDaoProxy', {
        from: deployer,
        gasLimit: process.env.GAS_LIMIT,
        log: true,
    }, 'initProxy', metaDaoControlerImplementation.address)

    // Initialize meta dao controller on proxy contract
    const factory = await ethers.getContractFactory('MetaDaoController')
    const contract = factory.attach(metaDaoProxy.address)
    const tx = await contract.init(doinGudProxy.address, guildFactory.address)
    await tx.wait();
    
    // Return true indicates that this script only once
    return true; 
};

module.exports.tags = ['MetaDaoControllerInit'];
module.exports.id = ['MetaDaoControllerInit'];
module.exports.dependencies = ['MetaDaoController', 'DoinGudProxyInit', 'GuildFactory'];