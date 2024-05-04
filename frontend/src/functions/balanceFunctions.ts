import {
  decrypt,
  encrypt,
  getEncryptionPublicKey,
  EthEncryptedData,
} from "@metamask/eth-sig-util";
import { Contract, EventLog } from "web3-eth-contract";

// userKey is just private key
// Function to retrieve and filter commitments based on decrypted output
async function getUserCommitments(
  userKey: string,
  contract: Contract
): Promise<string[]> {
  const allEvents: EventLog[] = await contract.getPastEvents("NewCommitment", {
    fromBlock: 0,
    toBlock: "latest",
  });

  const decryptedOutputs: string[] = allEvents
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

async function getNullifiers(
  userKey: string,
  contract: Contract
): Promise<string[]> {
  const allNullifiers: EventLog[] = await contract.getPastEvents(
    "NewNullifier",
    {
      fromBlock: 0,
      toBlock: "latest",
    }
  );
}
