const { SECONDS_IN_DAY } = require('./constants');

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

module.exports = {
  getFutureTimestamp,
  impersonateAddress,
  getContract,
  getCurrentBlockTimestamp,
  increaseTime,
  getSqrt
};