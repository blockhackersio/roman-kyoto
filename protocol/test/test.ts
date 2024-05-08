import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

import {
  Note,
  buildMerkleTree,
  decryptNote,
  deposit,
  getAsset,
  getKeys,
  nullifierHash,
  transfer,
  withdraw,
} from "../src/index";
import { ensurePoseidon } from "../src/poseidon";
import { IMasp__factory } from "../typechain-types";
import {
  ContractTransactionReceipt,
  Interface,
  LogDescription,
  Wallet,
} from "ethers";
import { deployAll } from "./utils";

export async function getMultiAssetShieldedPoolContract() {}

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

type WalletStore = {
  notes: { note: Note; nullifier: string; index: bigint }[];
  nullifiers: string[];
  privateKey: string;
  getNotesUpTo: (amount: bigint, asset: string) => Promise<Note[]>;
  getBalance: (asset: string) => Promise<bigint>;
  logBalances: () => Promise<void>;
};

async function extractToStore(
  hexPrivate: string,
  store: WalletStore,
  receipt: ContractTransactionReceipt | null
) {
  const events = getNoteCommitmentEvents(receipt);

  for (let ev of events) {
    if (ev.name === "NewCommitment") {
      const cypher = ev.args[2] as string;
      const index = ev.args[1] as bigint;
      try {
        const note = await decryptNote(hexPrivate, cypher);
        const nullifier = await nullifierHash(
          "0x" + store.privateKey,
          note,
          index
        );
        store.notes.push({
          index: ev.args[1],
          nullifier,
          note,
        });
      } catch (err) {}
    }
    if (ev.name === "NewNullifier") {
      store.nullifiers.push(ev.args[0].toString());
    }
  }
  return store;
}

function getUnspentNotes(store: WalletStore) {
  return store.notes.filter((note) => {
    return !store.nullifiers.includes(note.nullifier);
  });
}

function createStore(hexPrivate: string) {
  let store: WalletStore = {
    notes: [],
    nullifiers: [],
    privateKey: hexPrivate,
    async getNotesUpTo(amount: bigint, asset: string) {
      const assetId = await getAsset(asset);
      const notesOfAsset = getUnspentNotes(store).filter(
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
    },
    async getBalance(asset: string) {
      const assetId = await getAsset(asset);
      const notesOfAsset = getUnspentNotes(store).filter(
        (n) => n.note.asset === assetId
      );
      return notesOfAsset.reduce((total, note) => {
        return total + note.note.amount;
      }, 0n);
    },
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
    },
  };
  return store;
}

it("integrate", async () => {
  await ensurePoseidon();

  const { MASP } = await loadFixture(deployAll);
  let tree = await buildMerkleTree(MASP);

  const spenderPrivate = Wallet.createRandom().privateKey;
  const receiverPrivate = Wallet.createRandom().privateKey;
  const receiver = await getKeys(BigInt(receiverPrivate));
  const spender = await getKeys(BigInt(spenderPrivate));
  const hexPrivate = spender.privateKey.toString(16);

  let store = createStore(hexPrivate);

  await store.logBalances();

  let tx = await deposit(
    await ethers.provider.getSigner(),
    await MASP.getAddress(),
    100n,
    spender,
    "USDC",
    tree
  );

  let receipt = await tx.wait();
  store = await extractToStore(hexPrivate, store, receipt);
  await store.logBalances();

  tx = await deposit(
    await ethers.provider.getSigner(),
    await MASP.getAddress(),
    2n,
    spender,
    "WBTC",
    tree
  );

  receipt = await tx.wait();
  store = await extractToStore(hexPrivate, store, receipt);
  await store.logBalances();

  tree = await buildMerkleTree(MASP);
  tx = await transfer(
    await ethers.provider.getSigner(),
    await MASP.getAddress(),
    10n,
    spender,
    receiver,
    "USDC",
    tree,
    store
  );

  receipt = await tx.wait();
  store = await extractToStore(hexPrivate, store, receipt);
  await store.logBalances();
  tree = await buildMerkleTree(MASP);

  tx = await withdraw(
    await ethers.provider.getSigner(),
    await MASP.getAddress(),
    50n,
    spender,
    receiver,
    "USDC",
    tree,
    store
  );
  receipt = await tx.wait();
  store = await extractToStore(hexPrivate, store, receipt);
  await store.logBalances();
});
