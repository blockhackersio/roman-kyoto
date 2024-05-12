#!/usr/bin/env node

import dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("deposit");
}

main()
  .then(() => process.exit(0))
  .catch(() => {
    console.log("done");
    process.exit(1);
  });
