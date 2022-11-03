const AMOR = 'AMOR';
const AMORxGuild = 'AMORxGuild';
const FXAMORxGuild = 'FXAMORxGuild';
const dAMORxGuild = 'dAMORxGuild';
const MetaDAOController = 'MetaDAOController';
const GuildController = 'GuildController';
const Governor = 'Governor';
const Avatar = 'Avatar';
const DoinGudProxy = 'DoinGudProxy';
const GuildFactory = 'GuildFactory';
const Vesting = 'Vesting';
const taxController = 'taxController';
const multisig = 'multisig';

const Snapshot = 'Snapshot';

const Avatar_MetaDAOController = 'Avatar_MetaDAOController';
const Governor_MetaDAOController = 'Governor_MetaDAOController';
const dAMOR_MetaDAOController = 'dAMOR_MetaDAOController';

const AMORTokenProxy = 'AMORTokenProxy';
const AMORxGuildProxy = 'AMORxGuildProxy';
const FXAMORxGuildProxy = 'FXAMORxGuildProxy';
const dAMORxGuildProxy = 'dAMORxGuildProxy';
const MetaDAOControllerProxy = 'MetaDAOControllerProxy';
const GuildControllerProxy = 'GuildControllerProxy';
const GovernorProxy = 'GovernorProxy';
const AvatarProxy = 'AvatarProxy';

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
        [DoinGudProxy]: '0xaD6150C12ec0248e9A974D13b3C2b2c1a005574B',

        [AMOR]: '0x9d94EC4d141bDafF7de353Cb1C28E8858210B6F1',
        [AMORTokenProxy]: '0x9916f0986B8c50A0E2c714F9C5ADE134266f6438',
        [AMORxGuild]: '0xE21ef1dd576dE0C2E43643f57b4adB5bB9FBE8Db',
        [AMORxGuildProxy]: '0x983deb35c87d1CD6A5Ff3a7E4Add54C0dE78D32A',

        [GuildController]: '0x9403ea93b730C5dB694Bf0733dC3e691BFD5E236',
        [GuildControllerProxy]: '0x55b894dd06afe430921549825E7E58C40F25ADA6',

        [FXAMORxGuild]: '0xa2268Aa8c14B97F13889439BDb1e129EcB896a91',
        [FXAMORxGuildProxy]: '0x91327815F9a53ACA4430e11B6523CB20Ae61606B',
        [Avatar]: '0x39062Bc754A2b11982424db0E0A7A6DcF6bA3a4E',
        [AvatarProxy]: '0xf6eD7282dd6C505B75ceDF578707242ffA7a69A6',

        [dAMORxGuild]: '0x4D1A2859eD29F5625083B99a95177121B4fa1dd4',
        [dAMORxGuildProxy]: '0x5D0750C557958b4772EE675920834Ff0fEFcAa9D',

        [MetaDAOController]: '0x22aD1414438e468842c5c8dFD21E2E755bc3795b',
        [MetaDAOControllerProxy]: '0xdCcDFa26d92484A705647800b364e199E3962634',
        [Governor]: '0x511845Ac349cb404D3dCb3472c83B17CEBE1548F',
        [GovernorProxy]: '0x0408703335DaF71a70A6A5AE328209D2B2530536',
//--
        [GuildFactory]: '0xd3ff15f660764Cc78096350c5cDa5A2112536774',
        [Vesting]: '0xa5A83CC9729cf10C9D6C4F349E6d3a8b39d3ccc1',
//--
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