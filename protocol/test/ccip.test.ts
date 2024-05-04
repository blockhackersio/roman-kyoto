import hre, { ethers } from "hardhat";
import {
  MultiplierVerifier,
  OutputVerifier,
  SpendVerifier,
} from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("CCIP functionality testing", async () => {
  const sourceChainId = 1;
  const destChainId = 2;

  let Deployer: SignerWithAddress;

  // for our testing purposes, the CCIP router can just be a signer
  let CCIPRouter: SignerWithAddress;

  let MultiplierVerifierSource: MultiplierVerifier;
  let OutputVerifierSource: OutputVerifier;
  let SpendVerifierSource: SpendVerifier;

  before(async () => {
    await hre.deployments.fixture("testbed");

    [Deployer, CCIPRouter] = await ethers.getSigners();

    const MultiplierVerifierSource = await hre.deployments.get(
      "MultiplierVerifierSource"
    );

    const OutputVerifierSource = await hre.deployments.get(
      "OutputVerifierSource"
    );

    const SpendVerifierSource = await hre.deployments.get(
      "SpendVerifierSource"
    );

    // deploy our EdOnBN254 library
    await hre.deployments.deploy("EdOnBN254", {
      contract: "EdOnBN254",
      from: Deployer.address,
    });
    const EdOnBN254 = (await hre.deployments.get("EdOnBN254")).address;

    // next we deploy our source RK contract
    await hre.deployments.deploy("RKSource", {
      contract: "RK",
      from: Deployer.address,
      args: [
        SpendVerifierSource.address,
        OutputVerifierSource.address,
        CCIPRouter.address,
        [],
        [],
      ],
      libraries: {
        EdOnBN254: EdOnBN254,
      },
    });
  });
});
