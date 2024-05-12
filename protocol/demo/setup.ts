import { ethers } from "hardhat";
import dotenv from "dotenv";
import { deployments } from "hardhat";
import { RK__factory, USDC__factory, WBTC__factory } from "../typechain-types";
import { formatUnits } from "ethers";
import { Asset } from "../src/asset";

dotenv.config();

async function main() {
  if (!process.env.PRIVATE_KEY) throw "no private key";
  const provider = new ethers.JsonRpcProvider("http://localhost:8545");
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const [Deployer] = await ethers.getSigners();
  const me = await wallet.getAddress();
  const dUSDC = await deployments.get("USDC");
  const dWBTC = await deployments.get("WBTC");
  const dRK = await deployments.get("RK");

  const USDC = USDC__factory.connect(dUSDC.address, Deployer);
  const WBTC = WBTC__factory.connect(dWBTC.address, Deployer);
  const RK = RK__factory.connect(dRK.address, Deployer);

  await USDC.mint(me, 1_000_000_000000n);
  await WBTC.mint(me, 1_000_000_000000000000000000n);
  
  // If we use a single chain we don't need this
  await RK.addSupportedAsset(await Asset.fromTicker("USDC").getIdHash(), dUSDC.address, 6);
  await RK.addSupportedAsset(await Asset.fromTicker("WBTC").getIdHash(), dWBTC.address, 18);

  console.log("usdc balance", formatUnits(await USDC.balanceOf(me), 6));
  console.log("wbtc balance", formatUnits(await WBTC.balanceOf(me), 18));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
