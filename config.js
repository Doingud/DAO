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
const AMORx_MetaDAOController = 'dAMOR_MetaDAOController';

const AMORTokenProxy = 'AMORTokenProxy';
const AMORxGuildProxy = 'AMORxGuildProxy';
const MetaDAOControllerProxy = 'MetaDAOControllerProxy';
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
        [AMORx_MetaDAOController]: '0xdd634602038eBf699581D34d6142a4FB5aa66Ff5',
        [MetaDAOController]: '0xdd634602038eBf699581D34d6142a4FB5aa66Ff5',

        [GuildFactory]: '0xdd634602038eBf699581D34d6142a4FB5aa66Ff5',
        [Governor]: '0xdd634602038eBf699581D34d6142a4FB5aa66Ff5',
        [Vesting]: '0xdd634602038eBf699581D34d6142a4FB5aa66Ff5',

        [Snapshot]: '0xdd634602038eBf699581D34d6142a4FB5aa66Ff5',
        [multisig]: '0xdd634602038eBf699581D34d6142a4FB5aa66Ff5', // Dev wallet
    },
    'mumbai': {
        [DoinGudProxy]: '0xaD6150C12ec0248e9A974D13b3C2b2c1a005574B',

        [AMOR]: '0x05A26CABBf998Bf022C2a143f7Be9d88E4eE6312',
        [AMORTokenProxy]: '0xAB099c84FEf3D0D8C8fb88F4618BA43Ff6Dd50ab',
        [AMORxGuild]: '0x30Dfda66E665c7e10Ac0d0b9E4B896d4643C5BFA',
        [AMORxGuildProxy]: '0xc7dB8CFaAcE215eA6839c53A2CC82e269507e9d8',

        [GuildController]: '0x4117e481665B6c945c0c29189294CE54A2bAA2C0',
        [FXAMORxGuild]: '0x088c4cC7bE06215F401774435c2efb3de1094053',
        [Avatar]: '0x6cf10199afbEf423a981ED4CD2B664E94E3F76A5',
        [AvatarProxy]: '0x00D3d51B5AF6C46eA21AD4C2f599698F675D16a7',

        [dAMORxGuild]: '0x7861724125Dd8528515bBA5358bcaB13180E6983',

        [Avatar_MetaDAOController]: '0xdd634602038eBf699581D34d6142a4FB5aa66Ff5', 
        [Governor_MetaDAOController]: '0xdd634602038eBf699581D34d6142a4FB5aa66Ff5',
        [AMORx_MetaDAOController]: '0xdd634602038eBf699581D34d6142a4FB5aa66Ff5',
        
        [MetaDAOController]: '0x44fbbcA9Ac27CDd6259f0Ff263eaa986C55D3BdC',
        [MetaDAOControllerProxy]: '0x59624102a5e95B30e12B320593e2F6240c65ABFB',
        [Governor]: '0x67E76ECce47b76E2C6dc4C47b6C906f998234Db4',
        [GovernorProxy]: '0xF69d431f8825cA43572E3ebb65CbEF28723991d2',

        [GuildFactory]: '0x47Cadd4258c0eEdCdee5DCFAFf245c8346BC2fC8',
        [Vesting]: '0x66cEB098F767B491eCACbD73Cf5c692C2BD170Cd',

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