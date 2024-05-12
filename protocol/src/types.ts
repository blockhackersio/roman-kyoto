import { Note } from "./note";

export type Output = {
  proof: string;
  commitment: string;
  valueCommitment: [string, string];
  encryptedOutput: string;
};

export type Spend = {
  proof: string;
  nullifier: string;
  valueCommitment: [string, string];
};

export type BridgeOut = {
  proof: string; // must know that value commitment is valid
  chainId: string;
  destination: string;
  encryptedOutput: string;
  valueCommitment: [string, string];
};

export type BridgeIn = {
  valueCommitment: [string, string];
};

export type NoteStore = {
  getNotesUpTo(amount: bigint, asset: string): Promise<Note[]>;
};
