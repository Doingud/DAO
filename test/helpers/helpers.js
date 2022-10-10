const { SECONDS_IN_DAY, ZERO_ADDRESS } = require('./constants');
const { expect } = require("chai");

async function increaseTime(value) {
  if (!ethers.BigNumber.isBigNumber(value)) {
    value = ethers.BigNumber.from(value);
  }
  await ethers.provider.send('evm_increaseTime', [value.toNumber()]);
  await ethers.provider.send('evm_mine');
}

// calculates timestamp in x days from current block timestamp
const getFutureTimestamp = async (days = 1) => {
  const currentTimeInSeconds = await getCurrentBlockTimestamp();

  return currentTimeInSeconds + SECONDS_IN_DAY * days;
};

// returns signer for address
const impersonateAddress = async (address) => {
  await ethers.provider.send('hardhat_impersonateAccount', [address]);
  const signer = await ethers.provider.getSigner(address);
  signer.address = signer._address;
  return signer;
};

const getContract = async (name, address) => {
  const Factory = await ethers.getContractFactory(name);
  return Factory.attach(address);
};

const getCurrentBlockTimestamp = async function () {
  const blockNumBefore = await ethers.provider.getBlockNumber();
  const blockBefore = await ethers.provider.getBlock(blockNumBefore);
  return blockBefore.timestamp;
};

const ONE = ethers.BigNumber.from(1);
const TWO = ethers.BigNumber.from(2);

const getSqrt = function (value) {
    x = ethers.BigNumber.from(value);
    let z = x.add(ONE).div(TWO);
    let y = x;
    while (z.sub(y).isNegative()) {
        y = z;
        z = x.div(z).add(z).div(TWO);
    }
    return y;
}

const executeContractCallWithSigners = async (
  safe,
  contract,
  method,
  params,
  signers,
  delegateCall,
  overrides,
) => {
  const tx = buildContractCall(
    contract,
    method,
    params,
    await safe.nonce(),
    delegateCall,
    overrides
  );
  return executeTxWithSigners(safe, tx, signers);
};

// const safeWithZodiacSetup = async function(
//   starknetCoreAddress = '0x0000000000000000000000000000000000000001',
//   spaceAddress = BigInt(0),
//   zodiacRelayerAddress = BigInt(0)
// ) {
// //   const starknetCoreAddress = '0x0000000000000000000000000000000000000001',
// //   const spaceAddress = BigInt(0),
// //   const zodiacRelayerAddress = BigInt(0)
// //   const wallets = await ethers.getSigners();
// //   const safeSigner = wallets[0]; // One 1 signer on the safe

// //   const GnosisSafeL2 = await ethers.getContractFactory(
// //     '@gnosis.pm/safe-contracts/contracts/GnosisSafeL2.sol:GnosisSafeL2'
// //   );
// //   const FactoryContract = await ethers.getContractFactory(
// //     '@gnosis.pm/safe-contracts/contracts/proxies/GnosisSafeProxyFactory.sol:GnosisSafeProxyFactory'
// //   );
// //   const singleton = await GnosisSafeL2.deploy();
// //   const factory = await FactoryContract.deploy();

// //   const template = await factory.callStatic.createProxy(singleton.address, '0x');
// //   await factory.createProxy(singleton.address, '0x');

// //   const safe = GnosisSafeL2.attach(template);
// //   safe.setup([safeSigner.address], 1, ZERO_ADDRESS, '0x', ZERO_ADDRESS, ZERO_ADDRESS, 0, ZERO_ADDRESS);

// //   const moduleFactoryContract = await ethers.getContractFactory('ModuleProxyFactory');
// //   console.log("11 is %s", 1);
// //   const moduleFactory = await moduleFactoryContract.deploy();
// // console.log("22 is %s", 2);
// //   const SnapshotXContract = await ethers.getContractFactory('SnapshotXL1Executor');

// //   //deploying singleton master contract
// //   const masterzodiacModule = await SnapshotXContract.deploy(
// //     '0x0000000000000000000000000000000000000001',
// //     '0x0000000000000000000000000000000000000001',
// //     '0x0000000000000000000000000000000000000001',
// //     '0x0000000000000000000000000000000000000001',
// //     1,
// //     []
// //   );

// //   const encodedInitParams = ethers.utils.defaultAbiCoder.encode(
// //     ['address', 'address', 'address', 'address', 'uint256', 'uint256[]'],
// //     [
// //       safe.address,
// //       safe.address,
// //       safe.address,
// //       starknetCoreAddress,
// //       zodiacRelayerAddress,
// //       [spaceAddress],
// //     ]
// //   );

// //   const initData = masterzodiacModule.interface.encodeFunctionData('setUp', [encodedInitParams]);

// //   const masterCopyAddress = masterzodiacModule.address.toLowerCase().replace(/^0x/, '');

// //   //This is the bytecode of the module proxy contract
// //   const byteCode =
// //     '0x602d8060093d393df3363d3d373d3d3d363d73' +
// //     masterCopyAddress +
// //     '5af43d82803e903d91602b57fd5bf3';

// //   const salt = ethers.utils.solidityKeccak256(
// //     ['bytes32', 'uint256'],
// //     [ethers.utils.solidityKeccak256(['bytes'], [initData]), '0x01']
// //   );

// //   const expectedAddress = ethers.utils.getCreate2Address(
// //     moduleFactory.address,
// //     salt,
// //     ethers.utils.keccak256(byteCode)
// //   );
// // console.log("33 is %s", 33);
// //   expect(await moduleFactory.deployModule(masterzodiacModule.address, initData, '0x01'))
// //     .to.emit(moduleFactory, 'ModuleProxyCreation')
// //     .withArgs(expectedAddress, masterzodiacModule.address);
// //     console.log("44 is %s", 44);
// //   const zodiacModule = SnapshotXContract.attach(expectedAddress);

// //   await executeContractCallWithSigners(
// //     safe,
// //     safe,
// //     'enableModule',
// //     [zodiacModule.address],
// //     [safeSigner]
// //   );

//   return {
//     zodiacModule,
//     safe,
//     safeSigner,
//   };
// }

module.exports = {
  getFutureTimestamp,
  impersonateAddress,
  getContract,
  getCurrentBlockTimestamp,
  increaseTime,
  getSqrt,
  // safeWithZodiacSetup
};