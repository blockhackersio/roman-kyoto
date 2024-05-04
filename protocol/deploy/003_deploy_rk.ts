import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { poseidonContract } from "circomlibjs";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {
    ethers,
    deployments: { deploy, save },
  } = hre;

  const [Deployer] = await ethers.getSigners();

  // we need to deploy the poseidon hasher contract for the merkletreewithhistory contract
  const hasherAbi = poseidonContract.generateABI(2);
  const HasherFactory = new ethers.ContractFactory(
    hasherAbi,
    poseidonContract.createCode(2),
    Deployer
  );

  const tx = await HasherFactory.deploy();
  const hasherAddress = await tx.getAddress();

  await save("Hasher", {
    abi: hasherAbi,
    address: hasherAddress,
  });

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
