//  Init the test environment

const { ethers } = require('hardhat');
const { TAX_RATE,
        AMOR_TOKEN_NAME, 
        AMOR_TOKEN_SYMBOL,
        ZERO_ADDRESS
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
    pool: accounts[8]
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

    const AmorTokenProxyFactory = await ethers.getContractFactory('BeaconProxy', setup.roles.root);

    // Constants for AmorGuild tokens - Still to be merged
    const AmorGuildTokenFactory = await ethers.getContractFactory('AMORxGuildToken', setup.roles.root);
    const AmorBeaconFactory = await ethers.getContractFactory("DoinGudBeacon", setup.roles.root);

    //  Amor Tokens
    const AmorTokenImplementation = await AmorTokenFactory.deploy();
    const AmorTokenMockUpgrade = await AmorTokenFactory.deploy();
    const AmorBeacon = await AmorBeaconFactory.deploy(AmorTokenImplementation.address, setup.roles.root.address)
    const AmorTokenProxy = await AmorTokenProxyFactory.deploy(AmorBeacon.address, []);

    
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

const proxy = async (implementation) => {
  const proxyFactory = await ethers.getContractFactory("BeaconProxy");
  const proxy = await proxyFactory.deploy(implementation, []);

  return proxy;
}

const metadaoMock = async (setup) =>{
  const MetaDaoFactory = await ethers.getContractFactory('MetaDaoControllerMock');
  const metadao = await MetaDaoFactory.deploy(
    setup.tokens.AmorTokenImplementation.address,
    setup.tokens.ERC20Token.address,
    setup.roles.root.address, //guildFactory.address,
    setup.roles.root.address
  );

  setup.metadao = metadao;

  return metadao;
}

const controller = async (setup) => {
  const controllerFactory = await ethers.getContractFactory('GuildController');
  const controller = await controllerFactory.deploy();

  await controller.init(
    setup.roles.root.address, // owner
    setup.tokens.AmorTokenImplementation.address,
    setup.tokens.AmorGuildToken.address, // AMORxGuild
    setup.tokens.FXAMORxGuild.address, // FXAMORxGuild
    setup.metadao.address // MetaDaoController
  );

  await setup.tokens.AmorTokenImplementation.init(
    AMOR_TOKEN_NAME, 
    AMOR_TOKEN_SYMBOL, 
    setup.roles.authorizer_adaptor.address, //taxController
    TAX_RATE,
    setup.roles.root.address // the multisig address of the MetaDAO, which owns the token
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

  setup.controller = controller;

  return controller;
};

const avatar = async (setup) => {
  const avatarFactory = await ethers.getContractFactory('AvatarxGuild');
  const avatar = await avatarFactory.deploy();

  const moduleFactory = await ethers.getContractFactory('ModuleMock');
  const module = await moduleFactory.deploy(avatar.address, avatar.address);

  await avatar.init(
    setup.roles.root.address, // reality
    setup.roles.authorizer_adaptor.address // governor Address
  );

  const tx = {
    to: avatar.address,

    value: 0,
    data: "0x",
    operation: 0,
    avatarTxGas: 0,
    baseGas: 0,
    gasPrice: 0,
    gasToken: ZERO_ADDRESS,
    refundReceiver: ZERO_ADDRESS,
    signatures: "0x",
  };

  const avatars = {
    avatar,
    module, 
    tx
  }

  setup.avatars = avatars;

  return avatars;
};

const governor = async (setup) => {
  const governorFactory = await ethers.getContractFactory('DoinGudGovernor');
  const governor = await governorFactory.deploy();

  await governor.init(
    setup.avatars.avatar.address, // Avatar Address
    setup.roles.root.address
  );

  setup.governor = governor;

  return governor;
};

const getGuildFactory = async (setup) => {
  const cloneFactory = await ethers.getContractFactory("GuildFactory");
  const amorStorage = setup.amor_storage ? setup.amor_storage.address : setup.tokens.AmorTokenImplementation.address;
  const amorGuildToken = setup.b_amorGuildToken ? setup.b_amorGuildToken.address : setup.tokens.AmorGuildToken.address;
  const fxamor =  setup.b_fxamor ? setup.b_fxamor.address : setup.tokens.FXAMORxGuild.address;
  const damor =  setup.b_damor ? setup.b_damor.address : setup.tokens.dAMORxGuild.address;
  const controller = setup.b_controller ? setup.b_controller.address : setup.controller.address;
  const governor = setup.b_governor ? setup.b_governor.address : setup.governor.address;
  const avatar = setup.b_avatar ? setup.b_avatar.address : setup.avatars.avatar.address;
  const metadao = setup.metadao_proxy ? setup.metadao_proxy.address : setup.metadao.address;

  const guildFactory = await cloneFactory.deploy(
    amorStorage,
    amorGuildToken,
    fxamor,
    damor,
    setup.tokens.AmorTokenProxy.address,
    controller,
    governor,
    avatar,
    metadao // metaDaoController
  );

  setup.factory = guildFactory;

  return guildFactory;
}

const metadao = async(setup) => {
  const MetaDaoFactory = await ethers.getContractFactory('MetaDaoController');
  const metadao = await MetaDaoFactory.deploy();

  setup.metadao = metadao;

  return metadao;
}

const vestingContract = async (setup) => {
  const vestingFactory = await ethers.getContractFactory("Vesting");

  const amorStorage = setup.amor_storage ? setup.amor_storage.address : setup.tokens.AmorTokenImplementation.address;

  const vesting = await vestingFactory.deploy(
    setup.roles.root.address, //  This will be the MetaDAO address
    amorStorage
  );

  setup.vesting = vesting;

  return vesting;
}

const beacon = async(logic, metadao) => {
  const beaconFactory = await ethers.getContractFactory("DoinGudBeacon");
  const beacon = await beaconFactory.deploy(logic, metadao);

  return beacon;
}

module.exports = {
  avatar,
  beacon,
  controller,
  getGuildFactory,
  getTokens,
  governor,
  initialize,
  metadao,
  metadaoMock,
  proxy,
  vestingContract
}; 
