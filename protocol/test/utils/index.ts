import hre, { ethers } from "hardhat";
import {
  IMasp__factory,
  RK__factory,
  USDC,
  USDC__factory,
  WBTC,
  WBTC__factory,
} from "../../typechain-types";
import { Asset } from "../../src/asset";

export async function deployRK() {
  await hre.deployments.fixture("testbed");
  const [Deployer] = await ethers.getSigners();
  const TxVerifierSource = await hre.deployments.get("TxVerifierSource");

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
    args: [TxVerifierSource.address, Hasher.address],
    libraries: {
      EdOnBN254: EdOnBN254,
    },
  });

  const RK = RK__factory.connect(
    (await hre.deployments.get("RKSource")).address,
    Deployer
  );

  // tell our protocol these erc20s are supported
  await RK.addSupportedAsset(
    await Asset.fromTicker("USDC").getIdHash(),
    usdcAddress,
    6
  );
  await RK.addSupportedAsset(
    await Asset.fromTicker("WBTC").getIdHash(),
    wbtcAddress,
    18
  );

  return { RK, testWBTC, testUSDC, Deployer, rkAddress: await RK.getAddress() };
}

export async function deployMasp() {
  await hre.deployments.fixture("testbed");
  const [Deployer] = await ethers.getSigners();

  const TxVerifierSource = await hre.deployments.get("TxVerifierSource");

  // deploy our EdOnBN254 library
  await hre.deployments.deploy("EdOnBN254", {
    contract: "EdOnBN254",
    from: Deployer.address,
  });
  const EdOnBN254 = (await hre.deployments.get("EdOnBN254")).address;

  const Hasher = await hre.deployments.get("Hasher");

  // next we deploy our MultiAssetShieldedPool contract for unit tests
  await hre.deployments.deploy("MASP", {
    contract: "MaspTest",
    from: Deployer.address,
    args: [TxVerifierSource.address, Hasher.address],
    libraries: {
      EdOnBN254: EdOnBN254,
    },
  });

  const MASP = IMasp__factory.connect(
    (await hre.deployments.get("MASP")).address,
    Deployer
  );

  return { MASP };
}

export async function deployDoubleMasp() {
  await hre.deployments.fixture("testbed");
  const [Deployer] = await ethers.getSigners();

  const TxVerifierSource = await hre.deployments.get("TxVerifierSource");

  // deploy our EdOnBN254 library
  await hre.deployments.deploy("EdOnBN254", {
    contract: "EdOnBN254",
    from: Deployer.address,
  });
  const EdOnBN254 = (await hre.deployments.get("EdOnBN254")).address;

  const Hasher = await hre.deployments.get("Hasher");

  // next we deploy our MultiAssetShieldedPool contract for unit tests
  await hre.deployments.deploy("SourcePool", {
    contract: "MaspTest",
    from: Deployer.address,
    args: [TxVerifierSource.address, Hasher.address],
    libraries: {
      EdOnBN254: EdOnBN254,
    },
  });

  const SourcePool = IMasp__factory.connect(
    (await hre.deployments.get("SourcePool")).address,
    Deployer
  );

  // next we deploy our MultiAssetShieldedPool contract for unit tests
  await hre.deployments.deploy("DestPool", {
    contract: "MaspTest",
    from: Deployer.address,
    args: [TxVerifierSource.address, Hasher.address],
    libraries: {
      EdOnBN254: EdOnBN254,
    },
  });

  const DestPool = IMasp__factory.connect(
    (await hre.deployments.get("DestPool")).address,
    Deployer
  );

  return { SourcePool, DestPool };
}
