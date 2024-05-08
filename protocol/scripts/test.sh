
#/usr/bin/env sh 

./scripts/build_circuits.sh
pnpm hardhat test --deploy-fixture
