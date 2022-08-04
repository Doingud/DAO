// const { expect } = require('chai');
// const { getAddresses, multisig, AMOR } = require('../../config');
// const { getContract } = require('../helpers/helpers');
// const addresses = getAddresses();

// const MULTISIG = addresses[multisig];
// const amor = addresses[AMOR];

// describe("goerli - AMOR Token", function () {

//     context('» init testing', () => {
//         it('initialized variables check', async function () {
//             const AMORToken = await getContract('AMORToken', amor);

//             expect(await AMORToken.name()).to.equals("AMOR Token");
//             expect(await AMORToken.symbol()).to.equals("AMOR");
//             expect(await AMORToken.taxController()).to.equals(MULTISIG);
//             expect(await AMORToken.owner()).to.equals(MULTISIG);
//         });
//     });
// });

