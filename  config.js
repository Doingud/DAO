const AMOR = 'AMOR';
const AMORxGuild = 'AMORxGuild';
const FXAMORxGuild = 'FXAMORxGuild';
const dAMORxGuild = 'dAMORxGuild';
const MetaDAOController = 'MetaDAOController';
const GuildController = 'GuildController';
const DoinGudProxy = 'DoinGudProxy';
const taxController = 'taxController';
const multisig = 'multisig';

const contractAddresses = {
    'mainnet': {
        [AMOR]: "",
        [AMORxGuild]: "", 
        [FXAMORxGuild]: "",
        [dAMORxGuild]: '',
        [MetaDAOController]: "",
        [GuildController]: ''
    },
    'goerli': {
        [AMOR]: '0x9E4A13E5c30e14AA96A0bC147A106e4166248343',
        [AMORxGuild]: '0x3D0641b6f4B938af344FB81b70A2b0bE46f5feca', 
        [FXAMORxGuild]: '0xfD678C57Bd4518ff4d5F0de863724BC03759E37a',
        [dAMORxGuild]: '0xdd634602038eBf699581D34d6142a4FB5aa66Ff5',
        [MetaDAOController]: '0xdFA7E41fc1Babea56E85F65BBA006E38cFb77925',
        [GuildController]: '0xB19bFADCca6b4AbE42d7e362B629a2632473aDBE',
        [DoinGudProxy]: '0xdd634602038eBf699581D34d6142a4FB5aa66Ff5',
        [taxController]: '0xdd634602038eBf699581D34d6142a4FB5aa66Ff5', // Dev wallet
        [multisig]: '0xdd634602038eBf699581D34d6142a4FB5aa66Ff5', // Dev wallet
    },
    'rinkeby': {
        [AMOR]: '0x9E4A13E5c30e14AA96A0bC147A106e4166248343',
        [AMORxGuild]: '', 
        [FXAMORxGuild]: '',
        [dAMORxGuild]: '',
        [MetaDAOController]: '',
        [GuildController]: '',
        [taxController]: '0xdd634602038eBf699581D34d6142a4FB5aa66Ff5', // Dev wallet
        [multisig]: '0xdd634602038eBf699581D34d6142a4FB5aa66Ff5', // Dev wallet
    },
};

module.exports = {
    contractAddresses,
    getAddresses: function() {
        const blockchainOverride = process.env.BLOCKCHAIN_FORK ? process.env.BLOCKCHAIN_FORK : hre.network.name;
        return contractAddresses[blockchainOverride] ?? [];
    },
    multisig,
    AMOR,
    AMORxGuild,
    FXAMORxGuild,
    dAMORxGuild,
    DoinGudProxy,
    GuildController,
    MetaDAOController,
}; 