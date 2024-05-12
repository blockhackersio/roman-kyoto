#!/usr/bin/env node
import { ethers } from "ethers";
import { getKeys } from "@blockhackers/protocol";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
  const keys = await getKeys(BigInt(wallet.privateKey));

  console.log("balance");
  console.log({ keys });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
