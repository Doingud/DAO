
async function main() {
    const [deployer] = await ethers.getSigners();
    const admin = "0xdd634602038eBf699581D34d6142a4FB5aa66Ff5"; //addresses[multisig];

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    const TSTtoken = "0xc606e5d95f5066421add3f315c9d3fc5385e76f5";
    const GoinGudGovernor = await ethers.getContractFactory("GoinGudGovernor");
    const Governor = await GoinGudGovernor.deploy(TSTtoken, "DoinGud Governor");

    const snapshotGnosis = "0xaFdB15b694Df594787E895692C54F2175C095aB4";
    const tx = await Governor.init(TSTtoken, snapshotGnosis, admin);
    console.log("tx is %s", tx);
    console.log("Governor address:", Governor.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })