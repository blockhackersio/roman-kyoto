import { ContractTransactionReceipt, Interface, LogDescription } from "ethers";
import { Note, decryptNote, getAsset, nullifierHash } from ".";
import { IMasp__factory } from "../typechain-types";

type MetaNote = { note: Note; nullifier: string; index: bigint };

function getNoteCommitmentEvents(receipt: ContractTransactionReceipt | null) {
  if (!receipt) throw new Error("receipt was null!");

  const decodedLogs = receipt?.logs
    .map((log) => {
      try {
        const sm = new Interface(IMasp__factory.abi);
        return sm.parseLog(log);
      } catch (error) {
        // This log was not from your contract, or not an event your contract emits
        return null;
      }
    })
    .filter((log) => log !== null);
  return decodedLogs.filter((c) => c !== null) as LogDescription[];
}


export class MaspWallet {
  constructor(
    private privateKey: string,
    private notes: MetaNote[],
    private nullifiers: string[]
  ) {}

  getUnspentNotes() {
    return this.notes.filter((note) => {
      return !this.nullifiers.includes(note.nullifier);
    });
  }

  async getNotesUpTo(amount: bigint, asset: string) {
    const assetId = await getAsset(asset);
    const notesOfAsset = this.getUnspentNotes().filter(
      (n) => n.note.asset === assetId
    );
    let total = 0n;
    let notes: Note[] = [];
    for (let { note } of notesOfAsset) {
      if (note.amount === 0n) continue;
      total += note.amount;
      notes.push(note);
      if (total > amount) break;
    }
    return notes;
  }

  async updateFromReceipt(receipt: ContractTransactionReceipt | null) {
    const events = getNoteCommitmentEvents(receipt);

    for (let ev of events) {
      if (ev.name === "NewCommitment") {
        const cypher = ev.args[2] as string;
        const index = ev.args[1] as bigint;
        try {
          const note = await decryptNote(this.privateKey, cypher);
          const nullifier = await nullifierHash(
            "0x" + this.privateKey,
            note,
            index
          );
          this.notes.push({
            index: ev.args[1],
            nullifier,
            note,
          });
        } catch (err) {}
      }
      if (ev.name === "NewNullifier") {
        this.nullifiers.push(ev.args[0].toString());
      }
    }
  }

  async getBalance(asset: string) {
    const assetId = await getAsset(asset);
    const notesOfAsset = this.getUnspentNotes().filter(
      (n) => n.note.asset === assetId
    );
    return notesOfAsset.reduce((total, note) => {
      return total + note.note.amount;
    }, 0n);
  }

  async logBalances() {
    const assets = ["USDC", "WBTC"];
    const balances = await Promise.all(
      assets.map((asset) => this.getBalance(asset))
    );
    console.log("Balance");
    console.table(
      balances.map((bal, i) => ({
        Asset: assets[i],
        Balance: bal,
      }))
    );
  }

  static fromPrivateKey(privateKey: string) {
    return new MaspWallet(privateKey, [], []);
  }
}