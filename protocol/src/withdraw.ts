import { ContractTransactionResponse, Signer } from "ethers";
import { Keyset } from "./keypair";
import MerkleTree from "fixed-merkle-tree";
import { NoteStore } from "./types";
import { logAction } from "./log";
import { Note } from "./note";
import { prepareTx } from "./tx";
import { IMasp__factory } from "../typechain-types";
import { Asset } from "./asset";
import { toStr } from "./utils";

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

