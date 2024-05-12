import { ethers } from "hardhat";
import dotenv from "dotenv";

import { getRK, getRK2 } from "./lib";
import { MaspWallet, bridge, claim } from "../src";
import { ValueCommitment } from "../src/vc";

dotenv.config();

async function main() {
  if (!process.env.PRIVATE_KEY) throw "no private key";
  if (!process.env.TOKEN) throw "no amount key";
  const token = process.env.TOKEN; // Getting the amount from environment variables

  const provider = new ethers.JsonRpcProvider("http://localhost:8545");
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const maspWallet = await MaspWallet.fromWallet("source", wallet);
  const RK = await getRK(wallet);
  const RK2 = await getRK2(wallet);
  const mywallet = await maspWallet.getKeys();
  const tree = await maspWallet.getTree(RK2);
  const srcAddr = await RK.getAddress();
  const destAddr = await RK2.getAddress();

  await maspWallet.updateFromContract(srcAddr, wallet);

  let tx = await claim(
    wallet,
    destAddr,
    mywallet,
    ValueCommitment.deserialize64(token),
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
