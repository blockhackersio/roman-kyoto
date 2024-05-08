
#/usr/bin/env sh 

./scripts/build_circuits.sh
pnpm hardhat test ./test/test.ts --deploy-fixture
