//  Init the test environment

//const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants');
const { ethers } = require('hardhat');
const { TAX_RATE,
        AMOR_TOKEN_NAME, 
        AMOR_TOKEN_SYMBOL 
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

    //const AvatarxGuildFactory = await ethers.getContractFactory('AvatarxGuild');//Mock');
    //const AvatarxGuild = await AvatarxGuildFactory.deploy();

    const tokens = {
      ERC20Token,
      FXAMORxGuild,
      dAMORxGuild,
      AmorTokenImplementation,
      AmorTokenProxy,
      AmorTokenMockUpgrade,
      AmorGuildToken
      //AvatarxGuild
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

const avatar = async (setup) => {
  const avatarFactory = await ethers.getContractFactory('AvatarxGuild');
  const avatar = await avatarFactory.deploy();
  console.log("Test init: avat deployed");

  const moduleFactory = await ethers.getContractFactory('ModuleMock');
  const module = await moduleFactory.deploy(avatar.address, avatar.address);
  console.log("Test init: mock module deployed");

  await avatar.init(
    setup.roles.root.address, // owner
    setup.roles.authorizer_adaptor.address // guardian Address
  );
  console.log("Test init: avatar.init called");

  const avatars = {
    avatar,
    module
  }

  setup.avatars = avatars

  return avatars;
};

const governor = async (setup) => {
  const governorFactory = await ethers.getContractFactory('DoinGudGovernor');
  const governor = await governorFactory.deploy(
    setup.tokens.AmorGuildToken.address,
    "DoinGud Governor"
  );

  //await setup.tokens.AvatarxGuild.init(    
  //  setup.roles.authorizer_adaptor.address, // owner Address
  //  governor.address // GUARDIAN_ROLE
  //);

  await governor.init(    
    setup.tokens.AmorGuildToken.address, //AMORxGuild
    setup.roles.authorizer_adaptor.address, // Snapshot Address
    setup.avatars.avatar.address// Avatar Address
  );

  return governor;
};

const getGuildFactory = async (setup) => {
  const cloneFactory = await ethers.getContractFactory("GuildFactory");

  await setup.tokens.AmorTokenImplementation.init(
    AMOR_TOKEN_NAME, 
    AMOR_TOKEN_SYMBOL, 
    setup.roles.authorizer_adaptor.address, //taxController
    TAX_RATE,
    setup.roles.root.address // multisig
  );

  const controllerFactory = await ethers.getContractFactory("GuildController");
  const controller = await controllerFactory.deploy();

  const guildFactory = await cloneFactory.deploy(
    setup.tokens.AmorTokenImplementation.address,
    setup.tokens.AmorGuildToken.address,
    setup.tokens.FXAMORxGuild.address,
    setup.tokens.dAMORxGuild.address,
    setup.tokens.AmorTokenProxy.address,
    controller.address
  );

  const factory = {
    controller,
    guildFactory
  }

  setup.factory = factory;

  return factory;
}

const vestingContract = async (setup) => {
  const vestingFactory = await ethers.getContractFactory("Vesting");

  const vesting = await vestingFactory.deploy(
    setup.roles.root.address, //  This will be the MetaDAO address
    setup.tokens.AmorTokenImplementation.address
  );

  setup.vesting = vesting;

  return vesting;

}

module.exports = {
  initialize,
  getTokens,
  controller,
  avatar,
  vestingContract,
  getGuildFactory,
  governor
}; 
