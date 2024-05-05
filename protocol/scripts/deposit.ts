import hre, { ethers } from "hardhat";

import { Contract, formatUnits, parseEther, parseUnits } from "ethers";
import {
  RK__factory,
  RK,
  USDC__factory,
  USDC,
  WBTC__factory,
  WBTC,
} from "../typechain-types";
import { buildMerkleTree, deposit, getAsset, getKeys } from "../src";

async function main() {
  const { deployments } = hre;
  const [Deployer] = await ethers.getSigners();

  const RKAddress = (await deployments.get("RK")).address;

  // approve for USDC and WBTC
  const RK = new Contract(
    RKAddress,
    RK__factory.abi,
    Deployer
  ) as unknown as RK;

  // prepare our deposit tx
  const usdcAmount = parseUnits("5", 6);

  const usdcAddress = (await deployments.get("USDC")).address;
  const USDC = new Contract(
    usdcAddress,
    USDC__factory.abi,
    Deployer
  ) as unknown as USDC;

  console.log(await RK.assetToAddress(await getAsset("USDC")));

  console.log(formatUnits(await USDC.balanceOf(Deployer.address), 6));
  console.log(
    formatUnits(await USDC.allowance(Deployer.address, RKAddress), 6)
  );

  let tree = await buildMerkleTree(RK as any as Contract);

  const spender = await getKeys(BigInt(`0x${process.env.PRIVATE_KEY!}`));

  let tx = await deposit(
    Deployer,
    RKAddress,
    usdcAmount,
    spender,
    "USDC",
    tree
  );
  let receipt = await tx.wait();

  console.log("done!");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
