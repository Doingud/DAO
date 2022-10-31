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
        [DoinGudProxy]: '',

        [AMOR]: '0x41F4Ed5b662AbBD5E7ce1Fa24d53b074a00e219F',
        [AMORxGuild]: '0x4da293feACC9c9368F2A7f7982b68c286Af4b559',
        [GuildController]: '0x0fBe1b01A2ED7268c8C9D19aeF52E45A8bc87008',

        [FXAMORxGuild]: '0xE165BFB91546bbc6D090E8B51020618748199E46',
        [Avatar]: '0x09C5298C0112EA2cc0807Cb826b367B5e977900D',

        [dAMORxGuild]: '0x41632e4fA9E24324E3b31debeBdd452CBe0F0174',
        [MetaDAOController]: '0xc9b94c9a9f7B1a4271c5cF37B6fFa0C1d3F1bDDA',
        [Governor]: '0x45d36BF6A9a48ce9b2cae12c6F9e37474Af5702b',

        [GuildFactory]: '0xee242168cC08bE569aA3Da39418C890a9373B892',
        [Vesting]: '0xF00970Ea9493a42CC4c97148Ff38C4FF7a64FfDA',

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