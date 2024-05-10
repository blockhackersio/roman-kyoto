import { ContractTransactionResponse, Signer } from "ethers";
import { toFixedHex } from "./zklib";
import MerkleTree from "fixed-merkle-tree";
import { Note } from "./note";
import { shrtn, toStr } from "./utils";
import { Asset } from "./asset";
import { prepareTx } from "./tx";
import { Keyset } from "./keypair";
import { IMasp__factory } from "../typechain-types";
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

export type Bridge = {
  proof: string; // must know that value commitment is valid
  chainId: string;
  destination: string;
  encryptedOutput: string;
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
    tree,
    sender,
    receiver
  );
  const masp = IMasp__factory.connect(poolAddress, signer);

  return await masp.transact(
    spends,
    outputs,
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
    tree,
    receiver,
    receiver
  );

  const masp = IMasp__factory.connect(poolAddress, signer);

  return await masp.deposit(
    spends,
    outputs,
    [toStr(Bpk.x), toStr(Bpk.y)],
    await Asset.fromTicker(asset).getIdHash(),
    toStr(amount),
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
    tree,
    sender,
    receiver
  );

  const masp = IMasp__factory.connect(poolAddress, signer);

  return await masp.withdraw(
    spends,
    outputs,
    [toStr(Bpk.x), toStr(Bpk.y)],
    await Asset.fromTicker(asset).getIdHash(),
    toStr(amount),
    `${tree.root}`,
    [toStr(sig.R.x), toStr(sig.R.y)],
    toStr(sig.s),
    hash
  );
}

export async function bridge(
  signer: Signer,
  fromPoolAddress: string,
  toPoolAddress: string,
  amount: bigint,
  sender: Keyset,
  receiver: Keyset,
  asset: string, // "USDC" | "WBTC" etc.
  tree: MerkleTree,
  chainId: string,
  notes: NoteStore
): Promise<ContractTransactionResponse> {
  logAction("Bridging " + amount + " " + asset + " to " + toPoolAddress);
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

  const bridgeNote = {
    chainId,
    destination: toPoolAddress,
    note: Note.create(amount, sender.publicKey, asset),
  };

  const { sig, Bpk, spends, outputs, bridges, hash } = await prepareTx(
    spendList,
    outputList,
    [bridgeNote],
    tree,
    sender,
    receiver
  );

    const masp = IMasp__factory.connect(fromPoolAddress, signer);
  
  //   return await masp.bridge(
  //      spends,
  //      outputs,
  //      bridges,
  //      // XXX: fix this....  
  // //     `${tree.root}`,
  // //     [toStr(sig.R.x), toStr(sig.R.y)],
  // //     toStr(sig.s),
  // //     hash,
  // //     [toStr(mintComm.Vc.x), toStr(mintComm.Vc.y)]
  // //   );
}

export type NoteStore = {
  // getUnspentNotes(): Record<string, Note[]>;
  getNotesUpTo(amount: bigint, asset: string): Promise<Note[]>;
};
