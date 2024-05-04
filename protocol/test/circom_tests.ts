// import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ethers, ignition } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

import MerkleTree from "fixed-merkle-tree";
import CircomExampleModule from "../ignition/modules/CircomExample";
import {
  BabyJub,
  CircomStuff,
  Note,
  NoteStore,
  OutputProof,
  SpendProof,
  getAsset,
  getBabyJubJub,
  getInitialPoints,
  getRandomBigInt,
  getRandomBits,
  notecommitment,
  nullifierHash,
  toStr,
} from "../src/index";
import { ensurePoseidon, poseidonHash, poseidonHash2 } from "../src/poseidon";
import { generateGroth16Proof, toFixedHex } from "../src/zklib";
import { keccak_256 } from "@noble/hashes/sha3";
import { ExtPointType, twistedEdwards } from "@noble/curves/abstract/edwards";
import { randomBytes } from "@noble/hashes/utils";
import { Field, mod } from "@noble/curves/abstract/modular";
import { CircomExample__factory } from "../typechain-types";
import { AbiCoder, Provider, Signer, keccak256 } from "ethers";
import { bytesToNumberBE, ensureBytes } from "@noble/curves/abstract/utils";

async function deployVerifierFixture() {
  return ignition.deploy(CircomExampleModule);
}

export async function getCircomExampleContract() {
  const { verifier } = await loadFixture(deployVerifierFixture);
  const address = await verifier.getAddress();
  const circomExample = new CircomStuff(ethers.provider, address);
  return circomExample;
}

const babyJub = getBabyJubJub();

it("output", async () => {
  await ensurePoseidon();

  const { R, valcommit, getV } = getInitialPoints(babyJub);
  const [privateKey, b1] = getRandomBits(10, 253);
  const spendKey = poseidonHash([privateKey]);

  const n1: Note = {
    amount: 10n,
    asset: await getAsset("USDC"),
    spender: spendKey,
    blinding: toFixedHex(b1),
  };

  const n1nc = await notecommitment(n1);
  const { Vc: n1vc, r: r1 } = valcommit(n1);
  const contract = await getCircomExampleContract();
  const V = getV(n1.asset);
  const proof = await contract.outputProve(
    toStr(n1.amount),
    n1.blinding,
    n1.asset,
    n1.spender,
    toStr(V.x),
    toStr(V.y),
    toStr(R.x),
    toStr(R.y),
    toStr(r1),
    toStr(n1vc.x),
    toStr(n1vc.y)
  );
  await contract.outputVerify(proof, n1nc);
});

it("spend", async () => {
  await ensurePoseidon();
  const [privateKey, b1] = getRandomBits(10, 253);
  const spendKey = poseidonHash([privateKey]);

  const { R, valcommit, getV } = getInitialPoints(babyJub);
  const n1: Note = {
    amount: 10n,
    asset: await getAsset("USDC"),
    spender: spendKey,
    blinding: toFixedHex(b1),
  };

  const n1nc = await notecommitment(n1);

  const { Vc: n1vc, r: r1 } = valcommit(n1);
  const contract = await getCircomExampleContract();

  const tree = new MerkleTree(5, [], {
    hashFunction: poseidonHash2,
  });

  tree.bulkInsert([n1nc]);

  const index = tree.indexOf(n1nc);

  const pathElements = tree.path(index).pathElements.map((e) => e.toString());

  const root = `${tree.root}`;
  const V = getV(n1.asset);
  const proof = await contract.spendProve(
    toStr(privateKey),
    toStr(n1.amount),
    n1.blinding,
    n1.asset,
    toStr(BigInt(index)),
    await nullifierHash(toStr(privateKey), n1, BigInt(index)),
    root,
    pathElements,
    toStr(V.x),
    toStr(V.y),
    toStr(R.x),
    toStr(R.y),
    toStr(r1),
    toStr(n1vc.x),
    toStr(n1vc.y)
  );
  // simple proof verification
  await contract.spendVerify(proof, n1nc);
});

it("Bind signatures", async () => {
  const message = "Hello world";
  const msgBytes = ensureBytes("message", Buffer.from(message, "utf8"));

  const { modN, reddsaSign } = getInitialPoints(babyJub);

  const a = modN(BigInt("0x" + Buffer.from(randomBytes(32)).toString("hex")));
  const A = babyJub.ExtendedPoint.BASE.multiply(a);

  const msgByteStr = toFixedHex(msgBytes);
  const { s, R } = reddsaSign(a, A, msgByteStr);

  /////////////////////////////
  // sig is now R and s
  //////////////////////////////
  // Following should happen in solidity
  //
  const abi = new AbiCoder();
  const cData = abi.encode(
    ["uint256", "uint256", "uint256", "uint256", "bytes"],
    [R.x, R.y, A.x, A.y, msgByteStr]
  );
  const hashed = keccak256(cData);
  const c = modN(BigInt(hashed));
  const B = babyJub.ExtendedPoint.BASE;

  expect(
    B.negate()
      .multiply(s)
      .add(R)
      .add(A.multiply(c))
      .equals(babyJub.ExtendedPoint.ZERO)
  ).to.be.true;

  const contract = await getCircomExampleContract();
  contract.verifySig(
    toStr(s),
    [toStr(R.x), toStr(R.y)],
    [toStr(A.x), toStr(A.y)],
    Buffer.from(msgBytes).toString("hex")
  );
});

function createNote(amount: bigint, spender: string, asset: string): Note {
  const blinding = getRandomBigInt(253);
  return {
    amount,
    spender,
    asset,
    blinding: toStr(blinding),
  };
}

async function transfer(
  signer: Signer,
  poolAddress: string,
  amount: bigint,
  senderPrivateKey: bigint,
  senderPublicKey: string,
  receiverPublicKey: string,
  asset: string, // "USDC" | "WBTC" etc.
  notes: NoteStore
): Promise<void> {
  if (signer.provider === null) throw new Error("Signer must have a provider");

  const contract = new CircomStuff(signer.provider, poolAddress);

  const { R, modN, valcommit, getV } = getInitialPoints(babyJub);
  const spendList = await notes.getNotesUpTo(amount, asset);
  const totalSpent = spendList.reduce((t, note) => {
    return t + note.amount;
  }, 0n);

  const change = totalSpent - amount;
  const assetId = await getAsset(asset);
  const outputList: Note[] = [];

  outputList.push(createNote(amount, receiverPublicKey, assetId));
  if (change > 0n)
    outputList.push(createNote(change, senderPublicKey, assetId));

  const spendProofs: SpendProof[] = [];
  const outputProofs: OutputProof[] = [];

  let totalRandomness = 0n;

  for (let n1 of spendList) {
    const n1nc = await notecommitment(n1);
    const { Vc: n1vc, r: r1 } = valcommit(n1);

    const tree = new MerkleTree(5, [], {
      hashFunction: poseidonHash2,
    });

    tree.insert(n1nc);
    const index = tree.indexOf(n1nc);
    const pathElements = tree.path(index).pathElements.map((e) => e.toString());
    const root = `${tree.root}`;
    const nullifier = await nullifierHash(
      toStr(senderPrivateKey),
      n1,
      BigInt(index)
    );
    const Vs = getV(n1.asset);
    const proofSpend = await contract.spendProve(
      toStr(senderPrivateKey),
      toStr(n1.amount),
      n1.blinding,
      n1.asset,
      toStr(BigInt(index)),
      nullifier,
      root,
      pathElements,
      toStr(Vs.x),
      toStr(Vs.y),
      toStr(R.x),
      toStr(R.y),
      toStr(r1),
      toStr(n1vc.x),
      toStr(n1vc.y)
    );
    totalRandomness = modN(totalRandomness + r1);
    spendProofs.push({
      proof: proofSpend,
      valueCommitment: [toStr(n1vc.x), toStr(n1vc.y)],
      nullifier: n1nc,
    });
  }

  for (let n2 of outputList) {
    const n2nc = await notecommitment(n2);
    const { Vc: n2vc, r: r2 } = valcommit(n2);

    const Vo = getV(n2.asset);
    const proofOutput = await contract.outputProve(
      toStr(n2.amount),
      n2.blinding,
      n2.asset,
      n2.spender,
      toStr(Vo.x),
      toStr(Vo.y),
      toStr(R.x),
      toStr(R.y),
      toStr(r2),
      toStr(n2vc.x),
      toStr(n2vc.y)
    );
    outputProofs.push({
      proof: proofOutput,
      valueCommitment: [toStr(n2vc.x), toStr(n2vc.y)],
      commitment: n2nc,
    });
    totalRandomness = modN(totalRandomness - r2);
  }
  // Create sig
  const bsk = totalRandomness;
  const Bpk = R.multiply(bsk);

  await contract.transact(spendProofs, outputProofs, [
    toStr(Bpk.x),
    toStr(Bpk.y),
  ]);
}

it("transact", async () => {
  const { verifier } = await loadFixture(deployVerifierFixture);
  await ensurePoseidon();
  const [privateKey, recieverPrivateKey, b1] = getRandomBits(10, 253);
  const spendKey = poseidonHash([privateKey]);
  const receiverSpendKey = poseidonHash([recieverPrivateKey]);

  const spendList: Note[] = [
    {
      amount: 10n,
      asset: await getAsset("USDC"),
      spender: spendKey,
      blinding: toFixedHex(b1),
    },
  ];

  await transfer(
    await ethers.provider.getSigner(),
    await verifier.getAddress(),
    10n,
    privateKey,
    spendKey,
    receiverSpendKey,
    "USDC",
    {
      async getNotesUpTo(_amount: bigint, _asset: string) {
        return spendList;
      },
    }
  );
  //
  // const spendProofs: SpendProof[] = [];
  // const outputProofs: OutputProof[] = [];
  // let totalRandomness = 0n;
  //
  // for (let n1 of spendList) {
  //   const n1nc = await notecommitment(n1);
  //   const { Vc: n1vc, r: r1 } = valcommit(n1);
  //
  //   const tree = new MerkleTree(5, [], {
  //     hashFunction: poseidonHash2,
  //   });
  //
  //   tree.insert(n1nc);
  //   const index = tree.indexOf(n1nc);
  //   const pathElements = tree.path(index).pathElements.map((e) => e.toString());
  //   const root = `${tree.root}`;
  //   const nullifier = await nullifierHash(toStr(privateKey), n1, BigInt(index));
  //   const Vs = getV(n1.asset);
  //   const proofSpend = await contract.spendProve(
  //     toStr(privateKey),
  //     toStr(n1.amount),
  //     n1.blinding,
  //     n1.asset,
  //     toStr(BigInt(index)),
  //     nullifier,
  //     root,
  //     pathElements,
  //     toStr(Vs.x),
  //     toStr(Vs.y),
  //     toStr(R.x),
  //     toStr(R.y),
  //     toStr(r1),
  //     toStr(n1vc.x),
  //     toStr(n1vc.y)
  //   );
  //   totalRandomness = modN(totalRandomness + r1);
  //   spendProofs.push({
  //     proof: proofSpend,
  //     valueCommitment: [toStr(n1vc.x), toStr(n1vc.y)],
  //     nullifier: n1nc,
  //   });
  // }
  //
  // for (let n2 of outputList) {
  //   const n2nc = await notecommitment(n2);
  //   const { Vc: n2vc, r: r2 } = valcommit(n2);
  //
  //   const Vo = getV(n2.asset);
  //   const proofOutput = await contract.outputProve(
  //     toStr(n2.amount),
  //     n2.blinding,
  //     n2.asset,
  //     n2.spender,
  //     toStr(Vo.x),
  //     toStr(Vo.y),
  //     toStr(R.x),
  //     toStr(R.y),
  //     toStr(r2),
  //     toStr(n2vc.x),
  //     toStr(n2vc.y)
  //   );
  //   outputProofs.push({
  //     proof: proofOutput,
  //     valueCommitment: [toStr(n2vc.x), toStr(n2vc.y)],
  //     commitment: n2nc,
  //   });
  //   totalRandomness = modN(totalRandomness - r2);
  // }
  // // Create sig
  // const bsk = totalRandomness;
  // const Bpk = R.multiply(bsk);
  //
  // await contract.transact(spendProofs, outputProofs, [
  //   toStr(Bpk.x),
  //   toStr(Bpk.y),
  // ]);
});
