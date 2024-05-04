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
  getAsset,
  getBabyJubJub,
  getInitialPoints,
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
import { AbiCoder, Provider, keccak256 } from "ethers";
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
  const [privateKey, b1, r1] = getRandomBits(10, 253);
  const spendKey = poseidonHash([privateKey]);

  const n1: Note = {
    amount: 10n,
    asset: await getAsset("USDC"),
    spender: spendKey,
    blinding: toFixedHex(b1),
  };

  const n1nc = await notecommitment(n1);
  const n1vc = valcommit(n1, R, r1);
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
  const [privateKey, b1, r1] = getRandomBits(10, 253);
  const spendKey = poseidonHash([privateKey]);

  const { R, valcommit, getV } = getInitialPoints(babyJub);
  const n1: Note = {
    amount: 10n,
    asset: await getAsset("USDC"),
    spender: spendKey,
    blinding: toFixedHex(b1),
  };

  const n1nc = await notecommitment(n1);

  const n1vc = valcommit(n1, R, r1);
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

function reddsaSign(
  babyJub: BabyJub,
  a: bigint,
  A: ExtPointType,
  msgByteStr: string
) {
  // B - base point
  // a - secret key
  // A - Public Key
  // T - random bytes
  // M - message bytes
  // --- sign ------
  // r = H(T||A||M)
  // R = r * B
  // S = r + H(R||A||M) * a
  // R = H(T||A||M) * B
  // S = H(T||A||M) + H(R||A||M) * a
  // --- verify ----
  // c = H(R||A||M)
  // -B * S + R + c * A == identity

  const abi = new AbiCoder();

  const modN = (a: bigint) => mod(a, babyJub.CURVE.n);
  const hash = babyJub.CURVE.hash;
  const B = babyJub.ExtendedPoint.BASE;
  const T = randomBytes(32);
  const r = modN(
    bytesToNumberBE(
      hash(
        abi.encode(
          ["bytes", "uint256", "uint256", "bytes"],
          [T, A.x, A.y, msgByteStr]
        )
      )
    )
  );
  const R = B.multiply(r);
  const cData = abi.encode(
    ["uint256", "uint256", "uint256", "uint256", "bytes"],
    [R.x, R.y, A.x, A.y, msgByteStr]
  );
  const hashed = keccak256(cData);
  const c = modN(BigInt(hashed));
  const s = modN(r + c * a);
  return { R, s };
}

it("Bind signatures", async () => {
  const message = "Hello world";
  const msgBytes = ensureBytes("message", Buffer.from(message, "utf8"));

  const { modN } = getInitialPoints(babyJub);

  const a = modN(BigInt("0x" + Buffer.from(randomBytes(32)).toString("hex")));
  const A = babyJub.ExtendedPoint.BASE.multiply(a);

  const msgByteStr = toFixedHex(msgBytes);
  const { s, R } = reddsaSign(babyJub, a, A, msgByteStr);

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

it("transact", async () => {
  await ensurePoseidon();
  const [privateKey, recieverPrivateKey, b1, b2, r1, r2] = getRandomBits(
    10,
    253
  );
  const spendKey = poseidonHash([privateKey]);
  const receiverSpendKey = poseidonHash([recieverPrivateKey]);

  const { R, modN, valcommit, getV } = getInitialPoints(babyJub);
  // input
  const n1: Note = {
    amount: 10n,
    asset: await getAsset("USDC"),
    spender: spendKey,
    blinding: toFixedHex(b1),
  };
  const n1nc = await notecommitment(n1);
  const n1vc = valcommit(n1, R, r1);

  // output
  const n2: Note = {
    amount: 10n,
    asset: await getAsset("USDC"),
    spender: receiverSpendKey,
    blinding: toFixedHex(b2),
  };

  const n2nc = await notecommitment(n2);
  const n2vc = valcommit(n2, R, r2);

  const bsk = modN(r1 - r2);
  const Bpk = R.multiply(bsk);

  const contract = await getCircomExampleContract();

  const tree = new MerkleTree(5, [], {
    hashFunction: poseidonHash2,
  });

  // already have n1 in tree but not n2
  tree.bulkInsert([n1nc]);

  const index = tree.indexOf(n1nc);

  const pathElements = tree.path(index).pathElements.map((e) => e.toString());

  const root = `${tree.root}`;

  const nullifier = await nullifierHash(toStr(privateKey), n1, BigInt(index));
  const Vs = getV(n1.asset);
  const proofSpend = await contract.spendProve(
    toStr(privateKey),
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

  await contract.outputVerify(proofOutput, n2nc);
  await contract.transact(
    [
      {
        proof: proofSpend,
        nullifier: n1nc,
        valueCommitment: [toStr(n1vc.x), toStr(n1vc.y)],
      },
    ],
    [
      {
        proof: proofOutput,
        commitment: n2nc,
        valueCommitment: [toStr(n2vc.x), toStr(n2vc.y)],
      },
    ],
    [toStr(Bpk.x), toStr(Bpk.y)]
  );
});
