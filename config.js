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
        [DoinGudProxy]: '0x708a3561F48884eC6c626174852d99d68A580615',//'0xcef62a378519E2Bf8e9343f6d04b09F86E6F06CD',

        [AMOR]: '0x66198aDf29804944368139d6cC9D3cbc60927961',//'0x2a8e2A212ff337612dE16679247f19Ddc57eDaa0',
        [AMORxGuild]: '0x7a079B54Ff0E0FdeFBba63D4B9387006B2d6E815',//'0xe10fC431454E3A5c6eCD82c4d11104c306866304', 
        [GuildController]: '0xA60903fE3abC8d847198f5Cb60F4ae9704f9d9c5',//'0x3F830Bb209D99219ff8990a478e306b806977cA5',

        [FXAMORxGuild]: '0x1B3E9e2CDD6E353762A1aF28773Ca6f4cD69e282',//'0xc6d88F090d42978BED640DD77a5F14Bab7fcF846',
        [Avatar]: '0xEbF58C3F950CE29e86DDD1e343dAa07487a61B8F',//'0x784B7831Ac3D7211eb5987162cA78B6f7DB1022e',

        [dAMORxGuild]: '0x022E871D32151975c2D18d1862320c6c4B315Cc7',//'0xa38f976f6F945F864b0ad70eEc4ce310569c0894',

        [Avatar_MetaDAOController]: '0x607A08A91231c4644CE8DDeaf2cEb6d1E8FE682B', 
        [Governor_MetaDAOController]: '0x02Cce7Da8029E87a4837a6fE1B667B38aD96D5E3',
        [dAMOR_MetaDAOController]: '0xc592816025AC92a1f008e7B8F6b4720505Cb487B',
        [MetaDAOController]: '0x4e3efd5F88eB46BB88Ed3eb6A952C49856e85155',//'0x67dD9643C074dEF78b6E525E8C458aB506cA48E9',

        [GuildFactory]: '0x2b64ae11bCe10a76f2F38e5960d319649d67942E',//'0xA8BED2396EE072a2F5A3BdbBe6aB16F858f679fa',
        [Governor]: '0xdFd27A31934cF36539d1Ad9a082D5445F6e1e932',//'0xf4dB9899F13199aA2C287cd809aFeD1df573F775',
        [Vesting]: '0xF89a1CD82e3E268dA23e6E3fDCe479B4FD39A884',//'0x4e639efBF428CC32cbcCCB2f1E829184d6f64eb2',

        [Snapshot]: '0xdd634602038eBf699581D34d6142a4FB5aa66Ff5',
        [multisig]: '0xdd634602038eBf699581D34d6142a4FB5aa66Ff5', // Dev wallet
    },
    'mumbai': {
        [DoinGudProxy]: '0xF7873ee0112e796e2AfB05DDcF1c28Ed8c39FD61',

        [AMOR]: '0xF40b463d5b08044984Cab0a1530EEA34e89923C5',//'0x664Fc81A757E865A63792051B3D624Bfb469f7Da', //0x9D58ac8570Bb7Ba6cAcBe2b0be0A54A134e9cf36
        [AMORxGuild]: '0x368FBb10874b4896924E0344135c45574137AF32',//'0x6e3A5f75F7Fc5B810D6dd30B6a95aa7a7fE92af0', 
        [FXAMORxGuild]: '0xfD1f76390a2675c6Fc72A553e1B2808e93aD76E0',//'0x6d61E72A5B4d5E5B74899F1aBe91FDC3fbcdC39d',
        [dAMORxGuild]: '0xAd54443a6a4B072DFcd4B6345602c7E4aAB2E7f6',//'0x5840C0cdb9c13F14C36bc58f53f11AEB4d844138',
        [GuildController]: '0x02Cce7Da8029E87a4837a6fE1B667B38aD96D5E3',//'0xB19bFADCca6b4AbE42d7e362B629a2632473aDBE',
        [Avatar]: '0xb33010656D1Ff613ff3066B22613eB15767800f6',//'0x220D5AcBCB7847D00fb4EaB7D24e65fDF139F9AA',

        [Avatar_MetaDAOController]: '0xEFDe080059A715c808dFb69ddd1a5c63028B82cC', 
        [Governor_MetaDAOController]: '0x7c0ef2bb26Fb5ad3Cc2fc921E9A80e8d6AF36C59',
        [dAMOR_MetaDAOController]: '0x48712340A8a092B2014aF7F2d22522BdecA5E827',
        [MetaDAOController]: '0x0AE50B75339E196b557d4CE2fbcED690005B2cE2',//////'0x0AB89AEF2EFCD9C8555DBae0220bE22bDa064025',//'0xD0686831834bD5740990C4415cb7cE35F655BAd3',//0x633bF84f67aD39366743E6A4d08A35bFCa5e27e7',

        [GuildFactory]: '0x0ed4F4Db02C6614c3f8a5c46a8464455F0a13117',//////'0x4fC385a36511B50445F248Ba8248820bDF818fbe',//'0x441f2b9Ff9ce4a41Ea99bDBCCA53B37bF1430Fcd',//0x441f2b9Ff9ce4a41Ea99bDBCCA53B37bF1430Fcd',
        [Governor]: '0x708a3561F48884eC6c626174852d99d68A580615',//'0x09d7fC361c8003e858071f7CF19e4610b06b754e',//0xFf5a979261e1087df580cF9C637b5F9e0097D856',
        [Vesting]: '0xFE92703F71f4b6B2d975DC7d933D038f0c1aBfc4',//'0xd8c057B9F3a5C308C908719467506313e2c96147',//0x3831a12e433a06f9E28b0e53FAC48fCE11968C88',
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