import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {
    ethers,
    deployments: { deploy },
  } = hre;

  const [Deployer] = await ethers.getSigners();

  // first we deploy our multiplier, output and spend verifiers on our source chain
  await deploy("MultiplierVerifierSource", {
    contract: "MultiplierVerifier",
    from: Deployer.address,
    log: true,
    autoMine: true,
  });

  await deploy("OutputVerifierSource", {
    contract: "OutputVerifier",
    from: Deployer.address,
    log: true,
    autoMine: true,
  });

  await deploy("SpendVerifierSource", {
    contract: "SpendVerifier",
    from: Deployer.address,
    log: true,
    autoMine: true,
  });

  // next, we redeploy these contracts on our destination chain
  await deploy("MultiplierVerifierDestination", {
    contract: "MultiplierVerifier",
    from: Deployer.address,
    log: true,
    autoMine: true,
  });

  await deploy("OutputVerifierDestination", {
    contract: "OutputVerifier",
    from: Deployer.address,
    log: true,
    autoMine: true,
  });

  await deploy("SpendVerifierDestination", {
    contract: "SpendVerifier",
    from: Deployer.address,
    log: true,
    autoMine: true,
  });
};

export default func;
func.tags = ["testbed"];
