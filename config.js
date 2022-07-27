const AMOR = 'AMOR'
const AMORxGuild = 'AMORxGuild'
const FXAMORxGuild = 'FXAMORxGuild'
const dAMORxGuild = 'dAMORxGuild'
const MetaDAOController = 'MetaDAOController'
const GuildController = 'GuildController'
const taxController = 'taxController'
const multisig = 'multisig'

const contractAddresses = {
    'mainnet': {
        [AMOR]: "",
        [AMORxGuild]: "", 
        [FXAMORxGuild]: "",
        [dAMORxGuild]: '',
        [MetaDAOController]: "",
        [GuildController]: ''
    },
    'kovan': {
        [AMOR]: "",
        [AMORxGuild]: "", 
        [FXAMORxGuild]: "",
        [dAMORxGuild]: '',
        [MetaDAOController]: "",
        [GuildController]: '',
        [taxController]: "",
        [multisig]: ""
    },
}

module.exports = {
    contractAddresses,
    getAddresses: function() {
        const blockchainOverride = process.env.BLOCKCHAIN_FORK ? process.env.BLOCKCHAIN_FORK : hre.network.name;
        return contractAddresses[blockchainOverride] ?? [];
    }
} 