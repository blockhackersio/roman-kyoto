import { ContractTransactionResponse, Signer } from "ethers";
import { Keyset } from "./keypair";
import { ValueCommitment } from "./vc";
import MerkleTree from "fixed-merkle-tree";
import { logAction } from "./log";
import { Note } from "./note";
import { prepareTx } from "./tx";
import { IMasp__factory } from "../typechain-types";
import { Asset } from "./asset";
import { toStr } from "./utils";

export async function claim(
  signer: Signer,
  poolAddress: string,
  receiver: Keyset,
  vc: ValueCommitment,
  tree: MerkleTree
): Promise<ContractTransactionResponse> {
  logAction("Claiming " + vc.amount + " " + vc.asset.getSymbol());
  if (signer.provider === null) throw new Error("Signer must have a provider");

  // If we are only depositing there are no spend notes
  const spendList: Note[] = [];
  const outputList: Note[] = [
    Note.create(vc.amount, receiver.publicKey, vc.asset.getSymbol()),
    // Need to add a zero note to ensure there are multiples of 2
    Note.create(0n, receiver.publicKey, vc.asset.getSymbol()),
  ];

  const { sig, Bpk, spends, outputs, bridgeIns, hash } = await prepareTx(
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
    bridgeIns,
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

