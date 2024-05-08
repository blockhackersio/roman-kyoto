#/usr/bin/env sh

NETWORK=${1:-localhost}

pnpm build
pnpm hardhat ignition deploy ./ignition/modules/MultiAssetShieldedPool.ts --network $NETWORK
./scripts/archive_deployment.sh
