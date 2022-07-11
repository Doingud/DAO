//  Init the test environment

//const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants');
const { ethers } = require('hardhat');

const initialize = async (accounts) => {
  const setup = {};
  setup.roles = {
    root: accounts[0],
    doingud_multisig: accounts[1],
    user1: accounts[2],
    user2: accounts[3],
    authorizer_adaptor: accounts[5],
    operator: accounts[6],
    staker: accounts[7],
  };

  return setup;
};

const getTokens = async (setup) => {
    const ERC20Factory = await ethers.getContractFactory('ERC20Mock', setup.roles.root);
    const ERC20Token = await ERC20Factory.deploy('ERC20Token', 'ERC20Token'); // test token

    const FXAMORxGuildFactory = await ethers.getContractFactory('FXAMORxGuild');
    const FXAMORxGuild = await FXAMORxGuildFactory.deploy();
    await FXAMORxGuild.init(
      "DoinGud MetaDAO", 
      "FXAMORxGuild", 
      setup.roles.operator.address, 
      ERC20Token.address
    ); 

    const AmorTokenFactory = await ethers.getContractFactory('AMORToken', setup.roles.root);

    const AmorTokenProxyFactory = await ethers.getContractFactory('DoinGudProxy', setup.roles.root);

    /* Constants for AmorGuild tokens - Still to be merged
    const AmorGuildTokenFactory = await ethers.getContractFactory('AMORxGuildToken', setup.roles.root);

    const AmorGuildTokenProxyFactory = await ethers.getContractFactory('AmorGuildProxy', setup.roles.root);

    const GuildTokenFactory = await ethers.getContractFactory('GuildTokenFactory', setup.roles.root);
    */

    //  Amor Tokens
    const AmorTokenImplementation = await AmorTokenFactory.deploy();
    const AmorTokenMockUpgrade = await AmorTokenFactory.deploy();
    const AmorTokenProxy = await AmorTokenProxyFactory.deploy();
    
    /*  AmorGuild Tokens
    const AmorGuildToken = await AmorGuildTokenFactory.deploy();
    const AmorGuildTokenProxy = await AmorGuildTokenProxyFactory.deploy();
    const AmorGuildCloneFactory = await GuildTokenFactory.deploy(AmorGuildTokenProxy.address, AmorGuildToken.address, AmorTokenProxy.address );
    */

    const tokens = {
      ERC20Token,
      FXAMORxGuild,
      AmorTokenImplementation,
      AmorTokenProxy,
      AmorTokenMockUpgrade
      /*AmorGuildToken,
      AmorGuildTokenProxy,
      AmorGuildCloneFactory*/
    };

    setup.tokens = tokens;
    return tokens;
}

module.exports = {
  initialize,
  getTokens
};

module.exports = {
  initialize,
  getTokens,
};
