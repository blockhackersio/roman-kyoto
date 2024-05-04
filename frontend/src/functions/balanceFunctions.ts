import { Commitment } from "@/models/Commitment";
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

// userKey is the connected wallets private key
// Function to retrieve and filter commitments based on decrypted output
async function getUserCommitments(
  userKey: string,
  contract: Contract
): Promise<string[]> {
  const allCommitmentEvents: EventLog[] = await contract.getPastEvents(
    "NewCommitment",
    {
      fromBlock: 0,
      toBlock: "latest",
    }
  );

  // Can change this to decryptedNotes?? - the output is just a note?
  const decryptedOutputs: string[] = allCommitmentEvents
    .map((event) => {
      try {
        const decryptedOutput: string = decrypt({
          encryptedData: event.returnValues.encryptedOutput as EthEncryptedData,
          privateKey: userKey,
        });
        // Check if the decrypted output matches the Note pattern!!!!!
        // Attempt to parse string into a type
        if (decryptedOutput.includes("specific user identifier or pattern")) {
          return decryptedOutput;
        }
      } catch (error) {}
      return null;
    })
    .filter((output): output is string => output !== null);

  return decryptedOutputs;
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
