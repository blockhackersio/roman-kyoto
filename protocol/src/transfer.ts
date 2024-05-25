import { ContractTransactionResponse, Signer } from "ethers";
import { Keyset } from "./keypair";
import MerkleTree from "fixed-merkle-tree";
import { NoteStore } from "./types";
import { logAction } from "./log";
import { shrtn } from "./utils";
import { toFixedHex } from "./zklib";
import { Note } from "./note";
import { prepareTx } from "./tx";
import { IMasp__factory } from "../typechain-types";

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

  const { txData } = await prepareTx(
    spendList,
    outputList,
    [],
    [],
    tree,
    sender,
    receiver,
    asset,
    0n
  );

  const masp = IMasp__factory.connect(poolAddress, signer);

  return await masp.transact(txData);
}
