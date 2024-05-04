import {
  decrypt,
  encrypt,
  getEncryptionPublicKey,
  EthEncryptedData,
} from "@metamask/eth-sig-util";
import { Contract, ethers } from "ethers";

import { Note, NoteStore } from "../../../protocol/src/index";

export type NewCommitment = {
  type: "NewCommitment";
  commitment: string;
  index: number;
  encryptedOutput: string;
};

export type NewNullifier = {
  type: "NewNullifier";
  nullifier: string;
};

function attemptNoteDecryption(
  event: NewCommitment,
  userPrivateKey: string
): Note | undefined {
  try {
    const decryptedOutput = decrypt({
      encryptedData: event.encryptedOutput as EthEncryptedData,
      privateKey: userPrivateKey,
    });
    const note: Note = JSON.parse(decryptedOutput);
    return note;
  } catch (error) {
    return undefined;
  }
}

// event NewCommitment(bytes32 commitment, uint256 index, bytes encryptedOutput);
// event NewNullifier(bytes32 nullifier);
// event PublicKey(address indexed owner, bytes key);

// Get users notes for a given contract
async function getUserNotes(
  contract: Contract,
  userPrivateKey: string
): Promise<Note[]> {
  const allCommitmentEvents = await contract.queryFilter(
    contract.filters.NewCommitment()
  );
  const notes: Note[] = [];

  allCommitmentEvents.forEach((event) => {
    if (event.args) {
      // Manually map Result to NewCommitment
      const newCommitment: NewCommitment = {
        type: "NewCommitment",
        commitment: event.args.commitment,
        index: event.args.index,
        encryptedOutput: event.args.encryptedOutput,
      };
      const note: Note | undefined = attemptNoteDecryption(
        newCommitment,
        userPrivateKey
      );
      if (note) {
        notes.push(note);
      }
    }
  });
  return notes;
}

// Get all nullifiers for a given contract
async function getNullifiers(contract: Contract): Promise<string[]> {
  const allNullifierEvents = await contract.queryFilter(
    contract.filters.NewNullifier()
  );

  return allNullifierEvents.map((event) => {
    if (event.args) {
      return event.args.nullifier;
    }
  });
}

// Generate commitment of a given note
function getCommitment(note: Note): string {
  // Poseidon hash of asset, pubkey, binding, asset
  return commitment;
}

// Generate nullifier of a given note
function generateNullifier(note: Note): string {
  const commitment = getCommitment(note);
  // const signature = privateKey
  // Poseidon hash of commitment,
}

function removeNullifiedNotes(notes: Note[], nullifiers: string[]): Note[] {
  return notes.filter((note) => !nullifiers.includes(note.nullifier));
}

// Get the shielded balance of each asset for a user
function getShieldedBalances(notes: Note[]): Map<string, bigint> {
  // Sums the amounts of all notes for each asset
  return notes.reduce((balances, note) => {
    const currentBalance = balances.get(note.asset) || BigInt(0);
    balances.set(note.asset, currentBalance + BigInt(note.amount));
    return balances;
  }, new Map<string, bigint>());
}
