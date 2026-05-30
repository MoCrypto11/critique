# Arc Docs Verification

Arc Docs MCP was connected and used before writing Arc configuration.

| Value | Used value | Arc Docs MCP source |
| --- | --- | --- |
| Arc testnet chain ID | `5042002` | `/arc/references/connect-to-arc`, `/arc/references/rpc-endpoints` |
| Arc testnet RPC URL | `https://rpc.testnet.arc.network` | `/arc/references/connect-to-arc`, `/arc/references/rpc-endpoints` |
| Arc testnet explorer | `https://testnet.arcscan.app` | `/arc/references/connect-to-arc` |
| Faucet | `faucet.circle.com` | `/arc/references/connect-to-arc`, `/arc/references/rpc-endpoints`, `/arc/references/contract-addresses` |
| Native gas behavior | USDC is native gas; gas accounting uses 18 decimals; fee market uses EIP-1559 plus EWMA smoothing; minimum base fee on testnet is 20 Gwei. | `/arc/references/gas-and-fees`, `/arc/concepts/stablecoin-native-model`, `/arc/concepts/evm-compatibility` |
| USDC ERC-20 interface | `0x3600000000000000000000000000000000000000`; uses 6 decimals for application transfers, approvals, and allowances. | `/arc/references/contract-addresses`, `/arc/concepts/stablecoin-native-model` |
| Deployment guidance | Arc Testnet deployment uses standard EVM tooling with the Arc RPC URL and a deployer funded with testnet USDC from the Circle Faucet. | `/integrate/deploy-on-arc` |
| Wallet connection | Wallets can add Arc Testnet with chain ID `5042002`, RPC `https://rpc.testnet.arc.network`, currency `USDC`, and explorer `https://testnet.arcscan.app`. | `/arc/references/connect-to-arc` |
| EVM compatibility | Arc targets the Prague hard fork and supports Solidity, Hardhat, Foundry, Viem, and standard Ethereum wallets. | `/arc/concepts/evm-compatibility` |

No Arc values in this project were guessed.
