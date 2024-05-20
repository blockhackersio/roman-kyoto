import { ContractTransactionResponse, Signer } from "ethers";
import { Keyset } from "./keypair";
import MerkleTree from "fixed-merkle-tree";
import { logAction } from "./log";
import { Note } from "./note";
import { prepareTx } from "./tx";
import { IMasp__factory } from "../typechain-types";
import { Asset } from "./asset";
import { toStr } from "./utils";
import { TxDataStruct } from "../typechain-types/contracts/RK";

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

  const { txData } = await prepareTx(
    spendList,
    outputList,
    [],
    [],
    tree,
    receiver,
    receiver,
    asset,
    amount
  );

  const masp = IMasp__factory.connect(poolAddress, signer);


  return await masp.transact(txData);
}
