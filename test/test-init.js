//  Init the test environment

const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants');
const { ethers } = require('hardhat');

const initialize = async (accounts) => {
  const setup = {};
  setup.roles = {
    root: accounts[0],
    doingud_multisig: accounts[1],
    user1: accounts[2],
    user2: accounts[3]
  };

  return setup;
};

const getTokens = async (setup) => {
    const AmorTokenFactory = await ethers.getContractFactory('AMORToken', setup.roles.root);

    const AmorTokenProxyFactory = await ethers.getContractFactory('AMORTokenProxy', setup.roles.root);

    // Constants for AmorGuild tokens - Still to be merged
    const AmorGuildTokenFactory = await ethers.getContractFactory('AMORGuildToken', setup.roles.root);

    const AmorGuildTokenProxyFactory = await ethers.getContractFactory('AmorGuildProxy', setup.roles.root);

    const GuildTokenFactory = await ethers.getContractFactory('GuildTokenFactory', setup.roles.root);
    

    //  Amor Tokens
    const AmorTokenImplementation = await AmorTokenFactory.deploy();
    const AmorTokenProxy = await AmorTokenProxyFactory.deploy(AmorTokenImplementation.address, []);
    
    //  AmorGuild Tokens
    const AmorGuildToken = await AmorGuildTokenFactory.deploy();
    const AmorGuildTokenProxy = await AmorGuildTokenProxyFactory.deploy();
    const AmorGuildCloneFactory = await GuildTokenFactory.deploy(AmorGuildTokenProxy.address, AmorGuildToken.address, AmorTokenProxy.address );
    

    const tokens = {
      AmorTokenImplementation,
      AmorTokenProxy,
      AmorGuildToken,
      AmorGuildTokenProxy,
      AmorGuildCloneFactory
    };

    setup.tokens = tokens;
    return tokens;
}

module.exports = {
  initialize,
  getTokens
};