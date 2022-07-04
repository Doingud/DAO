const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants');
const { ethers } = require('hardhat');

const initialize = async (accounts) => {
  const setup = {};
  setup.roles = {
    root: accounts[0],
    prime: accounts[1],
    reward_manager: accounts[2],
    authorizer_adaptor: accounts[3],
    operator: accounts[4],
    buyer1: accounts[5],
    buyer2: accounts[6],
    staker: accounts[7],
  };

  return setup;
};

const getTokens = async (setup) => {
  const ERC20Factory = await ethers.getContractFactory('ERC20Mock', setup.roles.root);
  const ERC20Token = await ERC20Factory.deploy('ERC20Token', 'ERC20Token'); // test token
  
  const guardianThreshold = 10;
  const dAMORxGuildFactory = await ethers.getContractFactory('dAMORxGuild');
  const dAMORxGuild = await dAMORxGuildFactory.deploy();
  await dAMORxGuild.init(
    "DoinGud MetaDAO", 
    "FXAMORxGuild", 
    setup.roles.operator.address, 
    ERC20Token.address, 
    guardianThreshold
  ); 

  const tokens = {
    ERC20Token,
    dAMORxGuild,
  };

  setup.tokens = tokens;
  return tokens;
};

module.exports = {
  initialize,
  getTokens,
};