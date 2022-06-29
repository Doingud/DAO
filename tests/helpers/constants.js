const { ethers } = require('hardhat');

module.exports = {
    TAX_RATE: 500,
    BASIS_POINTS: 10000,
    MOCK_TEST_AMOUNT: ethers.utils.parseEther('100'),
    MOCK_GUILD_NAMES: ['GUILD_ONE', 'GUILD_TWO', 'GUILD_THREE'],
    MOCK_GUILD_SYMBOLS: ['GUILD_ONE', 'GUILD_TWO', 'GUILD_THREE']
}