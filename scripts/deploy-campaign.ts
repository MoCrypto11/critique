import hre from "hardhat";

const { ethers } = hre;

async function main() {
  const usdcAddress = process.env.NEXT_PUBLIC_USDC_ADDRESS || process.env.USDC_ADDRESS;

  if (!usdcAddress) {
    throw new Error("Set NEXT_PUBLIC_USDC_ADDRESS or USDC_ADDRESS before deploying.");
  }

  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error("No deployer signer configured. Set PRIVATE_KEY locally before deploying.");
  }

  const Escrow = await ethers.getContractFactory("CritiqueCampaignEscrowV1", deployer);
  const contract = await Escrow.deploy(usdcAddress);
  await contract.waitForDeployment();

  const deployedAddress = ethers.getAddress(await contract.getAddress());
  console.log(`DEPLOYED_CAMPAIGN_CONTRACT=${deployedAddress}`);
  console.log(`NEXT_PUBLIC_CRITIQUE_CAMPAIGN_CONTRACT=${deployedAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
