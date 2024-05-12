import { ethers } from "hardhat";
import dotenv from "dotenv";

import { getRK, getRK2 } from "./lib";
import { MaspWallet, bridge } from "../src";

dotenv.config();

async function main() {
  if (!process.env.PRIVATE_KEY) throw "no private key";
  if (!process.env.AMOUNT) throw "no amount key";
  const amount = BigInt(process.env.AMOUNT); // Getting the amount from environment variables

  const provider = new ethers.JsonRpcProvider("http://localhost:8545");
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const maspWallet = await MaspWallet.fromWallet("source", wallet);
  const RK = await getRK(wallet);
  const RK2 = await getRK2(wallet);
  const mywallet = await maspWallet.getKeys();
  const tree = await maspWallet.getTree(RK);
  const net = await ethers.provider.getNetwork();

  let tx = await bridge(
    wallet,
    await RK.getAddress(),
    await RK2.getAddress(),
    `${net.chainId}`,
    amount,
    mywallet,
    mywallet,
    "USDC",
    tree,
    maspWallet
  );
  await tx.wait();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
