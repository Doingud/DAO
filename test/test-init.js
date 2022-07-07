
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

  const FXAMORxGuildFactory = await ethers.getContractFactory('FXAMORxGuild');
  const FXAMORxGuild = await FXAMORxGuildFactory.deploy();
  // await FXAMORxGuild.init(
  //   "DoinGud MetaDAO", 
  //   "FXAMORxGuild", 
  //   setup.roles.operator.address, //controller
  //   ERC20Token.address
  // ); 

  // const guardianThreshold = 10;
  // const dAMORxGuildFactory = await ethers.getContractFactory('dAMORxGuild');
  // const dAMORxGuild = await dAMORxGuildFactory.deploy();
  // await dAMORxGuild.init(
  //   "DoinGud MetaDAO", 
  //   "FXAMORxGuild", 
  //   setup.roles.operator.address, 
  //   ERC20Token.address, 
  //   guardianThreshold
  // ); 

  const tokens = {
    ERC20Token,
    FXAMORxGuild,
    // dAMORxGuild,
  };

  setup.tokens = tokens;
  return tokens;
};

const controller = async (setup, impactPoll, projectPoll) => {
  const controllerFactory = await ethers.getContractFactory('Controller');
  const controller = await controllerFactory.deploy();
  await controller.init(
    setup.roles.root.address, // owner
    setup.tokens.ERC20Token.address, // AMORxGuild
    setup.tokens.FXAMORxGuild.address, // FXAMORxGuild
    setup.roles.authorizer_adaptor.address, // guild
    impactPoll.address,
    projectPoll.address
  );

  await setup.tokens.FXAMORxGuild.init(
    "DoinGud MetaDAO", 
    "FXAMORxGuild", 
    controller.address, //controller
    setup.tokens.ERC20Token.address
  ); 

  return controller;
};

module.exports = {
  initialize,
  getTokens,
  controller,
}; 