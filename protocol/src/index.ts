import {
  AbiCoder,
  ContractTransactionResponse,
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
import { ExtPointType } from "@noble/curves/abstract/edwards";
import { mod } from "@noble/curves/abstract/modular";
import { randomBytes } from "@noble/hashes/utils";
import { ensurePoseidon, poseidonHash, poseidonHash2 } from "./poseidon";
import { bytesToNumberBE } from "@noble/curves/abstract/utils";
import MerkleTree from "fixed-merkle-tree";
import { getEncryptionPublicKey } from "@metamask/eth-sig-util";
import { B, G, getRandomBigInt, R } from "./curve";
import { Note } from "./note";
import { toStr } from "./utils";
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
  constructor(private provider: Signer, private address: string) { }

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

const modN = (a: bigint) => mod(a, B.CURVE.n);

function getV(asset: string) {
  const V = G.multiply(BigInt(asset));
  return V;
}

function valcommit(n: Note) {
  const r = getRandomBigInt(253);
  const V = getV(n.asset);
  const vV = n.amount == 0n ? B.ExtendedPoint.ZERO : V.multiply(modN(n.amount));
  const rR = R.multiply(modN(r));
  const Vc = vV.add(rR);
  return { Vc, r };
}

export type Keyset = {
  encryptionKey: string;
  publicKey: string;
  privateKey: bigint;
};

// Use this to get the public keys from a users private key
export async function getKeys(privateKey: bigint) {
  await ensurePoseidon();
  const encryptionKey = getEncryptionPublicKey(
    privateKey.toString(16).padStart(64, "0")
  );

  const publicKey = poseidonHash([privateKey]);

  return {
    encryptionKey,
    publicKey,
    privateKey: BigInt(privateKey),
  };
}

export async function buildMerkleTree(contract: IMasp) {
  const filter = contract.filters.NewCommitment();

  const events = await contract.queryFilter(filter);
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

  outputList.push(Note.create(amount, receiver.publicKey, assetId));
  if (change > 0n) {
    outputList.push(Note.create(change, sender.publicKey, assetId));
  } else {
    outputList.push(Note.create(0n, sender.publicKey, assetId));
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
    Note.create(amount, receiver.publicKey, assetId),
    Note.create(0n, receiver.publicKey, assetId),
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

  outputList.push(Note.create(0n, sender.publicKey, assetId));
  if (change > 0n)
    outputList.push(Note.create(change, sender.publicKey, assetId));
  else outputList.push(Note.create(0n, sender.publicKey, assetId));

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

export type NoteStore = {
  // getUnspentNotes(): Record<string, Note[]>;
  getNotesUpTo(amount: bigint, asset: string): Promise<Note[]>;
};
