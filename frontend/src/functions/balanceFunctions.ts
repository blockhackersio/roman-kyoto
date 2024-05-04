import { Commitment } from "@/models/Commitment";
import { Note } from "@/models/Note";
import {
  decrypt,
  encrypt,
  getEncryptionPublicKey,
  EthEncryptedData,
} from "@metamask/eth-sig-util";
import { Contract, EventLog } from "web3-eth-contract";

// event NewCommitment(bytes32 commitment, uint256 index, bytes encryptedOutput);
// event NewNullifier(bytes32 nullifier);
// event PublicKey(address indexed owner, bytes key);


type Utxo = {
  commitment: Commitment;
  note: Note;
  nullifier?: string;
};


// userKey is the connected wallets private key
// Function to retrieve and filter commitments based on decrypted output
async function getUserCommitmentsAndNotes(
  userKey: string,
  contract: Contract
): Promise<{ commitments: Commitment[]; notes: Note[] }> {
  const allCommitmentEvents: EventLog[] = await contract.getPastEvents(
    "NewCommitment",
    {
      fromBlock: 0,
      toBlock: "latest",
    }
  );

  let notes: Note[] = [];
  let commitments: Commitment[] = [];

  allCommitmentEvents.forEach((event) => {
    try {
      const decryptedOutput = decrypt({
        encryptedData: event.returnValues.encryptedOutput as EthEncryptedData,
        privateKey: userKey,
      });

      const note: Note = JSON.parse(decryptedOutput);
      if (
        "amount" in note &&
        "binding" in note &&
        "spenderZKPubKey" in note &&
        "assetECPoint" in note
      ) {
        notes.push(note); // Add the note if it matches the Note structure
        commitments.push(event.returnValues as Commitment); // Add the commitment corresponding to the successful decryption and parsing
      }
    } catch (error) {
      // Handle decryption or parsing errors by not adding to the arrays
    }
  });

  return {
    commitments: commitments,
    notes: notes,
  };
}

async function getNullifiers(contract: Contract): Promise<string[]> {
  const allNullifierEvents: EventLog[] = await contract.getPastEvents(
    "NewNullifier",
    {
      fromBlock: 0,
      toBlock: "latest",
    }
  );

  // Extract the nullifier value from each event and return them as an array
  const nullifiers: string[] = allNullifierEvents.map(
    (event) => event.returnValues.nullifier as string
  );
  return nullifiers;
}

async function generateNullifier(
  commitment: Commitment,
  signature: string
): Promise<string> {
  const nullifier = poseidonHash([
    commitment.commitment,
    commitment.index,
    signature,
  ]);
  return nullifier;
}

async function checkIfCommitmentSpent(
  commitment: Commitment[],
  allNullifiers: string[],
  privateKey: string
) {
  // Import generate nullifier (use the commitment to generate the nullifier) 
  // check if it matches any nullifiers in the list
  commitment.forEach((commitment) => {
    const nullifier = await generateNullifier(commitment, privateKey);
    if (nullifiers.includes(nullifier)) {
      // Commitment has been spent
    }
  }
}


// Function to get the balance of the user
async function getBalance(commitments: Commitment[], notes: Note[], nullifiers: string[], privateKey: string) {
  // Check if the commitment has been spent
  const unspentCommitments = commitments.filter((commitment) => {
    checkIfCommitmentSpent(commitment, nullifiers, privateKey);
  });
}
