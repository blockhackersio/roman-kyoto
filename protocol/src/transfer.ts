import { ContractTransactionResponse, Signer } from "ethers";
import { Keyset } from "./keypair";
import MerkleTree from "fixed-merkle-tree";
import { NoteStore } from "./types";
import { logAction } from "./log";
import { shrtn, toStr } from "./utils";
import { toFixedHex } from "./zklib";
import { Note } from "./note";
import { prepareTx } from "./tx";
import { IMasp__factory } from "../typechain-types";
import { Asset } from "./asset";

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

