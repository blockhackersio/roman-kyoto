
#/usr/bin/env sh 

./scripts/build_circuits.sh
pnpm hardhat test ./test/masp.test.ts --deploy-fixture
