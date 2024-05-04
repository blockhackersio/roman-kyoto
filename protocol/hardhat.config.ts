import { HardhatUserConfig, subtask } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-ignition";

import "hardhat-deploy";
import "dotenv/config";

import { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } from "hardhat/builtin-tasks/task-names";

subtask(
  TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD,
  async (
    args: {
      solcVersion: string;
    },
    _,
    runSuper
  ) => {
    if (args.solcVersion === "0.8.24") {
      const compilerPath = "solc";

      return {
        compilerPath,
        isSolcJs: false, // if you are using a native compiler, set this to false
        version: args.solcVersion,
      };
    }

    // since we only want to override the compiler for version 0.8.24,
    // the runSuper function allows us to call the default subtask.
    return runSuper();
  }
);

const config: HardhatUserConfig = {
  solidity: "0.8.24",

  networks: {
    baseSepolia: {
      chainId: 84532,
      url: "https://public.stackup.sh/api/v1/node/base-sepolia",
      accounts: [process.env.PRIVATE_KEY!],
      saveDeployments: true,
    },
    bsctestnet: {
      chainId: 97,
      url: "https://public.stackup.sh/api/v1/node/bsc-testnet",
      accounts: [process.env.PRIVATE_KEY!],
      saveDeployments: true,
    },
  },
};

export default config;
