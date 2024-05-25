import { ContractTransactionResponse, Signer } from "ethers";
import { Keyset } from "./keypair";
import MerkleTree from "fixed-merkle-tree";
import { NoteStore } from "./types";
import { logAction } from "./log";
import { shrtn, toStr } from "./utils";
import { Note } from "./note";
import { prepareTx } from "./tx";
import { IMasp__factory } from "../typechain-types";
import { Asset } from "./asset";

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

  const { txData } = await prepareTx(
    spendList,
    outputList,
    [],
    bridgeOutList,
    tree,
    sender,
    sender,
    asset,
    amount
  );

  const masp = IMasp__factory.connect(sourcePool, signer);

  return await masp.transact(
    // spends,
    // outputs,
    // [],
    // bridgeOuts,
    // await Asset.fromTicker(asset).getIdHash(),
    // toStr(0n),
    // [toStr(Bpk.x), toStr(Bpk.y)],
    // `${tree.root}`,
    // [toStr(sig.R.x), toStr(sig.R.y)],
    // toStr(sig.s),
    // hash
    txData
  );
}
