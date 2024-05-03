// import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ethers, ignition } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

import MerkleTree from "fixed-merkle-tree";
import CircomExampleModule from "../ignition/modules/CircomExample";
import { Note } from "../src/index";
import { ensurePoseidon, poseidonHash, poseidonHash2 } from "../src/poseidon";
import { generateGroth16Proof, toFixedHex } from "../src/zklib";
import { keccak_256 } from "@noble/hashes/sha3";
import { ExtPointType, twistedEdwards } from "@noble/curves/abstract/edwards";
import { randomBytes } from "@noble/hashes/utils";
import { Field, mod } from "@noble/curves/abstract/modular";
import { CircomExample__factory } from "../typechain-types";
import { Provider } from "ethers";

class CircomStuff {
  constructor(private provider: Provider, private address: string) { }

  async spendProve(
    privateKey: string,
    amount: string,
    blinding: string,
    asset: string,
    pathIndex: string,
    nullifier: string,
    root: string,
    pathElements: string[],
    Vx: string,
    Vy: string,
    v: string,
    Rx: string,
    Ry: string,
    r: string,
    Cx: string,
    Cy: string
  ) {
    return await generateGroth16Proof(
      {
        privateKey,
        amount,
        blinding,
        asset,
        pathIndex,
        nullifier,
        root,
        pathElements,
        Vx,
        Vy,
        v,
        Rx,
        Ry,
        r,
        Cx,
        Cy,
      },
      "spend"
    );
  }

  async outputProve(
    amount: string,
    blinding: string,
    asset: string,
    publicKey: string,
    Vx: string,
    Vy: string,
    v: string,
    Rx: string,
    Ry: string,
    r: string,
    Cx: string,
    Cy: string
  ) {
    return await generateGroth16Proof(
      {
        amount,
        blinding,
        asset,
        publicKey,
        Vx,
        Vy,
        v,
        Rx,
        Ry,
        r,
        Cx,
        Cy,
      },
      "output"
    );
  }
  async outputVerify(proof: string, commitment: string) {
    const verifier = CircomExample__factory.connect(
      this.address,
      this.provider
    );
    return await verifier.outputVerify(proof, [commitment]);
  }

  async spendVerify(proof: string, commitment: string) {
    const verifier = CircomExample__factory.connect(
      this.address,
      this.provider
    );
    return await verifier.spendVerify(proof, [commitment]);
  }

  async transact(
    spends: SpendProof[],
    outputs: OutputProof[],
    Bpk: [string, string]
  ) {
    console.log({ spends, outputs });
    const verifier = CircomExample__factory.connect(
      this.address,
      this.provider
    );
    await verifier.transact(spends, outputs, Bpk);
  }
}

type OutputProof = {
  proof: string;
  commitment: string;
  valueCommitment: [string, string];
};
type SpendProof = {
  proof: string;
  nullifier: string;
  valueCommitment: [string, string];
};

async function deployVerifierFixture() {
  return ignition.deploy(CircomExampleModule);
}

function getBabyJubJub() {
  return twistedEdwards({
    // Params: a, d
    a: BigInt("168700"),
    d: BigInt("168696"),
    // Finite field 𝔽p over which we'll do calculations
    Fp: Field(
      BigInt(
        "21888242871839275222246405745257275088548364400416034343698204186575808495617"
      )
    ),
    // Subgroup order: how many points curve has
    n: BigInt(
      "21888242871839275222246405745257275088614511777268538073601725287587578984328"
    ),
    // Cofactor
    h: BigInt(8),
    // Base point (x, y) aka generator point
    Gx: BigInt(
      "995203441582195749578291179787384436505546430278305826713579947235728471134"
    ),
    Gy: BigInt(
      "5472060717959818805561601436314318772137091100104008585924551046643952123905"
    ),
    hash: keccak_256,
    randomBytes,
  } as const);
}

type BabyJub = ReturnType<typeof getBabyJubJub>;

async function proveSpend(): Promise<string> {
  // privateKey,
  // amount,
  // blinding,
  // index,
  // merkleProof,
  // valueBase,
  // valueCommitmentRandomness,
  // spendNullifier,
  // valueCommitment
  return "";
}
async function proveOutput(): Promise<string> {
  // amount: bigint,
  // publicKey: string,
  // blinding: ,
  // valueBase,
  // valueBaseString,
  // valueCommitment,
  // valueCommitmentRandomness,
  // noteCommitment,
  // valueCommitment
  return "";
}
const modN = (a: bigint) => mod(a, babyJub.CURVE.n);

function getV(asset: string) {
  const { G } = getInitialPoints(babyJub);
  const V = G.multiply(BigInt(asset));
  return V;
}

function valcommit(n: Note, R: ExtPointType, r: bigint) {
  const V = getV(n.asset);
  const vV = V.multiply(modN(n.amount));
  const rR = R.multiply(modN(r));
  const Vc = vV.add(rR);
  return Vc;
}
const babyJub = getBabyJubJub();

function getRandomBigInt(bits: number) {
  const bytes = Math.ceil(bits / 8);
  const extraBits = bytes * 8 - bits; // Extra bits we get due to byte alignment
  const arraySize = Math.ceil(bits / 32);
  const randomValues = new Uint32Array(arraySize);
  crypto.getRandomValues(randomValues);

  let randomBigInt = BigInt(0);
  for (let i = 0; i < arraySize - 1; i++) {
    randomBigInt = (randomBigInt << BigInt(32)) | BigInt(randomValues[i]);
  }

  // For the last element, only shift the necessary bits
  randomBigInt =
    (randomBigInt << BigInt(32 - extraBits)) |
    (BigInt(randomValues[arraySize - 1]) >> BigInt(extraBits));

  return randomBigInt;
}

function getRandomBits(count: number, bits: number) {
  return new Array(count).fill(0).map(() => getRandomBigInt(bits));
}

async function getCircomExampleContract() {
  const { verifier } = await loadFixture(deployVerifierFixture);
  const address = await verifier.getAddress();
  const circomExample = new CircomStuff(ethers.provider, address);
  return circomExample;
}

function toStr(b: bigint): string {
  return "0x" + b.toString(16);
}
function stringToBytes(str: string) {
  return BigInt("0x" + Buffer.from(str, "utf-8").toString("hex"));
}

async function hashToField(bytes: bigint) {
  await ensurePoseidon();
  return poseidonHash([bytes]);
}

function getAsset(assetString: string) {
  const bytes = stringToBytes(assetString);
  return hashToField(bytes);
}

async function notecommitment(n: Note): Promise<string> {
  return poseidonHash([n.amount, n.spender, n.blinding, n.asset]);
}

function signature(
  privateKey: string,
  commitment: string,
  index: bigint
): string {
  return poseidonHash([privateKey, commitment, index]);
}

async function nullifierHash(
  privateKey: string,
  n: Note,
  index: bigint
): Promise<string> {
  const commitment = await notecommitment(n);
  return poseidonHash([
    commitment,
    index,
    signature(privateKey, commitment, index),
  ]);
}

function getInitialPoints(B: BabyJub) {
  const [Ro] = getRandomBits(2, 253);
  const G = B.ExtendedPoint.fromAffine({
    x: babyJub.CURVE.Gx,
    y: babyJub.CURVE.Gy,
  });
  const R = G.multiply(Ro);
  return { G, R };
}

it("output", async () => {
  await ensurePoseidon();
  const { R } = getInitialPoints(babyJub);
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
    toStr(n1.amount),
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

  const { R } = getInitialPoints(babyJub);
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
    toStr(n1.amount),
    toStr(R.x),
    toStr(R.y),
    toStr(r1),
    toStr(n1vc.x),
    toStr(n1vc.y)
  );
  // simple proof verification
  await contract.spendVerify(proof, n1nc);
});

it("transact", async () => {
  await ensurePoseidon();
  const [privateKey, recieverPrivateKey, b1, b2, r1, r2] = getRandomBits(
    10,
    253
  );
  const spendKey = poseidonHash([privateKey]);
  const receiverSpendKey = poseidonHash([recieverPrivateKey]);

  const { R } = getInitialPoints(babyJub);
  // input
  const n1: Note = {
    amount: 10n,
    asset: await getAsset("USDC"),
    spender: spendKey,
    blinding: toFixedHex(b1),
  };

  // output
  const n2: Note = {
    amount: 10n,
    asset: await getAsset("USDC"),
    spender: receiverSpendKey,
    blinding: toFixedHex(b2),
  };

  const n1nc = await notecommitment(n1);
  const n2nc = await notecommitment(n2);
  const n1vc = valcommit(n1, R, r1);
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
    toStr(n1.amount),
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
    toStr(n2.amount),
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
