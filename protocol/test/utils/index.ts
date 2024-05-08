import hre, { ethers } from "hardhat";
import {
  MultiAssetShieldedPool__factory,
  RK__factory,
  USDC,
  USDC__factory,
  WBTC,
  WBTC__factory,
} from "../../typechain-types";

export async function deployAll() {
  await hre.deployments.fixture("testbed");
  const [Deployer, CCIPRouter] = await ethers.getSigners();

  const OutputVerifierSource = await hre.deployments.get(
    "OutputVerifierSource"
  );

  const SpendVerifierSource = await hre.deployments.get("SpendVerifierSource");

  const usdcAddress = (await hre.deployments.get("USDC")).address;
  const testUSDC = new ethers.Contract(
    usdcAddress,
    USDC__factory.abi,
    Deployer
  ) as unknown as USDC;

  const wbtcAddress = (await hre.deployments.get("WBTC")).address;
  const testWBTC = new ethers.Contract(
    wbtcAddress,
    WBTC__factory.abi,
    Deployer
  ) as unknown as WBTC;

  // deploy our EdOnBN254 library
  await hre.deployments.deploy("EdOnBN254", {
    contract: "EdOnBN254",
    from: Deployer.address,
  });
  const EdOnBN254 = (await hre.deployments.get("EdOnBN254")).address;

  const Hasher = await hre.deployments.get("Hasher");

  // next we deploy our source RK contract
  await hre.deployments.deploy("RKSource", {
    contract: "RK",
    from: Deployer.address,
    args: [
      SpendVerifierSource.address,
      OutputVerifierSource.address,
      Hasher.address,
      CCIPRouter.address,
      [],
      [],
    ],
    libraries: {
      EdOnBN254: EdOnBN254,
    },
  });

  // next we deploy our MultiAssetShieldedPool contract for unit tests
  await hre.deployments.deploy("MASP", {
    contract: "MaspTest",
    from: Deployer.address,
    args: [
      SpendVerifierSource.address,
      OutputVerifierSource.address,
      Hasher.address,
    ],
    libraries: {
      EdOnBN254: EdOnBN254,
    },
  });

  const RK = RK__factory.connect(
    (await hre.deployments.get("RKSource")).address,
    Deployer
  );
  const MASP = MultiAssetShieldedPool__factory.connect(
    (await hre.deployments.get("MASP")).address,
    Deployer
  );

  // tell our protocol these erc20s are supported
  // await RK.addSupportedAsset(await getAsset("USDC"), usdcAddress, 6);
  // await RK.addSupportedAsset(await getAsset("WBTC"), wbtcAddress, 18);
  return { RK, MASP, testWBTC, testUSDC };
}
