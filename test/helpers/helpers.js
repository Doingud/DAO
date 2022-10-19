const { SECONDS_IN_DAY } = require('./constants');
const { time } = require("@openzeppelin/test-helpers");

async function increaseTime(value) {
  if (!ethers.BigNumber.isBigNumber(value)) {
    value = ethers.BigNumber.from(value);
  }
  await ethers.provider.send('evm_increaseTime', [value.toNumber()]);
  await ethers.provider.send('evm_mine');
}

// calculates timestamp in x days from current block timestamp
const getFutureTimestamp = async (days = 1) => {
  const currentTimeInSeconds = await getCurrentBlockTimestamp();

  return currentTimeInSeconds + SECONDS_IN_DAY * days;
};

// returns signer for address
const impersonateAddress = async (address) => {
  await ethers.provider.send('hardhat_impersonateAccount', [address]);
  const signer = await ethers.provider.getSigner(address);
  signer.address = signer._address;
  return signer;
};

const getContract = async (name, address) => {
  const Factory = await ethers.getContractFactory(name);
  return Factory.attach(address);
};

const getCurrentBlockTimestamp = async function () {
  const blockNumBefore = await ethers.provider.getBlockNumber();
  const blockBefore = await ethers.provider.getBlock(blockNumBefore);
  return blockBefore.timestamp;
};

const ONE = ethers.BigNumber.from(1);
const TWO = ethers.BigNumber.from(2);

const getSqrt = function (value) {
    x = ethers.BigNumber.from(value);
    let z = x.add(ONE).div(TWO);
    let y = x;
    while (z.sub(y).isNegative()) {
        y = z;
        z = x.div(z).add(z).div(TWO);
    }
    return y;
}


const metaHelper = async function (guardians, reality, proposal, PROPOSER, CONTROLLER, GOVERNOR) {
  /// Step 8: Propose to create a new guild
  //let targetGuildGovernor = await targetProposer.governor();
  //targetGuildGovernor = GOVERNORXGUILD.attach(targetGuildGovernor);
  //let proposal = METADAO.interface.encodeFunctionData(proposedFnSig, arguments);
  await PROPOSER.connect(reality).proposeAfterVote([CONTROLLER.address], [0], [proposal], 0);
  let proposalId = await GOVERNOR.hashProposal([CONTROLLER.address], [0], [proposal]);
  /// Time passed for Voting to take place
  await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
  time.increase(time.duration.days(5));
  await GOVERNOR.connect(guardians[0]).castVote(proposalId, true);
  await GOVERNOR.connect(guardians[1]).castVote(proposalId, true);
  /// Time passed for Voting to finalize
  await hre.network.provider.send("hardhat_mine", ["0xFA00"]);
  time.increase(time.duration.days(10));

  /// Step 9: Execute the proposal that has passed
  await GOVERNOR.execute([CONTROLLER.address], [0], [proposal]);
}

module.exports = {
  getFutureTimestamp,
  impersonateAddress,
  getContract,
  getCurrentBlockTimestamp,
  increaseTime,
  getSqrt,
  metaHelper
};