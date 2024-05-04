import hre, { ethers } from "hardhat";

import { Contract, parseEther, parseUnits } from "ethers";
import {
  RK__factory,
  RK,
  USDC__factory,
  USDC,
  WBTC__factory,
  WBTC,
} from "../typechain-types";
import { getAsset } from "../src";

async function main() {
  const [Deployer] = await ethers.getSigners();
  const { deployments } = hre;

  const RKAddress = (await deployments.get("RK")).address;

  // approve for USDC and WBTC
  const RK = new Contract(
    RKAddress,
    RK__factory.abi,
    Deployer
  ) as unknown as RK;

  const wbtcAddress = (await deployments.get("WBTC")).address;
  const usdcAddress = (await deployments.get("USDC")).address;

  const usdcAssetId = await getAsset("USDC");
  const wbtcAssetId = await getAsset("WBTC");

  await RK.addSupportedAsset(usdcAssetId, usdcAddress, 6n);
  await RK.addSupportedAsset(wbtcAssetId, wbtcAddress, 18n);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
