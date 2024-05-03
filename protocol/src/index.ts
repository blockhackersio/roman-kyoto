// export your SDK here

import { Provider } from "ethers";
import { CircomExample__factory } from "../typechain-types";
import { generateGroth16Proof } from "./zklib";
export * from "./config";

export class CircomExample {
  constructor(private provider: Provider, private address: string) {}

  async prepareTransfer(
    amount: bigint,
    spendKey: string,
    asset: string,// "USDC" | "WBTC" etc.
    notes: NoteStore,
  ): Promise<unknown> {
    return ''
  }


  async prepareDeposit(
    amount: bigint,
    spendKey: string,
    asset: string,// "USDC" | "WBTC" etc.
    notes: NoteStore,
  ): Promise<unknown> {
    return ''
  }

  async prepareWithdraw(
    amount: bigint,
    recipient: string,
    asset: string,// "USDC" | "WBTC" etc.
    notes: NoteStore,
  ): Promise<unknown> {
    return ''
  }
}

export type Note = {
  amount: string;
  spender: string;
  blinding: string;
  asset: string;
}

export type NoteStore = {
  getUnspentUtxos():Record<string,Note[]>;
  getUtxosUpTo(amount:bigint, asset: string):Promise<Note[]>;
}
