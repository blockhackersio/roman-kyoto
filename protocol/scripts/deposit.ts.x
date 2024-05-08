import hre, { ethers } from "hardhat";

import { Contract, parseUnits } from "ethers";
import { RK__factory, RK } from "../typechain-types";
import { buildMerkleTree, deposit, getKeys } from "../src";

async function main() {
  const { deployments } = hre;
  const [Deployer] = await ethers.getSigners();

  // get our Roman Kyoto Contract Instance
  const RKAddress = (await deployments.get("RK")).address;
  const RK = new Contract(
    RKAddress,
    RK__factory.abi,
    Deployer
  ) as unknown as RK;

  // prepare our deposit tx
  const usdcAmount = parseUnits("69", 6);

  // for our tx events - we need to know the block number of the tx to build our tree
  const fromBlockNumber = 6664350; // TODO change me

  // we submit the tree as part of any deposit, transact or withdraw function call
  let tree = await buildMerkleTree(RK as any as Contract, fromBlockNumber);

  // intialise our spending account (the owner of these encrypted notes)
  const spender = await getKeys(BigInt(`0x${process.env.PRIVATE_KEY!}`));

  // submit our deposit transaction
  let tx = await deposit(
    Deployer,
    RKAddress,
    usdcAmount,
    spender,
    "USDC",
    tree
  );
  let receipt = await tx.wait();
  console.log(receipt);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

process.exitCode = 0;
