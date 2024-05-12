import { deployments } from "hardhat";
import {
  RK,
  RK__factory,
  USDC__factory,
  WBTC__factory,
} from "../typechain-types";
import { Wallet, formatUnits } from "ethers";
import { MaspWallet } from "../src";

export async function getUSDC(wallet: Wallet) {
  const dUSDC = await deployments.get("USDC");

  const USDC = USDC__factory.connect(dUSDC.address, wallet);
  return USDC;
}

export async function getWBTC(wallet: Wallet) {
  const d = await deployments.get("WBTC");

  const WBTC = WBTC__factory.connect(d.address, wallet);
  return WBTC;
}

export async function logShieldedBalances(
  wallet: Wallet,
  name: string,
  RK: RK
) {
  const sw = await MaspWallet.fromWallet(name, wallet);

  await sw.updateFromContract(await RK.getAddress(), wallet);

  const usdcBal = await sw.getBalance("USDC");
  const wbtcBal = await sw.getBalance("WBTC");
  console.log("Shielded  (" + name + ")");

  console.table({
    USDC: formatUnits(usdcBal, 6),
    WBTC: formatUnits(wbtcBal, 18),
  });
}
export async function logUnshieldedBalances(wallet: Wallet, name: string) {
  const usdc = await getUSDC(wallet);
  const wbtc = await getWBTC(wallet);
  console.log("Transparent  (" + name + ")");
  console.table({
    USDC: formatUnits(await usdc.balanceOf(wallet.address), 6),
    WBTC: formatUnits(await wbtc.balanceOf(wallet.address), 18),
  });
}

export async function logBalances(wallet: Wallet, name: string|string[], RK: RK | RK[]) {
  const names = Array.isArray(name) ? name : [name];
  const rks = Array.isArray(RK) ? RK : [RK];
  for (let i=0; i<rks.length; i++) {
    await logShieldedBalances(wallet, names[i], rks[i]);
  }
  await logUnshieldedBalances(wallet, names[0]);
}

export async function getRK(wallet: Wallet) {
  const dRK = await deployments.get("RK");
  const RK = RK__factory.connect(dRK.address, wallet);
  return RK;
}

export async function getRK2(wallet: Wallet) {
  const dRK = await deployments.get("RK2");
  const RK = RK__factory.connect(dRK.address, wallet);
  return RK;
}
