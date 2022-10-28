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
        [GuildController]: '0x8Aa729B8afCa54098ca2E5cA0422304ba6deB5bf',

        [FXAMORxGuild]: '0xDaC9778cd2482CE5fad06002aE14F5990358aB44',
        [Avatar]: '0x73F9cCE41b5053a5a2c73CaF6b79115ec0e1a8F9',

        [dAMORxGuild]: '0x38B423119AE2001c99b34f94A73413050eD16215',
        [MetaDAOController]: '0xbb33f543cf22417B0857AbC7cb7F5Ea358703419',
        [GuildFactory]: '0x0e4e08CD43B2717969D7D50872d87Ae3Ab8DBC92',
        [Governor]: '0xcCC1E821DDAC5eD008B7018f5a882caddc70AF09',
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