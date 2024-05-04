## How to retrieve commitments (deposits)

1. Get all NewCommitment events emitted by contract
2. Decrypt all of the NewCommitment event's 'encryptedOutput' using the connected wallets private key

   - If an 'encryptedOutput' correctly decrypts to a "Note" type, then it means the commitment belongs to the connected wallet. Hence add the Note to the list of the users deposits
   - If it does not decrypt correctly then the commitment does not belong to the user

3. return list of desposits (Notes)

## How to check which commitments have been spent (withdrawals)

1. Get all NewNullifier events emitted by contract
2. Get the list of all commitments belonging to the connected wallet (detailed above)
3. For each of the commitments belonging to the user
   - Generate the commitments Nullifier (how to generate nullifiers explained later)
   - Check if the generated Nullifier exists in the retrieved list of NewNullifiers from the contracts events
     - If the generated Nullifier exists in the list then the commitment has been spent
     - If not, then the commitment has not been spent and is still a valid deposit
