```
p hardhat --network localhost run demo/setup.ts
p hardhat --network localhost run demo/balances.ts
AMOUNT=100000000 p hardhat --network localhost run demo/deposit.ts
AMOUNT=50000000 p hardhat --network localhost run demo/bridge.ts
TOKEN='xxx' p hardhat --network localhost run demo/claim.ts
```
