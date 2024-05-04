
// import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ethers, ignition } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

import MerkleTree from "fixed-merkle-tree";
import CircomExampleModule from "../ignition/modules/CircomExample";
import {
  BabyJub,
  CircomStuff,
  Note,
  NoteStore,
  OutputProof,
  SpendProof,
  buildMerkleTree,
  decryptNote,
  deposit,
  encryptNote,
  getAsset,
  getBabyJubJub,
  getInitialPoints,
  getKeys,
  getRandomBigInt,
  getRandomBits,
  notecommitment,
  nullifierHash,
  toStr,
  transfer,
  withdraw,
} from "../src/index";
import { ensurePoseidon, poseidonHash, poseidonHash2 } from "../src/poseidon";
import { generateGroth16Proof, toFixedHex } from "../src/zklib";
import { keccak_256 } from "@noble/hashes/sha3";
import { ExtPointType, twistedEdwards } from "@noble/curves/abstract/edwards";
import { randomBytes } from "@noble/hashes/utils";
import { Field, mod } from "@noble/curves/abstract/modular";
import { CircomExample__factory } from "../typechain-types";
import {
  AbiCoder,
  Contract,
  ContractTransactionReceipt,
  Interface,
  LogDescription,
  Provider,
  Signer,
  Wallet,
  keccak256,
} from "ethers";
import { bytesToNumberBE, ensureBytes } from "@noble/curves/abstract/utils";
import hasherArtifact from "../contracts/generated/Hasher.json";
async function deployVerifierFixture() {
  return ignition.deploy(CircomExampleModule);
}

export async function getCircomExampleContract() {
  const { verifier } = await loadFixture(deployVerifierFixture);
  const Hasher = await ethers.getContractFactory(
    hasherArtifact.abi,
    hasherArtifact.bytecode
  );
  const hasher = await Hasher.deploy();
  const tx = await hasher.waitForDeployment();
  const signer = await ethers.provider.getSigner();
  const hasherAddr = await tx.getAddress();
  const address = await verifier.getAddress();
  const v = CircomExample__factory.connect(address, signer);
  await v.setHasherAddress(hasherAddr);
  const circomExample = new CircomStuff(
    await ethers.provider.getSigner(),
    address
  );
  return circomExample;
}


function getNoteCommitmentEvents(receipt: ContractTransactionReceipt | null) {
  if (!receipt) throw new Error("receipt was null!");

  const decodedLogs = receipt?.logs
    .map((log) => {
      try {
        const sm = new Interface(CircomExample__factory.abi);
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
      } catch (err) { }
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

it("integrate", async () => {
  await ensurePoseidon();

  const contract = await getCircomExampleContract();
  const verifier = contract.getContract();
  let tree = await buildMerkleTree(verifier as any as Contract);

  const spenderPrivate = Wallet.createRandom().privateKey;
  const receiverPrivate = Wallet.createRandom().privateKey;
  const receiver = await getKeys(BigInt(receiverPrivate));
  const spender = await getKeys(BigInt(spenderPrivate));
  const hexPrivate = spender.privateKey.toString(16);

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
        if(note.amount === 0n) continue;
        total += note.amount;
        notes.push(note);
        if(total > amount) break;
      }
      return notes;
    },
  };

  let tx = await deposit(
    await ethers.provider.getSigner(),
    await verifier.getAddress(),
    100n,
    spender,
    "USDC",
    tree
  );

  let receipt = await tx.wait();

  store = await extractToStore(hexPrivate, store, receipt);

  tree = await buildMerkleTree(verifier as any as Contract);

  tx = await transfer(
    await ethers.provider.getSigner(),
    await verifier.getAddress(),
    10n,
    spender,
    receiver,
    "USDC",
    tree,
    store
  );
  receipt = await tx.wait();
  store = await extractToStore(hexPrivate, store, receipt);
  tree = await buildMerkleTree(verifier as any as Contract);

  tx = await withdraw(
    await ethers.provider.getSigner(),
    await verifier.getAddress(),
    50n,
    spender,
    receiver,
    "USDC",
    tree,
    store
  );
});
