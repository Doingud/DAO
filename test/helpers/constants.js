const { ethers } = require('hardhat');

module.exports = {
    ONE_ADDRESS: '0x0000000000000000000000000000000000000001',
    TWO_ADDRESS: '0x0000000000000000000000000000000000000002',
    TWO_HUNDRED_ETHER: ethers.utils.parseEther('200'),
    ONE_HUNDRED_ETHER: ethers.utils.parseEther('100'),
    FIFTY_ETHER: ethers.utils.parseEther('50'),
    SECONDS_IN_DAY: 60 * 60 * 24, // seconds * minutes * hours
    TAX_RATE: 500,
    BASIS_POINTS: 10000,
    INIT_MINT: ethers.utils.parseEther('10000000'),
    TEST_TRANSFER: ethers.utils.parseEther('100'),
    AMOR_TOKEN_NAME: "AMOR Token",
    AMOR_TOKEN_SYMBOL: "AMOR",
    MOCK_GUILD_NAMES: ['GUILD_ONE', 'GUILD_TWO', 'GUILD_THREE'],
    MOCK_GUILD_SYMBOLS: ['TOKEN_ONE', 'TOKEN_TWO', 'TOKEN_THREE']
}
