// export your SDK here

import {
  AbiCoder,
  Contract,
  ContractTransactionResponse,
  EventLog,
  Signer,
  keccak256,
} from "ethers";
import {
  IMasp,
  IMasp__factory,
  MultiAssetShieldedPool__factory,
} from "../typechain-types";
import {
  dataDecrypt,
  dataEncrypt,
  generateGroth16Proof,
  toFixedHex,
} from "./zklib";
import { ExtPointType, twistedEdwards } from "@noble/curves/abstract/edwards";
import { Field, mod } from "@noble/curves/abstract/modular";
import { keccak_256 } from "@noble/hashes/sha3";
import { randomBytes } from "@noble/hashes/utils";
import { ensurePoseidon, poseidonHash, poseidonHash2 } from "./poseidon";
import { bytesToNumberBE } from "@noble/curves/abstract/utils";
import MerkleTree from "fixed-merkle-tree";
import { getEncryptionPublicKey } from "@metamask/eth-sig-util";
export * from "./config";

export async function outputProve(
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

export async function spendProve(
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
  Cy: string,
  commitment: string
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
      commitment,
    },
    "spend"
  );
}

export async function outputVerify(
  address: string,
  provider: Signer,
  proof: string,
  commitment: string
) {
  const verifier = MultiAssetShieldedPool__factory.connect(address, provider);
  return await verifier.outputVerify(proof, [commitment]);
}

export async function spendVerify(
  address: string,
  provider: Signer,
  proof: string,
  commitment: string
) {
  const verifier = MultiAssetShieldedPool__factory.connect(address, provider);
  return await verifier.spendVerify(proof, [commitment]);
}

export async function verifySig(
  address: string,
  provider: Signer,
  s: string,
  R: [string, string],
  A: [string, string],
  message: string
) {
  const verifier = MultiAssetShieldedPool__factory.connect(address, provider);

  await verifier.sigVerify(s, R, A, message);
}

export class MaspContract {
  constructor(private provider: Signer, private address: string) {}

  async deposit(
    spends: SpendProof[],
    outputs: OutputProof[],
    Bpk: [string, string],
    assetId: string,
    amount: string,
    root: string
  ) {
    const verifier = IMasp__factory.connect(this.address, this.provider);
    return await verifier.deposit(spends, outputs, Bpk, assetId, amount, root);
  }

  async withdraw(
    spends: SpendProof[],
    outputs: OutputProof[],
    Bpk: [string, string],
    assetId: string,
    amount: string,
    root: string
  ) {
    const verifier = IMasp__factory.connect(this.address, this.provider);
    return await verifier.withdraw(spends, outputs, Bpk, assetId, amount, root);
  }

  async transact(
    spends: SpendProof[],
    outputs: OutputProof[],
    Bpk: [string, string],
    root: string
  ) {
    const verifier = IMasp__factory.connect(this.address, this.provider);
    return await verifier.transact(spends, outputs, Bpk, root);
  }
}

export type OutputProof = {
  proof: string;
  commitment: string;
  valueCommitment: [string, string];
  encryptedOutput: string;
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

export function toAssetIdentifier(name: string) {
  return BigInt("0x" + Buffer.from(name, "utf-8").toString("hex"));
}

export async function toAssetGenerator(assetIdentifier: bigint) {
  await ensurePoseidon();
  return poseidonHash([assetIdentifier]);
}

export function getAsset(name: string) {
  const assetIdentifier = toAssetIdentifier(name);
  return toAssetGenerator(assetIdentifier);
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

  function getV(asset: string) {
    const V = G.multiply(BigInt(asset));
    return V;
  }

  function valcommit(n: Note) {
    const r = getRandomBigInt(253);
    const V = getV(n.asset);
    const vV =
      n.amount == 0n ? B.ExtendedPoint.ZERO : V.multiply(modN(n.amount));
    const rR = R.multiply(modN(r));
    const Vc = vV.add(rR);
    return { Vc, r };
  }

  return { G, R, modN, valcommit, getV, reddsaSign };
}

function createNote(amount: bigint, spender: string, asset: string): Note {
  const blinding = getRandomBigInt(253);
  return {
    amount,
    spender,
    asset,
    blinding: toStr(blinding),
  };
}

export type Keyset = {
  encryptionKey: string;
  publicKey: string;
  privateKey: bigint;
};

// Use this to get the public keys from a users private key
export async function getKeys(privateKey: bigint) {
  await ensurePoseidon();
  const encryptionKey = getEncryptionPublicKey(privateKey.toString(16).padStart(64, '0'));

  const publicKey = poseidonHash([privateKey]);

  return {
    encryptionKey,
    publicKey,
    privateKey: BigInt(privateKey),
  };
}

export async function buildMerkleTree(
  contract: IMasp,
) {
  const filter = contract.filters.NewCommitment();

  const events = await contract.queryFilter(filter)
  const leaves = events
    .sort((a, b) => {
      return Number(a.args?.index) - Number(b.args?.index);
    })
    .map((e) => {
      return e.args?.commitment.toString();
    });
  const t = new MerkleTree(5, leaves, {
    hashFunction: poseidonHash2,
    zeroElement:
      "21663839004416932945382355908790599225266501822907911457504978515578255421292",
  });

  return t;
}

export async function encryptNote(publicKey: string, note: Note) {
  const str = JSON.stringify({ ...note, amount: note.amount.toString() });

  return dataEncrypt(publicKey, Buffer.from(str, "utf8"));
}

export async function decryptNote(privkey: string, data: string) {
  const n: Note & { amount: string } = JSON.parse(
    dataDecrypt(privkey, data).toString("utf8")
  );
  return { ...n, amount: BigInt(n.amount) };
}

async function createProofs(
  spendList: Note[],
  outputList: Note[],
  tree: MerkleTree,
  sender: Keyset,
  receiver: Keyset
) {
  const babyJub = getBabyJubJub();
  const { R, modN, valcommit, getV } = getInitialPoints(babyJub);
  const spendProofs: SpendProof[] = [];
  const outputProofs: OutputProof[] = [];

  let totalRandomness = 0n;

  for (let n of spendList) {
    const nc = await notecommitment(n);
    const { Vc, r } = valcommit(n);
    const root = `${tree.root}`;
    const index = tree.indexOf(nc);
    const pathElements = tree.path(index).pathElements.map((e) => e.toString());
    const nullifier = await nullifierHash(
      toStr(sender.privateKey),
      n,
      BigInt(index)
    );
    const Vs = getV(n.asset);
    const proofSpend = await spendProve(
      toStr(sender.privateKey),
      toStr(n.amount),
      n.blinding,
      n.asset,
      toStr(BigInt(index)),
      nullifier,
      root,
      pathElements,
      toStr(Vs.x),
      toStr(Vs.y),
      toStr(R.x),
      toStr(R.y),
      toStr(r),
      toStr(Vc.x),
      toStr(Vc.y),
      toFixedHex(nc)
    );
    totalRandomness = modN(totalRandomness + r);
    spendProofs.push({
      proof: proofSpend,
      valueCommitment: [toStr(Vc.x), toStr(Vc.y)],
      nullifier: nullifier,
    });
  }

  for (let n of outputList) {
    const nc = await notecommitment(n);
    const { Vc, r } = valcommit(n);

    const Vo = getV(n.asset);
    const proofOutput = await outputProve(
      toStr(n.amount),
      n.blinding,
      n.asset,
      n.spender,
      toStr(Vo.x),
      toStr(Vo.y),
      toStr(R.x),
      toStr(R.y),
      toStr(r),
      toStr(Vc.x),
      toStr(Vc.y)
    );
    const keyToEncryptTo =
      sender.publicKey === n.spender
        ? sender.encryptionKey
        : receiver.encryptionKey;

    const encryptedOutput = await encryptNote(keyToEncryptTo, n);

    outputProofs.push({
      proof: proofOutput,
      valueCommitment: [toStr(Vc.x), toStr(Vc.y)],
      commitment: nc,
      encryptedOutput,
    });
    totalRandomness = modN(totalRandomness - r);
  }
  // Create sig
  const bsk = totalRandomness;
  const Bpk = R.multiply(bsk);
  return { Bpk, spendProofs, outputProofs };
}

function shrtn(str: string) {
  return str.slice(0, 5) + ".." + str.slice(-5);
}

export async function transfer(
  signer: Signer,
  poolAddress: string,
  amount: bigint,
  sender: Keyset,
  receiver: Keyset,
  asset: string, // "USDC" | "WBTC" etc.
  tree: MerkleTree,
  notes: NoteStore
): Promise<ContractTransactionResponse> {
  logAction(
    "Transferring " +
      amount +
      " " +
      asset +
      " to " +
      shrtn(toFixedHex(receiver.publicKey))
  );

  if (signer.provider === null) throw new Error("Signer must have a provider");

  const masp = new MaspContract(signer, poolAddress);

  const spendList = await notes.getNotesUpTo(amount, asset);
  const totalSpent = spendList.reduce((t, note) => {
    return t + note.amount;
  }, 0n);

  const change = totalSpent - amount;

  const assetId = await getAsset(asset);
  const outputList: Note[] = [];

  outputList.push(createNote(amount, receiver.publicKey, assetId));
  if (change > 0n) {
    outputList.push(createNote(change, sender.publicKey, assetId));
  } else {
    outputList.push(createNote(0n, sender.publicKey, assetId));
  }

  const { Bpk, spendProofs, outputProofs } = await createProofs(
    spendList,
    outputList,
    tree,
    sender,
    receiver
  );

  return await masp.transact(
    spendProofs,
    outputProofs,
    [toStr(Bpk.x), toStr(Bpk.y)],
    `${tree.root}`
  );
}

function logAction(str: string) {
  console.log("\n\n");
  console.log("-----------------------------------------------");
  console.log(" " + str);
  console.log("-----------------------------------------------");
  console.log("\n\n");
}

export async function deposit(
  signer: Signer,
  poolAddress: string,
  amount: bigint,
  receiver: Keyset,
  asset: string, // "USDC" | "WBTC" etc.
  tree: MerkleTree
): Promise<ContractTransactionResponse> {
  logAction("Depositing " + amount + " " + asset);
  if (signer.provider === null) throw new Error("Signer must have a provider");

  const masp = new MaspContract(signer, poolAddress);
  const assetId = await getAsset(asset);

  const spendList: Note[] = [];
  const outputList: Note[] = [
    createNote(amount, receiver.publicKey, assetId),
    createNote(0n, receiver.publicKey, assetId),
  ];
  const { Bpk, spendProofs, outputProofs } = await createProofs(
    spendList,
    outputList,
    tree,
    receiver,
    receiver
  );

  return await masp.deposit(
    spendProofs,
    outputProofs,
    [toStr(Bpk.x), toStr(Bpk.y)],
    assetId,
    toStr(amount),
    `${tree.root}`
  );
}

export async function withdraw(
  signer: Signer,
  poolAddress: string,
  amount: bigint,
  sender: Keyset,
  receiver: Keyset,
  asset: string, // "USDC" | "WBTC" etc.
  tree: MerkleTree,
  notes: NoteStore
): Promise<ContractTransactionResponse> {
  logAction("Withdrawing " + amount + " " + asset);

  if (signer.provider === null) throw new Error("Signer must have a provider");

  const masp = new MaspContract(signer, poolAddress);

  const spendList = await notes.getNotesUpTo(amount, asset);
  const totalSpent = spendList.reduce((t, note) => {
    return t + note.amount;
  }, 0n);

  const change = totalSpent - amount;
  const assetId = await getAsset(asset);
  const outputList: Note[] = [];

  outputList.push(createNote(0n, sender.publicKey, assetId));
  if (change > 0n)
    outputList.push(createNote(change, sender.publicKey, assetId));
  else outputList.push(createNote(0n, sender.publicKey, assetId));

  const { Bpk, spendProofs, outputProofs } = await createProofs(
    spendList,
    outputList,
    tree,
    sender,
    receiver
  );

  return await masp.withdraw(
    spendProofs,
    outputProofs,
    [toStr(Bpk.x), toStr(Bpk.y)],
    assetId,
    toStr(amount),
    `${tree.root}`
  );
}

export type Note = {
  amount: bigint;
  spender: string;
  blinding: string;
  asset: string;
};

export type NoteStore = {
  // getUnspentNotes(): Record<string, Note[]>;
  getNotesUpTo(amount: bigint, asset: string): Promise<Note[]>;
};
