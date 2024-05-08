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

  const transferAmountUSDC = parseUnits("11", 6);

  const spender = await getKeys(BigInt(`0x${process.env.PRIVATE_KEY!}`));
  const hexPrivate = spender.privateKey.toString(16);

  // store is how we track our users encrypted notes/balances
  let store = createStore(hexPrivate);
  await store.logBalances();

  const depositReceipt =
    "0xfb64d4a9c324f6c595d5f6aca455f183875c12525094d11eb41e282f8062853c"; // TODO change me

  const depositEventInfo = (await Deployer.provider.getTransactionReceipt(
    depositReceipt
  )) as ContractTransactionReceipt;

  if (depositEventInfo === null) throw Error("ERRR");

  // store is how we track our users encrypted notes/balances
  store = await extractToStore(hexPrivate, store, depositEventInfo);

  // the receiver of the note we are spending
  const receiver = await getKeys(
    // IRL we don't need this, handing for testing
    BigInt(`0x${process.env.RECEIVER_PRIVATE_KEY}`)
  );

  // for our tx events - we need to know the block number of the tx to build our tree
  const fromBlockNumber = 6664311; // TODO change me

  // we submit the tree as part of any deposit, transact or withdraw function call
  let tree = await buildMerkleTree(RK as any as Contract, fromBlockNumber);

  // submit our transfer transaction
  const tx = await transfer(
    Deployer,
    RKAddress,
    transferAmountUSDC,
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
