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
  deposit,
  getAsset,
  getBabyJubJub,
  getInitialPoints,
  getRandomBigInt,
  getRandomBits,
  notecommitment,
  nullifierHash,
  toStr,
  transfer,
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
import hasherArtifact from "../contracts/generated/Hasher.json";
async function deployVerifierFixture() {
  return ignition.deploy(CircomExampleModule);
}

export async function getCircomExampleContract() {
  const { verifier } = await loadFixture(deployVerifierFixture);
  const Hasher = await ethers.getContractFactory(
    hasherArtifact.abi,
    hasherArtifact.bytecode
  );
  const hasher = await Hasher.deploy();
  const tx = await hasher.waitForDeployment();
  const signer = await ethers.provider.getSigner();
  const hasherAddr = await tx.getAddress();
  console.log("Hasher deployed to:", hasherAddr);
  const address = await verifier.getAddress();
  const v = CircomExample__factory.connect(address, signer);
  await v.setHasherAddress(hasherAddr);
  console.log("after vset hasher");
  const circomExample = new CircomStuff(
    await ethers.provider.getSigner(),
    address
  );
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

  const nc = await notecommitment(spendList[0]);
  const tree = new MerkleTree(5, [], {
    hashFunction: poseidonHash2,
  });

  tree.insert(nc);

  await transfer(
    await ethers.provider.getSigner(),
    await verifier.getAddress(),
    10n,
    privateKey,
    spendKey,
    receiverSpendKey,
    "USDC",
    tree,
    {
      async getNotesUpTo(_amount: bigint, _asset: string) {
        return spendList;
      },
    }
  );
});

it("deposit", async () => {
  const contract = await getCircomExampleContract();
  const verifier = contract.getContract();
  // const { verifier } = await loadFixture(deployVerifierFixture);
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

  const nc = await notecommitment(spendList[0]);
  const tree = new MerkleTree(5, [], {
    hashFunction: poseidonHash2,
  });

  tree.insert(nc);

  await deposit(
    await ethers.provider.getSigner(),
    await verifier.getAddress(),
    10n,
    privateKey,
    receiverSpendKey,
    "USDC",
    tree
  );
});
