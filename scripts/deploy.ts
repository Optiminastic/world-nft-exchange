import { ethers } from "hardhat";

async function main() {
  const WNE = await ethers.getContractFactory("WorldNFTExchange");
  const wneInstance = await WNE.deploy();

  console.log("Deploying WNE...");

  await wneInstance.deployed();
  const reciept = await wneInstance.deployTransaction.wait();

  console.log(
    ethers.utils.formatEther(reciept.gasUsed.mul(reciept.effectiveGasPrice))
  );

  console.log(`WNE deployed to ${wneInstance.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
