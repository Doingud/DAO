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

const getCurrentBlockTimestamp = async function () {
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    return blockBefore.timestamp;
};
  
module.exports = {
    getFutureTimestamp,
    getCurrentBlockTimestamp,
    increaseTime,
};