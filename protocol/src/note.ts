import { getRandomBigInt } from "./curve";
import { toStr } from "./utils";

function create_Note(
  amount: bigint,
  spender: string,
  asset: string
): Note {
  const blinding = getRandomBigInt(253);
  return {
    amount,
    spender,
    asset,
    blinding: toStr(blinding),
  };
}

export class Note {
  constructor(
    public amount: bigint,
    public spender: string,
    public blinding: string,
    public asset: string
  ) { }
  static create(amount: bigint, spender: string, asset: string): Note {
    return create_Note(amount, spender, asset);
  }
}
