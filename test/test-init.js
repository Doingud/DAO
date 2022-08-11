//  Init the test environment

//const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants');
const { ethers } = require('hardhat');
const { TAX_RATE,
        AMOR_TOKEN_NAME, 
        AMOR_TOKEN_SYMBOL, 
      } = require('./helpers/constants.js');

const initialize = async (accounts) => {
  const setup = {};
  setup.roles = {
    root: accounts[0],
    doingud_multisig: accounts[1],
    user1: accounts[2],
    user2: accounts[3],
    user3: accounts[4],
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

    const guardianThreshold = 10;
    const dAMORxGuildFactory = await ethers.getContractFactory('dAMORxGuild');
    const dAMORxGuild = await dAMORxGuildFactory.deploy();
    await dAMORxGuild.init(
      "DoinGud MetaDAO", 
      "DAMORxGuild", 
      setup.roles.operator.address, 
      ERC20Token.address, 
      guardianThreshold
    ); 

    const AmorTokenFactory = await ethers.getContractFactory('AMORToken', setup.roles.root);

    const AmorTokenProxyFactory = await ethers.getContractFactory('DoinGudProxy', setup.roles.root);

    // Constants for AmorGuild tokens - Still to be merged
    const AmorGuildTokenFactory = await ethers.getContractFactory('AMORxGuildToken', setup.roles.root);

    //  Amor Tokens
    const AmorTokenImplementation = await AmorTokenFactory.deploy();
    const AmorTokenMockUpgrade = await AmorTokenFactory.deploy();
    const AmorTokenProxy = await AmorTokenProxyFactory.deploy();
    
    //  AmorGuild Tokens
    const AmorGuildToken = await AmorGuildTokenFactory.deploy();

    const tokens = {
      ERC20Token,
      FXAMORxGuild,
      dAMORxGuild,
      AmorTokenImplementation,
      AmorTokenProxy,
      AmorTokenMockUpgrade,
      AmorGuildToken
    };

    setup.tokens = tokens;
    return tokens;
};

const controller = async (setup) => {
  const controllerFactory = await ethers.getContractFactory('GuildController');
  const controller = await controllerFactory.deploy();

  await controller.init(
    setup.roles.root.address, // owner
    setup.tokens.AmorGuildToken.address, // AMORxGuild
    setup.tokens.FXAMORxGuild.address // FXAMORxGuild
  );

  await setup.tokens.AmorTokenImplementation.init(
    AMOR_TOKEN_NAME, 
    AMOR_TOKEN_SYMBOL, 
    setup.roles.authorizer_adaptor.address, //taxController
    TAX_RATE,
    setup.roles.root.address // multisig
  );

  await setup.tokens.AmorGuildToken.init(
    'GUILD_ONE', 
    'TOKEN_ONE',
    setup.tokens.AmorTokenImplementation.address,
    controller.address //controller
  );

  await setup.tokens.FXAMORxGuild.init(
    "DoinGud MetaDAO", 
    "FXAMORxGuild", 
    controller.address, //controller
    setup.tokens.AmorGuildToken.address // AMORxGuild
  );

  return controller;
};

const governor = async (setup) => {
  const governorFactory = await ethers.getContractFactory('GoinGudGovernor');
  const governor = await governorFactory.deploy(
    setup.tokens.AmorGuildToken.address,
    "DoinGud Governor"
  );

  await governor.init(    
    setup.tokens.AmorGuildToken.address, //AMORxGuild
    // setup.roles.root.address, // owner
    setup.roles.authorizer_adaptor.address, // Snapshot Address
    setup.roles.authorizer_adaptor.address, // Avatar Address
    64000, // voting time
    0 // proposalThreshold
  );

  return governor;
};

const guildFactory = async (setup) => {
  const cloneFactory = await ethers.getContractFactory("GuildFactory");

  await setup.tokens.AmorTokenImplementation.init(
    AMOR_TOKEN_NAME, 
    AMOR_TOKEN_SYMBOL, 
    setup.roles.authorizer_adaptor.address, //taxController
    TAX_RATE,
    setup.roles.root.address // multisig
  );

  const guildFactory = await cloneFactory.deploy(
    setup.tokens.AmorTokenImplementation.address,
    setup.tokens.AmorGuildToken.address,
    setup.tokens.FXAMORxGuild.address,
    setup.tokens.dAMORxGuild.address,
    setup.tokens.AmorTokenProxy.address
  );

  return guildFactory;
}

// const getDelegateRegistry = async (setup) => {
//   const DelegateRegistryFactory = await ethers.getContractFactory('DelegateRegistry', setup.roles.root);
//   await DelegateRegistryFactory.deploy();

//   const bytecode =
//     require('../build/artifacts/contracts/test/DelegateRegistry.sol/DelegateRegistry.json').deployedBytecode;

//   // replaces bytecode of an address
//   await ethers.provider.send('hardhat_setCode', ['0x469788fE6E9E9681C6ebF3bF78e7Fd26Fc015446', bytecode]);
// };

module.exports = {
  initialize,
  getTokens,
  controller,
  governor,
  guildFactory
}; 
