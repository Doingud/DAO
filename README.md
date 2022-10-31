# DoinGud DAO Contracts
[![Coverage](https://codecov.io/gh/Doingud/DAO/branch/main/graph/badge.svg?token=03f9e7ce-7248-4509-91a8-df83102f9044)](https://codecov.io/gh/Doingud/DAO) ![build&tests](https://github.com/Doingud/DAO/actions/workflows/ci-config.yml/badge.svg) 


This is a DoinGud DAO contracts repository. It is a part of a project which will allow different charity organisations 
to participate in the Web3 ecosystem. This repository consists of the `contracts`, `deploy`, `deployments` and `test`.

`contracts` folder is divided into few subparts:
- `core` all of the governance/management contracts are in the root of the `contracts`
- `tokens` is a directory of tokens contracts needed for functioning of the DAO.
- `interfaces` is a directory of the interfaces for the core and util contracts.
- `utils` is a directory of different additional contracts which help to run the DAO system(Math, ERC20)
- `test` is a directory of mock contracts needed only for unit tests

![](https://i.imgur.com/KzGxk6h.png)

More detailed documentation of the project may be found [here](https://hackmd.io/@TwtRuwCaRB-QzT6jG_XuNA/HybxsfItc).


## Installation

To setup the environment you should run:

```bash
npm install
```

This comand will upload all dependencies and prepare it for a usage.

## Lint

To check the lint execute:

```bash
npm run lint
```

This will check the linting for the contracts and js code.

## Testing

To run unit tests execute:

```bash
npm run test
```

This will recompile contracts and execute the tests on them.

## Coverage

To check the coverage:

```bash
npm run coverage
```
This will recompile contracts and execute the tests on them with coverage computation.

## Deployment

To deploy the contracts:

```bash
npm run deploy:<network>
npm run verify:<network>
```
This will deploy contracts at the specified network, and verify them afterwards.


