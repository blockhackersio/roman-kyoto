import { ContractTransactionResponse, Signer } from "ethers";
import { toFixedHex } from "./zklib";
import MerkleTree from "fixed-merkle-tree";
import { Note } from "./note";
import { shrtn, toStr } from "./utils";
import { Asset } from "./asset";
import { prepareTx } from "./tx";
import { Keyset } from "./keypair";
import { IMasp__factory } from "../typechain-types";
import { ValueCommitment } from "./vc";
export * from "./config";

export type Output = {
  proof: string;
  commitment: string;
  valueCommitment: [string, string];
  encryptedOutput: string;
};

export type Spend = {
  proof: string;
  nullifier: string;
  valueCommitment: [string, string];
};

export type BridgeOut = {
  proof: string; // must know that value commitment is valid
  chainId: string;
  destination: string;
  encryptedOutput: string;
  valueCommitment: [string, string];
};

export type BridgeIn = {
  valueCommitment: [string, string];
};

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

  const spendList = await notes.getNotesUpTo(amount, asset);
  const totalSpent = spendList.reduce((t, note) => {
    return t + note.amount;
  }, 0n);

  const change = totalSpent - amount;

  const outputList: Note[] = [];

  outputList.push(Note.create(amount, receiver.publicKey, asset));
  outputList.push(
    Note.create(change > 0n ? change : 0n, sender.publicKey, asset)
  );

  const { sig, Bpk, spends, outputs, hash } = await prepareTx(
    spendList,
    outputList,
    [],
    [],
    tree,
    sender,
    receiver
  );
  const masp = IMasp__factory.connect(poolAddress, signer);

  return await masp.transact(
    spends,
    outputs,
    [],
    [],
    await Asset.fromTicker(asset).getIdHash(),
    0n,
    [toStr(Bpk.x), toStr(Bpk.y)],
    `${tree.root}`,
    [toStr(sig.R.x), toStr(sig.R.y)],
    toStr(sig.s),
    hash
  );
}

function logAction(str: string) {
  console.log("-----------------------------------------------");
  console.log(" " + str);
  console.log("-----------------------------------------------");
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

  // If we are only depositing there are no spend notes
  const spendList: Note[] = [];
  const outputList: Note[] = [
    Note.create(amount, receiver.publicKey, asset),
    // Need to add a zero note to ensure there are multiples of 2
    Note.create(0n, receiver.publicKey, asset),
  ];

  const { sig, Bpk, spends, outputs, hash } = await prepareTx(
    spendList,
    outputList,
    [],
    [],
    tree,
    receiver,
    receiver
  );

  const masp = IMasp__factory.connect(poolAddress, signer);

  return await masp.transact(
    spends,
    outputs,
    [],
    [],
    await Asset.fromTicker(asset).getIdHash(),
    toStr(amount),
    [toStr(Bpk.x), toStr(Bpk.y)],
    `${tree.root}`,
    [toStr(sig.R.x), toStr(sig.R.y)],
    toStr(sig.s),
    hash
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

  const spendList = await notes.getNotesUpTo(amount, asset);
  const totalSpent = spendList.reduce((t, note) => {
    return t + note.amount;
  }, 0n);

  const change = totalSpent - amount;
  const outputList: Note[] = [];

  // create change note
  outputList.push(
    Note.create(change > 0n ? change : 0n, sender.publicKey, asset)
  );

  // create a zero note so that we have a multiple of 2 notes
  outputList.push(Note.create(0n, sender.publicKey, asset));

  const { sig, Bpk, spends, outputs, hash } = await prepareTx(
    spendList,
    outputList,
    [],
    [],
    tree,
    sender,
    receiver
  );

  const masp = IMasp__factory.connect(poolAddress, signer);

  return await masp.transact(
    spends,
    outputs,
    [],
    [],
    await Asset.fromTicker(asset).getIdHash(),
    toStr(-amount),
    [toStr(Bpk.x), toStr(Bpk.y)],
    `${tree.root}`,
    [toStr(sig.R.x), toStr(sig.R.y)],
    toStr(sig.s),
    hash
  );
}

export async function bridge(
  signer: Signer,
  sourcePool: string,
  destinationPool: string,
  chainId: string,
  amount: bigint,
  sender: Keyset,
  receiver: Keyset,
  asset: string, // "USDC" | "WBTC" etc.
  tree: MerkleTree,
  notes: NoteStore
): Promise<ContractTransactionResponse> {
  logAction(
    "Bridging " +
      amount +
      " " +
      asset +
      " to " +
      chainId +
      ":" +
      shrtn(destinationPool)
  );

  if (signer.provider === null) throw new Error("Signer must have a provider");

  const spendList = await notes.getNotesUpTo(amount, asset);
  const totalSpent = spendList.reduce((t, note) => {
    return t + note.amount;
  }, 0n);

  const change = totalSpent - amount;
  const outputList: Note[] = [];

  // create change note
  outputList.push(
    Note.create(change > 0n ? change : 0n, sender.publicKey, asset)
  );

  // create a zero note so that we have a multiple of 2 notes
  outputList.push(Note.create(0n, sender.publicKey, asset));

  const bridgeOutList = [
    {
      note: Note.create(amount, receiver.publicKey, asset),
      chainId,
      destination: destinationPool,
    },
  ];

  const { sig, Bpk, spends, outputs, bridgeOuts, hash } = await prepareTx(
    spendList,
    outputList,
    [],
    bridgeOutList,
    tree,
    sender,
    sender
  );

  const masp = IMasp__factory.connect(sourcePool, signer);

  return await masp.transact(
    spends,
    outputs,
    [],
    bridgeOuts,
    await Asset.fromTicker(asset).getIdHash(),
    toStr(0n),
    [toStr(Bpk.x), toStr(Bpk.y)],
    `${tree.root}`,
    [toStr(sig.R.x), toStr(sig.R.y)],
    toStr(sig.s),
    hash
  );
}

export async function receive(
  signer: Signer,
  poolAddress: string,
  receiver: Keyset,
  vc: ValueCommitment,
  tree: MerkleTree
): Promise<ContractTransactionResponse> {
  logAction("Receiving " + vc.amount + " " + vc.asset.getSymbol());
  if (signer.provider === null) throw new Error("Signer must have a provider");

  // If we are only depositing there are no spend notes
  const spendList: Note[] = [];
  const outputList: Note[] = [
    Note.create(vc.amount, receiver.publicKey, vc.asset.getSymbol()),
    // Need to add a zero note to ensure there are multiples of 2
    Note.create(0n, receiver.publicKey, vc.asset.getSymbol()),
  ];

  const { sig, Bpk, spends, outputs, hash } = await prepareTx(
    spendList,
    outputList,
    [vc],
    [],
    tree,
    receiver,
    receiver
  );

  const masp = IMasp__factory.connect(poolAddress, signer);

  return await masp.transact(
    spends,
    outputs,
    [],
    [],
    await Asset.fromTicker("___NIL_ASSET").getIdHash(),
    toStr(0n),
    [toStr(Bpk.x), toStr(Bpk.y)],
    `${tree.root}`,
    [toStr(sig.R.x), toStr(sig.R.y)],
    toStr(sig.s),
    hash
  );
}

export type NoteStore = {
  getNotesUpTo(amount: bigint, asset: string): Promise<Note[]>;
};
