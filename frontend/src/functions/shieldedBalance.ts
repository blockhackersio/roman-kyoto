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

export type Utxo = {
  commitment: NewCommitment;
  note: Note;
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

// Get users Utxos for a given contract
async function getUserUtxos(
  contract: Contract,
  userPrivateKey: string
): Promise<Utxo[]> {
  const allCommitmentEvents = await contract.queryFilter(
    contract.filters.NewCommitment()
  );
  const Utxos: Utxo[] = [];

  allCommitmentEvents.forEach((event) => {
    if (event.args) {
      const newCommitment: NewCommitment = {
        type: "NewCommitment",
        commitment: event.args.commitment,
        index: event.args.index,
        encryptedOutput: event.args.encryptedOutput,
      };
      // attempt to decrypt the note using the user's private key (if it fails, note doesn't belong to user)
      const note: Note | undefined = attemptNoteDecryption(
        newCommitment,
        userPrivateKey
      );
      // If note is successfully decrypted, add it to the user's UTXOs
      if (note) {
        // Generate the nullifier of the note
        const nullifier = generateNullifier(note);
        const utxo: Utxo = {
          commitment: newCommitment,
          note: note,
          nullifier: nullifier,
        };
        Utxos.push(utxo);
      }
    }
  });
  return Utxos;
}

// Generate commitment of a given note
function getCommitment(note: Note, userPublicKey: string): string {
  // Poseidon hash of asset, pubkey, binding, asset
  // const commitment = poseidonHash([note.amount, userPublicKey, note.blinding, note.asset]);
  // return commitment;
}

// Generate nullifier of a given note
function generateNullifier(
  commitment: NewCommitment,
  userPrivateKey: string
): string {
  // Poseidon hash of commitment, index, private key
  // const nullifier = poseidonHash([commitment.commitment, commitment.index, userPrivateKey]);
  // return nullifier;
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
