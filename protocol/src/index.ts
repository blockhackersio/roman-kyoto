// export your SDK here

import { AbiCoder, Provider, Signer, keccak256 } from "ethers";
import { CircomExample__factory } from "../typechain-types";
import { generateGroth16Proof } from "./zklib";
import { ExtPointType, twistedEdwards } from "@noble/curves/abstract/edwards";
import { Field, mod } from "@noble/curves/abstract/modular";
import { keccak_256 } from "@noble/hashes/sha3";
import { randomBytes } from "@noble/hashes/utils";
import { ensurePoseidon, poseidonHash } from "./poseidon";
import { bytesToNumberBE } from "@noble/curves/abstract/utils";
export * from "./config";

export class CircomStuff {
  constructor(private provider: Provider, private address: string) {}

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
  async verifySig(
    s: string,
    R: [string, string],
    A: [string, string],
    message: string
  ) {
    const verifier = CircomExample__factory.connect(
      this.address,
      this.provider
    );

    await verifier.sigVerify(s, R, A, message);
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

export type OutputProof = {
  proof: string;
  commitment: string;
  valueCommitment: [string, string];
};
export type SpendProof = {
  proof: string;
  nullifier: string;
  valueCommitment: [string, string];
};

export function getBabyJubJub() {
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

export type BabyJub = ReturnType<typeof getBabyJubJub>;

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

export function getRandomBigInt(bits: number) {
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

export function getRandomBits(count: number, bits: number) {
  return new Array(count).fill(0).map(() => getRandomBigInt(bits));
}

export function toStr(b: bigint): string {
  return "0x" + b.toString(16);
}
export function stringToBytes(str: string) {
  return BigInt("0x" + Buffer.from(str, "utf-8").toString("hex"));
}

export async function hashToField(bytes: bigint) {
  await ensurePoseidon();
  return poseidonHash([bytes]);
}

export function getAsset(assetString: string) {
  const bytes = stringToBytes(assetString);
  return hashToField(bytes);
}

export async function notecommitment(n: Note): Promise<string> {
  return poseidonHash([n.amount, n.spender, n.blinding, n.asset]);
}

export function signature(
  privateKey: string,
  commitment: string,
  index: bigint
): string {
  return poseidonHash([privateKey, commitment, index]);
}

export async function nullifierHash(
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

export function getInitialPoints(B: BabyJub) {
  function getV(asset: string) {
    const { G } = getInitialPoints(B);
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

  function reddsaSign(a: bigint, A: ExtPointType, msgByteStr: string) {
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

    const modN = (a: bigint) => mod(a, B.CURVE.n);
    const hash = B.CURVE.hash;
    const BA = B.ExtendedPoint.BASE;
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
    const R = BA.multiply(r);
    const cData = abi.encode(
      ["uint256", "uint256", "uint256", "uint256", "bytes"],
      [R.x, R.y, A.x, A.y, msgByteStr]
    );
    const hashed = keccak256(cData);
    const c = modN(BigInt(hashed));
    const s = modN(r + c * a);
    return { R, s };
  }

  const [Ro] = getRandomBits(2, 253);

  const modN = (a: bigint) => mod(a, B.CURVE.n);
  const G = B.ExtendedPoint.fromAffine({
    x: B.CURVE.Gx,
    y: B.CURVE.Gy,
  });
  const R = G.multiply(Ro);
  return { G, R, modN, valcommit, getV, reddsaSign };
}

export async function transfer(
  signer: Signer,
  amount: bigint,
  spendKey: string,
  asset: string, // "USDC" | "WBTC" etc.
  notes: NoteStore
): Promise<unknown> {
  return "";
}

export async function deposit(
  signer: Signer,
  amount: bigint,
  spendKey: string,
  asset: string, // "USDC" | "WBTC" etc.
  notes: NoteStore
): Promise<unknown> {
  return "";
}

export async function withdraw(
  signer: Signer,
  amount: bigint,
  recipient: string,
  asset: string, // "USDC" | "WBTC" etc.
  notes: NoteStore
): Promise<unknown> {
  return "";
}

export type Note = {
  amount: bigint;
  spender: string;
  blinding: string;
  asset: string;
};

export type NoteStore = {
  getUnspentUtxos(): Record<string, Note[]>;
  getUtxosUpTo(amount: bigint, asset: string): Promise<Note[]>;
};
