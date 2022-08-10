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
    MOCK_TEST_AMOUNT: ethers.utils.parseEther('100'),
    MOCK_GUILD_NAMES: ['GUILD_ONE', 'GUILD_TWO', 'GUILD_THREE'],
    MOCK_GUILD_SYMBOLS: ['TOKEN_ONE', 'TOKEN_TWO', 'TOKEN_THREE'],
    MOCK_VESTING_ADDRESSES: ["0x0000000000000000000000000000000000000004", "0x0000000000000000000000000000000000000005", "0x0000000000000000000000000000000000000006"],
    MOCK_VESTING_AMOUNTS: [ethers.utils.parseEther('200'), ethers.utils.parseEther('100'), ethers.utils.parseEther('50')]
}
