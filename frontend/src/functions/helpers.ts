import { Commitment } from "@/models/Commitment";
import { poseidonHash } from "./poseidon";

function generateNullifier(
  commitment: Commitment,
  signature: BigNumberish
): string {
  const nullifier = poseidonHash([
    commitment.commitment,
    commitment.index,
    signature,
  ]);
  return nullifier;
}
