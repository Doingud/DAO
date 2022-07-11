const { ethers } = require('hardhat');

module.exports = {
    TAX_RATE: 500,
    BASIS_POINTS: 10000,
    INIT_MINT: 10000000,
    TEST_TRANSFER: 100,
    AMOR_TOKEN_NAME: "AMOR Token",
    AMOR_TOKEN_SYMBOL: "AMOR",
    MOCK_TEST_AMOUNT: ethers.utils.parseEther('100'),
    MOCK_GUILD_NAMES: ['GUILD_ONE', 'GUILD_TWO', 'GUILD_THREE'],
    MOCK_GUILD_SYMBOLS: ['TOKEN_ONE', 'TOKEN_TWO', 'TOKEN_THREE']
}