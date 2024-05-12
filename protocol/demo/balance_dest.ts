import { ethers } from "hardhat";
import dotenv from "dotenv";

import { getRK2, logBalances } from "./lib";

dotenv.config();

async function main() {
  if (!process.env.PRIVATE_KEY) throw "no private key";
  const provider = new ethers.JsonRpcProvider("http://localhost:8545");
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  const RK = await getRK2(wallet);
  await logBalances(wallet, "source",RK);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
