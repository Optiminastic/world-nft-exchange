import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";

dotenv.config();

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ALCHEMY_API_KEY_MAINNET = process.env.ALCHEMY_API_KEY_MAINNET;
const MAINNET_PRIVATE_KEY = process.env.MAINNET_PRIVATE_KEY;

// console.log("ALCHEMY_API_KEY", ALCHEMY_API_KEY);
// console.log("PRIVATE_KEY", PRIVATE_KEY);
// console.log("ALCHEMY_API_KEY_MAINNET", ALCHEMY_API_KEY_MAINNET);
// console.log("MAINNET_PRIVATE_KEY", MAINNET_PRIVATE_KEY);

if (!ALCHEMY_API_KEY) {
  throw new Error("Please set your ALCHEMY_API_KEY in a .env file");
}

if (!PRIVATE_KEY) {
  throw new Error("Please set your PRIVATE_KEY in a .env file");
}

if (!ALCHEMY_API_KEY_MAINNET) {
  throw new Error("Please set your ALCHEMY_API_KEY_MAINNET in a .env file");
}

if (!MAINNET_PRIVATE_KEY) {
  throw new Error("Please set your MAINNET_PRIVATE_KEY in a .env file");
}

const SEPOLIA_URL = `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
const MUMBAI_URL = `https://polygon-mumbai.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
const MAINNET_URL = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY_MAINNET}`;

// console.log(MAINNET_URL);
const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    sepolia: {
      url: SEPOLIA_URL,
      accounts: [PRIVATE_KEY!],
    },
    mumbai: {
      url: MUMBAI_URL,
      accounts: [PRIVATE_KEY!],
    },
    mainnet: {
      url: MAINNET_URL,
      accounts: [MAINNET_PRIVATE_KEY!],
    },
  },
};

export default config;
