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
        [AMOR]: '0x3831a12e433a06f9E28b0e53FAC48fCE11968C88',
        [AMORxGuild]: '0xD0686831834bD5740990C4415cb7cE35F655BAd3', 
        [FXAMORxGuild]: '0x65a49f25A28a64deac243E203A48e1A041863689',
        [dAMORxGuild]: '0x444C197FEB1A9546dE8fEBFa5EeAff0B8CdC77ce',
        [MetaDAOController]: '0xb4613d4C59d1c23248C5764a0C25f13916A90E02',
        [GuildController]: '0x441f2b9Ff9ce4a41Ea99bDBCCA53B37bF1430Fcd',
        [DoinGudProxy]: '0x1a9b486C29951b6D941155984AbEf29b8Eaa1Bf0',
        [GuildFactory]: '0x2f29AD6f5850d04D7696cB0DC3D22d72A29ECE78',
        [Governor]: '0x9D58ac8570Bb7Ba6cAcBe2b0be0A54A134e9cf36',
        [Avatar]: '0x09d7fC361c8003e858071f7CF19e4610b06b754e',
        [Vesting]: '0xd547aE65752B8e6c6b6f6AA6e10fa25D188B1b13',
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