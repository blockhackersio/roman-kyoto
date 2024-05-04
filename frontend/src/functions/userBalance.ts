// Takes a list of commitments belonging to the user and returns the balance of the user
export async function userBalance(commitments: NewCommitment[]) {
  return commitments.reduce(
    (total, commitment) => total + commitment.amount,
    0
  );
}
