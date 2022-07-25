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

    const FXAMORxGuildFactory = await ethers.getContractFactory('FXAMORxGuild', setup.roles.root);
    const FXAMORxGuild = await FXAMORxGuildFactory.deploy();
    /*await FXAMORxGuild.init(
      "DoinGud MetaDAO", 
      "FXAMORxGuild", 
      setup.roles.operator.address, 
      ERC20Token.address
    );*/

    const guardianThreshold = 10;
    const dAMORxGuildFactory = await ethers.getContractFactory('dAMORxGuild', setup.roles.root);
    const dAMORxGuild = await dAMORxGuildFactory.deploy();
    /*await dAMORxGuild.init(
      "DoinGud MetaDAO", 
      "DAMORxGuild", 
      setup.roles.operator.address, 
      ERC20Token.address, 
      guardianThreshold
    );*/ 

    const AmorTokenFactory = await ethers.getContractFactory('AMORToken', setup.roles.root);

    const AmorTokenProxyFactory = await ethers.getContractFactory('DoinGudProxy', setup.roles.root);

    // Constants for AmorGuild tokens - Still to be merged
    const AmorGuildTokenFactory = await ethers.getContractFactory('AMORxGuildToken', setup.roles.root);

    /*
    const AmorGuildTokenProxyFactory = await ethers.getContractFactory('AmorGuildProxy', setup.roles.root);
    */
    
    const CloneFactory = await ethers.getContractFactory('GuildCloneFactory', setup.roles.root);

    //  Amor Tokens
    const AmorTokenImplementation = await AmorTokenFactory.deploy();
    const AmorTokenMockUpgrade = await AmorTokenFactory.deploy();
    const AmorTokenProxy = await AmorTokenProxyFactory.deploy();
    
    //  AmorGuild Tokens
    const AmorGuildToken = await AmorGuildTokenFactory.deploy();
    
    /*
    const AmorGuildTokenProxy = await AmorGuildTokenProxyFactory.deploy();
    const AmorGuildCloneFactory = await GuildTokenFactory.deploy(AmorGuildTokenProxy.address, AmorGuildToken.address, AmorTokenProxy.address );
    */
    //  Clone Factory
    const MockFxAmor = await AmorGuildTokenFactory.deploy();
    const MockdAmor = await AmorGuildTokenFactory.deploy();
    const CloneFactoryContract = await CloneFactory.deploy(
      AmorTokenImplementation.address,
      AmorGuildToken.address,
      FXAMORxGuild.address,
      dAMORxGuild.address,
      AmorTokenProxy.address
      );

    const tokens = {
      ERC20Token,
      FXAMORxGuild,
      dAMORxGuild,
      AmorTokenImplementation,
      AmorTokenProxy,
      AmorTokenMockUpgrade,
      AmorGuildToken,
      CloneFactoryContract
      /*
      AmorGuildTokenProxy,
      AmorGuildCloneFactory*/
    };

    setup.tokens = tokens;
    return tokens;
}

module.exports = {
  initialize,
  getTokens,
};
