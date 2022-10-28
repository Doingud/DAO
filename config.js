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

const Avatar_MetaDAOController = 'Avatar_MetaDAOController';
const Governor_MetaDAOController = 'Governor_MetaDAOController';
const dAMOR_MetaDAOController = 'dAMOR_MetaDAOController';

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
        [DoinGudProxy]: '0xdd634602038eBf699581D34d6142a4FB5aa66Ff5',

        [AMOR]: '0xdd634602038eBf699581D34d6142a4FB5aa66Ff5',
        [AMORxGuild]: '0xdd634602038eBf699581D34d6142a4FB5aa66Ff5',
        [GuildController]: '0xdd634602038eBf699581D34d6142a4FB5aa66Ff5',

        [FXAMORxGuild]: '0xdd634602038eBf699581D34d6142a4FB5aa66Ff5',
        [Avatar]: '0xdd634602038eBf699581D34d6142a4FB5aa66Ff5',

        [dAMORxGuild]: '0xdd634602038eBf699581D34d6142a4FB5aa66Ff5',

        [Avatar_MetaDAOController]: '0xdd634602038eBf699581D34d6142a4FB5aa66Ff5', 
        [Governor_MetaDAOController]: '0xdd634602038eBf699581D34d6142a4FB5aa66Ff5',
        [dAMOR_MetaDAOController]: '0xdd634602038eBf699581D34d6142a4FB5aa66Ff5',
        [MetaDAOController]: '0xdd634602038eBf699581D34d6142a4FB5aa66Ff5',

        [GuildFactory]: '0xdd634602038eBf699581D34d6142a4FB5aa66Ff5',
        [Governor]: '0xdd634602038eBf699581D34d6142a4FB5aa66Ff5',
        [Vesting]: '0xdd634602038eBf699581D34d6142a4FB5aa66Ff5',

        [Snapshot]: '0xdd634602038eBf699581D34d6142a4FB5aa66Ff5',
        [multisig]: '0xdd634602038eBf699581D34d6142a4FB5aa66Ff5', // Dev wallet
    },
    'mumbai': {
        [DoinGudProxy]: '0x61368c2C71274bB53fE77Ba27820A2b3120dfC1B',

        [AMOR]: '0x2aEBC1778CBC5476037ec4158d2886Aa16414B4C',
        [AMORxGuild]: '0x7e6036c94403b4b272a8523ae7Fa5Db2A13323E5',
        [GuildController]: '0x45De03d43C5b19AF5AB8E66fA62Eb27C8003606B',

        [FXAMORxGuild]: '0xAA761EB31536651d19E570282b3Eb0923E418fDf',
        [Avatar]: '0x74660e357e17Db2D938a2505063C886D2d364FC7',

        [dAMORxGuild]: '0x13EcFA04eD1A1e475e3f4c121ecd0da5a6aa65A2',
        [MetaDAOController]: '0x303bE7Ca244583Ccefc4a46b4474E0cca67727D1',
        [GuildFactory]: '0xa0225d9cfE632f889e9cfC644C6352c9e160B6A2',
        [Governor]: '0x6C0828f9590e23977891bCdF7185CF160aDA6E28',
        [Vesting]: '0xD37f81eDCcdD823647b07F95e5cb54aDdAdb383D',

        [Avatar_MetaDAOController]: '0xdd634602038eBf699581D34d6142a4FB5aa66Ff5', 
        [Governor_MetaDAOController]: '0xdd634602038eBf699581D34d6142a4FB5aa66Ff5',
        [dAMOR_MetaDAOController]: '0xdd634602038eBf699581D34d6142a4FB5aa66Ff5',

        [Snapshot]: '0xdd634602038eBf699581D34d6142a4FB5aa66Ff5',
        [multisig]: '0xdd634602038eBf699581D34d6142a4FB5aa66Ff5', // Dev wallet
    },
    'rinkeby': {
        [AMOR]: '0x9E4A13E5c30e14AA96A0bC147A106e4166248343',
        [AMORxGuild]: '0x3D0641b6f4B938af344FB81b70A2b0bE46f5feca', 
        [FXAMORxGuild]: '0xfD678C57Bd4518ff4d5F0de863724BC03759E37a',
        [dAMORxGuild]: '0x78abed850AD0f25eb9129F4971915277B17beF1a',
        [MetaDAOController]: '0xdFA7E41fc1Babea56E85F65BBA006E38cFb77925',
        [GuildController]: '0xB19bFADCca6b4AbE42d7e362B629a2632473aDBE',
        [DoinGudProxy]: '0x5840C0cdb9c13F14C36bc58f53f11AEB4d844138',
        [GuildFactory]: '0xc628c2Af0Af6f3E9891871b59933e2269D697270',
        [Governor]: '',
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