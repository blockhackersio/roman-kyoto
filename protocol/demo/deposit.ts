import { ethers } from "hardhat";
import dotenv from "dotenv";

import { getRK, getUSDC } from "./lib";
import { MaspWallet, deposit } from "../src";

dotenv.config();

async function main() {
  if (!process.env.PRIVATE_KEY) throw "no private key";
  if (!process.env.AMOUNT) throw "no amount key";
  const amount = BigInt(process.env.AMOUNT); // Getting the amount from environment variables

  const provider = new ethers.JsonRpcProvider("http://localhost:8545");
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const maspWallet = await MaspWallet.fromWallet("source", wallet);
  const RK = await getRK(wallet);
  const mywallet = await maspWallet.getKeys();
  const tree = await maspWallet.getTree(RK);
  const USDC = await getUSDC(wallet);

  let tx = await USDC.approve(
    await RK.getAddress(),
    100000000000000000000000000000n
  );
  await tx.wait();
  tx = await deposit(
    wallet,
    await RK.getAddress(),
    amount,
    mywallet,
    "USDC",
    tree
  );
  await tx.wait();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
