import hre, { ethers } from "hardhat";
import {
  Contract,
  ContractTransactionReceipt,
  Interface,
  LogDescription,
  parseEther,
  parseUnits,
} from "ethers";

import { RK__factory, RK } from "../typechain-types";
import {
  Note,
  buildMerkleTree,
  decryptNote,
  getAsset,
  getKeys,
  nullifierHash,
  transfer,
  withdraw,
} from "../src";

type WalletStore = {
  notes: { note: Note; nullifier: string; index: bigint }[];
  nullifiers: string[];
  privateKey: string;
  getNotesUpTo: (amount: bigint, asset: string) => Promise<Note[]>;
  getBalance: (asset: string) => Promise<bigint>;
  logBalances: () => Promise<void>;
};

const getUnspentNotes = (store: WalletStore) => {
  return store.notes.filter((note) => {
    return !store.nullifiers.includes(note.nullifier);
  });
};

const createStore = (hexPrivate: string) => {
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
};

const getNoteCommitmentEvents = (
  receipt: ContractTransactionReceipt | null
) => {
  if (!receipt) throw new Error("receipt was null!");

  const decodedLogs = receipt?.logs
    .map((log) => {
      try {
        const sm = new Interface(RK__factory.abi);
        return sm.parseLog(log);
      } catch (error) {
        // This log was not from your contract, or not an event your contract emits
        return null;
      }
    })
    .filter((log) => log !== null);
  return decodedLogs.filter((c) => c !== null) as LogDescription[];
};

const extractToStore = async (
  hexPrivate: string,
  store: WalletStore,
  receipt: ContractTransactionReceipt | null
) => {
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
};

async function main() {
  const { deployments } = hre;
  const [Deployer] = await ethers.getSigners();

  const RKAddress = (await deployments.get("RK")).address;

  // approve for USDC and WBTC
  const RK = new Contract(
    RKAddress,
    RK__factory.abi,
    Deployer
  ) as unknown as RK;

  const transferAmountUSDC = parseUnits("69", 6);

  const spender = await getKeys(BigInt(`0x${process.env.PRIVATE_KEY!}`));
  const hexPrivate = spender.privateKey.toString(16);

  // store is how we track our users encrypted notes/balances
  let store = createStore(hexPrivate);
  await store.logBalances();

  const depositReceipt =
    "0xcf15f254a59ea5126e3893c1c9382d22d764b53dd3a2c3a99ea71cd31bda563a";

  const r = (await Deployer.provider.getTransactionReceipt(
    depositReceipt
  )) as ContractTransactionReceipt;

  if (r === null) throw Error("ERRR");

  store = await extractToStore(hexPrivate, store, r);

  const transferReceipt =
    "0xe8caaf12d3484ce6b8d0897509ab4d6b51595bce1a7375e30e3c42971278452c";

  const w = (await Deployer.provider.getTransactionReceipt(
    transferReceipt
  )) as ContractTransactionReceipt;

  if (w === null) throw Error("ERRR");

  store = await extractToStore(hexPrivate, store, w);

  const receiver = await getKeys(
    BigInt(`0x${process.env.RECEIVER_PRIVATE_KEY}`)
  );

  let tree = await buildMerkleTree(RK as any as Contract);

  const withdrawalAmount = parseUnits("2", 6);

  // and, we can withdraw them too
  const tx = await withdraw(
    Deployer,
    RKAddress,
    withdrawalAmount,
    spender,
    receiver,
    "USDC",
    tree,
    store
  );

  console.log(tx);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
