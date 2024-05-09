import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

import {
  buildMerkleTree,
  deposit,
  getKeys,
  transfer,
  withdraw,
} from "../src/index";
import { ensurePoseidon } from "../src/poseidon";
import { Wallet } from "ethers";
import { deployMasp } from "./utils";
import { expect } from "chai";
import { MaspWallet } from "../src/wallet";

export async function getMultiAssetShieldedPoolContract() {}

it("ensure keys don't fail", async () => {
  for (let i = 0; i < 100; i++) {
    const key = Wallet.createRandom().privateKey;
    // avoid "bad secret keysize" error
    await getKeys(BigInt(key));
  }
});

it("integrate single pool", async () => {
  await ensurePoseidon();

  const { MASP } = await loadFixture(deployMasp);
  const maspAddress = await MASP.getAddress();
  const signer = await ethers.provider.getSigner();

  let tree = await buildMerkleTree(MASP);

  const spenderPrivate = Wallet.createRandom().privateKey;
  const receiverPrivate = Wallet.createRandom().privateKey;
  const receiver = await getKeys(BigInt(receiverPrivate));
  const spender = await getKeys(BigInt(spenderPrivate));
  const privateKey = spender.privateKey.toString(16);

  const wallet = MaspWallet.fromPrivateKey(privateKey);

  await wallet.logBalances();

  expect(await wallet.getBalance("USDC")).to.equal(0n);
  expect(await wallet.getBalance("WBTC")).to.equal(0n);
  let tx = await deposit(signer, maspAddress, 100n, spender, "USDC", tree);

  let receipt = await tx.wait();
  // wallet = await extractToStore(privateKey, wallet, receipt);
  await wallet.updateFromReceipt(receipt);
  await wallet.logBalances();

  expect(await wallet.getBalance("USDC")).to.equal(100n);
  expect(await wallet.getBalance("WBTC")).to.equal(0n);

  tx = await deposit(signer, maspAddress, 2n, spender, "WBTC", tree);

  receipt = await tx.wait();
  await wallet.updateFromReceipt(receipt);
  await wallet.logBalances();

  expect(await wallet.getBalance("USDC")).to.equal(100n);
  expect(await wallet.getBalance("WBTC")).to.equal(2n);

  tree = await buildMerkleTree(MASP);
  tx = await transfer(
    signer,
    maspAddress,
    10n,
    spender,
    receiver,
    "USDC",
    tree,
    wallet
  );

  receipt = await tx.wait();
  await wallet.updateFromReceipt(receipt);
  await wallet.logBalances();

  expect(await wallet.getBalance("USDC")).to.equal(90n);
  expect(await wallet.getBalance("WBTC")).to.equal(2n);

  tree = await buildMerkleTree(MASP);

  tx = await withdraw(
    signer,
    maspAddress,
    50n,
    spender,
    receiver,
    "USDC",
    tree,
    wallet
  );
  receipt = await tx.wait();

  await wallet.updateFromReceipt(receipt);
  await wallet.logBalances();

  expect(await wallet.getBalance("USDC")).to.equal(40n);
  expect(await wallet.getBalance("WBTC")).to.equal(2n);
});
