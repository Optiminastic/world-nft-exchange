import { ethers } from "hardhat";

async function main() {
  const INE = await ethers.getContractFactory("IndianNFTExchange");
  const ineInstance = await INE.deploy();

  console.log("Deploying INE...");

  await ineInstance.deployed();

  console.log(`INE deployed to ${ineInstance.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
