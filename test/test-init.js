
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

  const tokens = {

  };

  setup.tokens = tokens;
  return tokens;
};

module.exports = {
  initialize,
  getTokens,
}; 