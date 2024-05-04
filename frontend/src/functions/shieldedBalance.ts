import {
  decrypt,
  encrypt,
  getEncryptionPublicKey,
  EthEncryptedData,
} from "@metamask/eth-sig-util";
import { Contract, ethers } from "ethers";

import {
  Note,
  NoteStore,
  notecommitment,
  nullifierHash,
} from "../../../protocol/src/index";

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

// Need to fix to however it was encrypted (haven't checked yet)
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
export async function getUserUtxos(
  contract: Contract,
  userPrivateKey: string
): Promise<Utxo[]> {
  const allCommitmentEvents = await contract.queryFilter(
    contract.filters.NewCommitment()
  );
  const Utxos: Utxo[] = [];

  // For each NewCommitment event, attempt to decrypt the note using the user's private key
  // If note is successfully decrypted, add it to the user's UTXOs
  await allCommitmentEvents.forEach(async (event) => {
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
        // Generate the nullifier of the commitment - used to check if a note has been spent
        const nullifier = await generateNullifier(
          userPrivateKey,
          note,
          BigInt(newCommitment.index)
        );
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

// Get all spent nullifiers for a given contract
export async function getSpentNullifiers(
  contract: Contract
): Promise<string[]> {
  const allNullifierEvents = await contract.queryFilter(
    contract.filters.NewNullifier()
  );
  return allNullifierEvents.map((event) => event.args?.nullifier);
}

// Generate commitment of a given note
async function generateCommitment(note: Note): Promise<string> {
  // Poseidon hash of asset, pubkey, binding, asset
  // const commitment = poseidonHash([note.amount, userPublicKey, note.blinding, note.asset]);
  // const commitment = await notecommitment(note);
  // return commitment;
}

// Generate nullifier of a given note
async function generateNullifier(
  privateKey: string,
  note: Note,
  index: bigint
): Promise<string> {
  // Poseidon hash of commitment, index, private key
  // const nullifier = poseidonHash([commitment.commitment, commitment.index, userPrivateKey]);
  // const nullifier = await nullifierHash(privateKey, note, index);
  // return nullifier;
}

// Get the shielded balance of each asset for a user
export function calculateShieldedBalances(
  utxos: Utxo[],
  spentNullifiers: string[]
): Map<string, bigint> {
  // Filter out spent utxos - (utxos with nullifiers that exist in spent nullifiers array)
  const unspentUtxos = utxos.filter(
    (utxo) => !spentNullifiers.includes(utxo.nullifier)
  );

  // Sums the amounts of all notes for each asset
  return unspentUtxos.reduce((balances, utxo) => {
    const currentBalance = balances.get(utxo.note.asset) || BigInt(0);
    balances.set(utxo.note.asset, currentBalance + BigInt(utxo.note.amount));
    return balances;
  }, new Map<string, bigint>());
}
