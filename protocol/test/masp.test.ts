import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

import { bridge, claim, deposit, transfer, withdraw } from "../src/index";
import { ensurePoseidon } from "../src/poseidon";
import { Wallet } from "ethers";
import { deployDoubleMasp, deployMasp } from "./utils";
import { expect } from "chai";
import { MaspWallet } from "../src/wallet";
import { getKeys } from "../src/keypair";
import { buildMerkleTree } from "../src/utils";
import { Asset } from "../src/asset";
import { ValueCommitment } from "../src/vc";
import { ExtPointType } from "@noble/curves/abstract/edwards";
import { B, R, modN } from "../src/curve";

export async function getMultiAssetShieldedPoolContract() {}

async function getRandomKeys() {
  return await getKeys(BigInt(Wallet.createRandom().privateKey));
}

it("ensure keys don't fail", async () => {
  for (let i = 0; i < 100; i++) {
    const key = Wallet.createRandom().privateKey;
    // avoid "bad secret keysize" error
    await getKeys(BigInt(key));
  }
});

async function ensureValueBalance(
  ins: ValueCommitment[],
  outs: ValueCommitment[],
  bridgeOut: ValueCommitment[],
  bridgeIn: ValueCommitment[],
  extValueBase: ExtPointType,
  extAmount: bigint
) {
  let sumRIns = 0n;
  let sumROuts = 0n;
  let sumRBridgeOut = 0n;
  let sumRBridgeIn = 0n;

  let sumIns = B.ExtendedPoint.ZERO;
  let sumOuts = B.ExtendedPoint.ZERO;
  let sumBridgeOut = B.ExtendedPoint.ZERO;
  let sumBridgeIn = B.ExtendedPoint.ZERO;

  for (let vc of ins) {
    sumRIns += vc.getRandomness();
    sumIns = sumIns.add(await vc.toPoint());
  }

  for (let vc of outs) {
    sumROuts += vc.getRandomness();
    sumOuts = sumOuts.add(await vc.toPoint());
  }

  for (let vc of bridgeOut) {
    sumRBridgeOut += vc.getRandomness();
    sumBridgeOut = sumBridgeOut.add((await vc.toPoint()).negate());
  }

  for (let vc of bridgeIn) {
    sumRBridgeIn += vc.getRandomness();
    sumBridgeIn = sumBridgeIn.add((await vc.toPoint()).negate());
  }

  const ext =
    extAmount === 0n
      ? B.ExtendedPoint.ZERO
      : extValueBase.multiply(modN(extAmount));

  const totalR = sumRIns - sumROuts - sumRBridgeOut + sumRBridgeIn;

  expect(
    sumIns
      .subtract(sumOuts)
      .add(sumBridgeOut)
      .subtract(sumBridgeIn)
      .add(ext)
      .equals(R.multiply(modN(totalR)))
  ).to.be.true;
}

it("should value balance when external is 0", async () => {
  const valueBase = await Asset.fromTicker("USDC").getValueBase();
  const ins = [
    ValueCommitment.create("USDC", 10n),
    ValueCommitment.create("USDC", 10n),
  ];
  const outs = [ValueCommitment.create("USDC", 20n)];
  const bridgeIn: ValueCommitment[] = [];
  const bridgeOut: ValueCommitment[] = [];
  const ext = 0n;

  await ensureValueBalance(ins, outs, bridgeOut, bridgeIn, valueBase, ext);
});

it("should value balance when depositing 10", async () => {
  const valueBase = await Asset.fromTicker("USDC").getValueBase();
  const ins = [
    ValueCommitment.create("USDC", 5n),
    ValueCommitment.create("USDC", 5n),
  ];
  const outs = [ValueCommitment.create("USDC", 20n)];
  const bridgeIn: ValueCommitment[] = [];
  const bridgeOut: ValueCommitment[] = [];
  const ext = 10n;

  await ensureValueBalance(ins, outs, bridgeOut, bridgeIn, valueBase, ext);
});

it("should value balance when withdrawing 10", async () => {
  const valueBase = await Asset.fromTicker("USDC").getValueBase();
  const ins = [
    ValueCommitment.create("USDC", 10n),
    ValueCommitment.create("USDC", 10n),
  ];
  const outs = [ValueCommitment.create("USDC", 10n)];
  const bridgeIn: ValueCommitment[] = [];
  const bridgeOut: ValueCommitment[] = [];
  const ext = -10n;

  await ensureValueBalance(ins, outs, bridgeOut, bridgeIn, valueBase, ext);
});

it("should value balance when bridging out 10", async () => {
  const valueBase = await Asset.fromTicker("USDC").getValueBase();
  const ins = [
    ValueCommitment.create("USDC", 10n),
    ValueCommitment.create("USDC", 10n),
  ];
  const outs = [ValueCommitment.create("USDC", 10n)];
  const bridgeIn: ValueCommitment[] = [];
  const bridgeOut = [ValueCommitment.create("USDC", 10n)]; // NOTE: bridging commitment represents the withdrawal and is negative the value

  await ensureValueBalance(ins, outs, bridgeOut, bridgeIn, valueBase, 0n);
});

it("should value balance when bridging in 10", async () => {
  const valueBase = await Asset.fromTicker("USDC").getValueBase();
  const ins = [ValueCommitment.create("USDC", 10n)];
  const outs = [ValueCommitment.create("USDC", 20n)];
  const bridgeIn = [ValueCommitment.create("USDC", 10n)]; // NOTE: bridging commitment represents the withdrawal and is negative the value

  const bridgeOut: ValueCommitment[] = [];

  await ensureValueBalance(ins, outs, bridgeOut, bridgeIn, valueBase, 0n);
});

it.only("integrate single pool", async () => {
  await ensurePoseidon();

  const { MASP } = await loadFixture(deployMasp);
  const maspAddress = await MASP.getAddress();
  const signer = await ethers.provider.getSigner();

  let tree = await buildMerkleTree(MASP);

  const receiver = await getRandomKeys();
  const spender = await getRandomKeys();
  // const privateKey = "0x" + spender.privateKey.toString(16);

  const wallet = MaspWallet.fromPrivateKey(privateKey);

  await wallet.logBalances();

  expect(await wallet.getBalance("USDC")).to.equal(0n);
  expect(await wallet.getBalance("WBTC")).to.equal(0n);
  let tx = await deposit(signer, maspAddress, 100n, spender, "USDC", tree);

  let receipt = await tx.wait();

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

it.only("should bridge funds between pools", async () => {
  const { SourcePool, DestPool } = await loadFixture(deployDoubleMasp);
  const srcAddr = await SourcePool.getAddress();
  const destAddr = await DestPool.getAddress();
  const signer = await ethers.provider.getSigner();
  const net = await ethers.provider.getNetwork();

  let tree = await buildMerkleTree(SourcePool);
  const spender = await getRandomKeys();

  const srcWallet = MaspWallet.fromPrivateKey(
    spender.privateKey.toString(16),
    "SOURCE"
  );
  const destWallet = MaspWallet.fromPrivateKey(
    spender.privateKey.toString(16),
    "DESTINATION"
  );

  await srcWallet.logBalances();

  expect(await srcWallet.getBalance("USDC")).to.equal(0n);
  expect(await srcWallet.getBalance("WBTC")).to.equal(0n);

  let tx = await deposit(signer, srcAddr, 100n, spender, "USDC", tree);
  let receipt = await tx.wait();

  await srcWallet.updateFromReceipt(receipt);
  await srcWallet.logBalances();
  expect(await srcWallet.getBalance("USDC")).to.equal(100n);
  expect(await srcWallet.getBalance("WBTC")).to.equal(0n);

  tree = await buildMerkleTree(SourcePool);

  tx = await bridge(
    signer,
    srcAddr,
    destAddr,
    `${net.chainId}`,
    60n,
    spender,
    spender,
    "USDC",
    tree,
    srcWallet
  );

  receipt = await tx.wait();
  await srcWallet.updateFromReceipt(receipt);
  await srcWallet.logBalances();

  expect(await srcWallet.getBalance("USDC")).to.equal(40n);
  expect(await srcWallet.getBalance("WBTC")).to.equal(0n);

  await destWallet.logBalances();

  expect(await destWallet.getBalance("USDC")).to.equal(0n);
  expect(await destWallet.getBalance("WBTC")).to.equal(0n);

  tree = await buildMerkleTree(DestPool);
  
  const [{ vc }] = srcWallet.getBridgeOuts();

  tx = await claim(signer, destAddr, spender, vc, tree);

  receipt = await tx.wait();
  await destWallet.updateFromReceipt(receipt);
  await destWallet.logBalances();

  expect(await destWallet.getBalance("USDC")).to.equal(60n);
  expect(await destWallet.getBalance("WBTC")).to.equal(0n);


});
