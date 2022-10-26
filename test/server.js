const express = require('express')
const graphqlHTTP = require('express-graphql')

const Web3 = require('web3')
const TFcontract = require('truffle-contract')
const MetaCoinArtifact = require('./build/artifacts/contracts/GuildFactory')
const MetCoinContract = TFcontract(MetaCoinArtifact)
MetCoinContract.setProvider(new Web3.providers.HttpProvider('http://localhost:8545'))

const { genGraphQlProperties } = require('ethereum-to-graphql')
const { schema, rootValue } = genGraphQlProperties({ artifact: MetaCoinArtifact, contract: MetCoinContract })

const GRAPHQL_PORT = 4000

const app = express()
app.use('/graphql', graphqlHTTP({
  schema,
  rootValue,
  graphiql: true
}))

app.listen(GRAPHQL_PORT, () => console.log(
  `GraphiQL is now running on http://localhost:${GRAPHQL_PORT}/graphiql
Only for Development purposes!`
))




// graph init --from-contract 0xF7873ee0112e796e2AfB05DDcF1c28Ed8c39FD61 --network mumbai --contract-name DoinGudProxy --index-events

// graph add  0x66198aDf29804944368139d6cC9D3cbc60927961 --contract-name AMORToken
// graph add  0x7a079B54Ff0E0FdeFBba63D4B9387006B2d6E815 --contract-name AMORxGuildToken
// graph add  0x1B3E9e2CDD6E353762A1aF28773Ca6f4cD69e282 --contract-name FXAMORxGuild
// graph add  0xA60903fE3abC8d847198f5Cb60F4ae9704f9d9c5 --contract-name GuildController
// graph add  0x022E871D32151975c2D18d1862320c6c4B315Cc7 --contract-name dAMORxGuild

// graph add  0x708a3561F48884eC6c626174852d99d68A580615 --contract-name DoinGudProxy
// graph add  0xF89a1CD82e3E268dA23e6E3fDCe479B4FD39A884 --contract-name Vesting