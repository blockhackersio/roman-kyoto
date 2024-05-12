import {
  ContractTransactionReceipt,
  Interface,
  LogDescription,
  Wallet,
} from "ethers";
import { IMasp__factory, RK, RK__factory } from "../typechain-types";
import { Note } from "./note";
import { ValueCommitment } from "./vc";
import { getKeys } from "./keypair";
import { buildMerkleTree } from "./utils";
import { TypedEventLog } from "../typechain-types/common";

type MetaNote = { note: Note; nullifier: string; index: bigint };
type MetaBridge = { vc: ValueCommitment; chainId: bigint; destination: string };

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
function getNoteCommitmentEventsFromFilter(events: TypedEventLog<any>[]) {
  const decodedLogs = events
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
    private bridgeOuts: MetaBridge[],
    private nullifiers: string[],
    private name: string = "unknown"
  ) {
  }

  getUnspentNotes() {
    return this.notes.filter((note) => {
      return !this.nullifiers.includes(note.nullifier);
    });
  }

  getBridgeOuts() {
    return this.bridgeOuts;
  }
  async getKeys() {
    return await getKeys(BigInt(this.privateKey));
  }

  async getTree(contract: RK) {
    return await buildMerkleTree(contract);
  }

  async getNotesUpTo(amount: bigint, asset: string) {
    const notesOfAsset = this.getUnspentNotes().filter(
      (n) => n.note.asset.getSymbol() === asset
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
  async updateFromEvents(events: LogDescription[]) {
    for (let ev of events) {
      if (ev.name === "NewCommitment") {
        const index = ev.args[1] as bigint;
        const cypher = ev.args[2] as string;
        console.log({cypher, privateKey: this.privateKey})
        try {
          const note = Note.decrypt(this.privateKey, cypher);
          const nullifier = await note.nullifier("0x" + this.privateKey, index);
          this.notes.push({
            index: ev.args[1],
            nullifier,
            note,
          });
        } catch (err) {
          console.log("failed decryption");
        }
      }
      if (ev.name === "NewBridgeout") {
        const encrypted = ev.args[1];
        const chainId = ev.args[2];
        const destination = ev.args[3];
        this.bridgeOuts.push({
          vc: ValueCommitment.decrypt(this.privateKey, encrypted),
          chainId,
          destination,
        });
      }
      if (ev.name === "NewNullifier") {
        this.nullifiers.push(ev.args[0].toString());
      }
    }
  }

  async updateFromReceipt(receipt: ContractTransactionReceipt | null) {
    const events = getNoteCommitmentEvents(receipt);
    this.updateFromEvents(events);
  }

  async updateFromContract(address: string, wallet: Wallet) {
    const RK = RK__factory.connect(address, wallet);
    const fromBlock = 0;
    const toBlock = "latest";
    const NewCommitment = RK.filters.NewCommitment();
    const NewBridgeout = RK.filters.NewBridgeout();
    const NewNullifier = RK.filters.NewNullifier();

    const events = [
      ...(
        await Promise.all([
          RK.queryFilter(NewCommitment, fromBlock, toBlock),
          RK.queryFilter(NewBridgeout, fromBlock, toBlock),
          RK.queryFilter(NewNullifier, fromBlock, toBlock),
        ])
      ).flatMap((a) => a as any),
    ];
    await this.updateFromEvents(getNoteCommitmentEventsFromFilter(events));
  }

  async getBalance(asset: string) {
    const notesOfAsset = this.getUnspentNotes().filter((n) => {
      return n.note.asset.getSymbol() === asset;
    });
    return notesOfAsset.reduce((total, note) => {
      return total + note.note.amount;
    }, 0n);
  }
  async logBalances() {
    const assets = ["USDC", "WBTC"];
    const balances = await Promise.all(
      assets.map((asset) => this.getBalance(asset))
    );
    console.log(`\n Balances(${this.name})`);
    console.table(
      balances.map((bal, i) => ({
        Asset: assets[i],
        Balance: bal,
      }))
    );
    this.bridgeOuts.length > 0 &&
      (() => {
        console.log("Transfers to other chains");
        console.table(
          this.bridgeOuts.map(({ vc, ...b }) => ({
            ...b,
            amount: vc.amount,
            asset: vc.asset.getSymbol(),
          }))
        );
      })();
  }

  static async fromWallet(name: string, wallet: Wallet) {
    const keys = await getKeys(BigInt(wallet.privateKey));
    return MaspWallet.fromPrivateKey("0x"+BigInt(keys.privateKey).toString(16), name);
  }

  static fromPrivateKey(privateKey: string, name?: string) {
    return new MaspWallet(privateKey, [], [], [], name);
  }
}
