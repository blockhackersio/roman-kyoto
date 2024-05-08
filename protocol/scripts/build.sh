#/usr/bin/env sh 

./scripts/build_circuits.sh
pnpm hardhat compile
tsc && pnpm rollup -c rollup.config.mjs
