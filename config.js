const AMOR = 'AMOR';
const AMORxGuild = 'AMORxGuild';
const FXAMORxGuild = 'FXAMORxGuild';
const dAMORxGuild = 'dAMORxGuild';
const MetaDAOController = 'MetaDAOController';
const GuildController = 'GuildController';
const DoinGudProxy = 'DoinGudProxy';
const GuildFactory = 'GuildFactory';
const Governor = 'Governor';
const Avatar = 'Avatar';
const Vesting = 'Vesting';
const taxController = 'taxController';
const multisig = 'multisig';

const Snapshot = 'Snapshot';
const MOCK_MODULE = 'MOCK_MODULE';
const USDC_MOCK = 'USDC_MOCK';

const contractAddresses = {
    'mainnet': {
        [AMOR]: "",
        [AMORxGuild]: "", 
        [FXAMORxGuild]: "",
        [dAMORxGuild]: '',
        [MetaDAOController]: "",
        [GuildController]: '',
        [Snapshot]: '',
    },
    'goerli': {
        [AMOR]: '0x2a8e2A212ff337612dE16679247f19Ddc57eDaa0',
        [AMORxGuild]: '0xe10fC431454E3A5c6eCD82c4d11104c306866304', 
        [FXAMORxGuild]: '0xc6d88F090d42978BED640DD77a5F14Bab7fcF846',
        [dAMORxGuild]: '0xa38f976f6F945F864b0ad70eEc4ce310569c0894',
        [MetaDAOController]: '0x67dD9643C074dEF78b6E525E8C458aB506cA48E9',
        [GuildController]: '0x3F830Bb209D99219ff8990a478e306b806977cA5',
        [DoinGudProxy]: '0xcef62a378519E2Bf8e9343f6d04b09F86E6F06CD',
        [GuildFactory]: '0xA8BED2396EE072a2F5A3BdbBe6aB16F858f679fa',
        [Governor]: '0xf4dB9899F13199aA2C287cd809aFeD1df573F775',
        [Avatar]: '0x784B7831Ac3D7211eb5987162cA78B6f7DB1022e',
        [Vesting]: '0x4e639efBF428CC32cbcCCB2f1E829184d6f64eb2',
        [Snapshot]: '',
        [MOCK_MODULE]: '0x7C8d2666740E7b021610a4561E6674aAaCc48a80',
        [USDC_MOCK]: '0xF9b13ff6B4C33497569f3C51D5506eC4C29cF01e',
        [taxController]: '0x55EE48675E9519D59b57e752A9C09bB12e6D932D',
        [multisig]: '0xdd634602038eBf699581D34d6142a4FB5aa66Ff5', // Dev wallet
    },
    'rinkeby': {
        [AMOR]: '0x9E4A13E5c30e14AA96A0bC147A106e4166248343',
        [AMORxGuild]: '0xfD678C57Bd4518ff4d5F0de863724BC03759E37a', 
        [FXAMORxGuild]: '',
        [dAMORxGuild]: '',
        [MetaDAOController]: '',
        [GuildController]: '',
        [taxController]: '0xdd634602038eBf699581D34d6142a4FB5aa66Ff5', // Dev wallet
        [multisig]: '0xdd634602038eBf699581D34d6142a4FB5aa66Ff5', // Dev wallet
    },
};

module.exports = {
    getAddresses: function() {
        const blockchainOverride = process.env.BLOCKCHAIN_FORK ? process.env.BLOCKCHAIN_FORK : hre.network.name;
        return contractAddresses[blockchainOverride] ?? [];
    },
}; 