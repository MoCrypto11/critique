import hre from "hardhat";

const { ethers } = hre;

async function main() {
  const usdcAddress = process.env.NEXT_PUBLIC_USDC_ADDRESS || process.env.USDC_ADDRESS;

  if (!usdcAddress) {
    throw new Error("Set NEXT_PUBLIC_USDC_ADDRESS or USDC_ADDRESS before deploying.");
  }

  const CritiqueDropBounty = await ethers.getContractFactory("CritiqueDropBounty");
  const contract = await CritiqueDropBounty.deploy(usdcAddress);
  await contract.waitForDeployment();

  const deployedAddress = await contract.getAddress();
  const safeAddress = ethers.getAddress(deployedAddress);
  const addressLength = safeAddress.length;

  if (addressLength !== 42) {
    throw new Error(`Invalid deployed contract address length: ${addressLength} (${safeAddress})`);
  }

  console.log(`DEPLOYED_CONTRACT_ADDRESS=${safeAddress}`);
  console.log(`NEXT_PUBLIC_CRITIQUE_DROP_CONTRACT=${safeAddress}`);
  console.log(`ADDRESS_LENGTH=${addressLength}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
