// export your SDK here

import { Provider, Signer } from "ethers";
import { CircomExample__factory } from "../typechain-types";
import { generateGroth16Proof } from "./zklib";
export * from "./config";

export async function transfer(
  signer: Signer,
  amount: bigint,
  spendKey: string,
  asset: string, // "USDC" | "WBTC" etc.
  notes: NoteStore
): Promise<unknown> {
  return "";
}

export async function deposit(
  signer: Signer,
  amount: bigint,
  spendKey: string,
  asset: string, // "USDC" | "WBTC" etc.
  notes: NoteStore
): Promise<unknown> {
  return "";
}

export async function withdraw(
  signer: Signer,
  amount: bigint,
  recipient: string,
  asset: string, // "USDC" | "WBTC" etc.
  notes: NoteStore
): Promise<unknown> {
  return "";
}

export type Note = {
  amount: bigint;
  spender: string;
  blinding: string;
  asset: string;
};

export type NoteStore = {
  getUnspentUtxos(): Record<string, Note[]>;
  getUtxosUpTo(amount: bigint, asset: string): Promise<Note[]>;
};
