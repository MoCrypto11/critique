import { config as dotenvConfig } from "dotenv";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

dotenvConfig({ path: ".env.local" });
dotenvConfig();

const privateKey = process.env.PRIVATE_KEY;
const arcRpcUrl = process.env.NEXT_PUBLIC_ARC_RPC_URL || "https://rpc.testnet.arc.network";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    arcTestnet: {
      url: arcRpcUrl,
      chainId: Number(process.env.NEXT_PUBLIC_ARC_CHAIN_ID || "5042002"),
      accounts: privateKey ? [privateKey] : []
    }
  }
};

export default config;
