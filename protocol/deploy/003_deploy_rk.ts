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
  await tx.waitForDeployment();
  const hasherAddress = await tx.getAddress();

  await save("Hasher", {
    abi: hasherAbi,
    address: hasherAddress,
  });

  // first we deploy our multiplier, output and spend verifiers on our source chain
  await deploy("OutputVerifierSource", {
    contract: "OutputVerifier",
    from: Deployer.address,
    log: true,
    autoMine: true,
    waitConfirmations: 1,
  });

  await deploy("SpendVerifierSource", {
    contract: "SpendVerifier",
    from: Deployer.address,
    log: true,
    autoMine: true,
    waitConfirmations: 1,
  });

  // deploy our EdOnBN254 library
  await hre.deployments.deploy("EdOnBN254", {
    contract: "EdOnBN254",
    from: Deployer.address,
    log: true,
    autoMine: true,
    waitConfirmations: 1,
  });

  const SpendVerifierSource = (await hre.deployments.get("SpendVerifierSource"))
    .address;
  const OutputVerifierSource = (
    await hre.deployments.get("OutputVerifierSource")
  ).address;
  const EdOnBN254 = (await hre.deployments.get("EdOnBN254")).address;
  const Hasher = (await hre.deployments.get("Hasher")).address;

  await deploy("RK", {
    contract: "RK",
    from: Deployer.address,
    args: [SpendVerifierSource, OutputVerifierSource, Hasher],
    libraries: {
      EdOnBN254: EdOnBN254,
    },
    log: true,
    autoMine: true,
    waitConfirmations: 1,
  });
};

export default func;
func.tags = ["realWorld"];
