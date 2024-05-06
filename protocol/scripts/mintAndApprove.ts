import hre, { ethers } from "hardhat";

import { Contract, parseEther, parseUnits } from "ethers";
import { USDC__factory, USDC, WBTC__factory, WBTC } from "../typechain-types";

async function main() {
  const [Deployer] = await ethers.getSigners();
  const { deployments } = hre;

  const RKAddress = (await deployments.get("RK")).address;

  const usdcAddress = (await deployments.get("USDC")).address;
  const USDC = new Contract(
    usdcAddress,
    USDC__factory.abi,
    Deployer
  ) as unknown as USDC;

  const usdcAmount = parseUnits("10000", 6);
  await USDC.mint(Deployer.address, usdcAmount);
  await USDC.approve(RKAddress, usdcAmount);

  const wbtcAddress = (await deployments.get("WBTC")).address;
  const WBTC = new Contract(
    wbtcAddress,
    WBTC__factory.abi,
    Deployer
  ) as unknown as WBTC;

  const wbtcAmount = parseEther("10000");
  await WBTC.mint(Deployer.address, wbtcAmount);
  await WBTC.approve(RKAddress, wbtcAmount);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
