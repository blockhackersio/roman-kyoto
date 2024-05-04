import {
  decrypt,
  encrypt,
  getEncryptionPublicKey,
  EthEncryptedData,
} from "@metamask/eth-sig-util";
import { Contract, EventLog } from "web3-eth-contract";

async function retrieveNullifiers(
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

  const decryptedOutputs: string[] = allEvents
    .map((event) => {
      try {
        const decryptedOutput: string = decrypt({
          encryptedData: event.returnValues.encryptedOutput as EthEncryptedData,
          privateKey: userKey,
        });
        // Check if the decrypted output matches the Note pattern!!!!!
        if (decryptedOutput.includes("specific user identifier or pattern")) {
          return decryptedOutput; // Return the decrypted output if it matches the pattern
        }
      } catch (error) {
        // Decryption failed, return null without logging
      }
      return null; // Return null if decryption fails or pattern does not match
    })
    .filter((output): output is string => output !== null); // Filter out null values

  return decryptedOutputs;
}
