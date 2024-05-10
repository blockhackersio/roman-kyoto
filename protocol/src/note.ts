import { ExtPointType } from "@noble/curves/abstract/edwards";
import { Asset } from "./asset";
import { getRandomBigInt } from "./curve";
import { ensurePoseidon, poseidonHash } from "./poseidon";
import { toStr } from "./utils";
import { dataDecrypt, dataEncrypt } from "./zklib";
import { z } from "zod";
import { ValueCommitment } from "./vc";

export async function signature(
  privateKey: string,
  commitment: string,
  index: bigint
): Promise<string> {
  await ensurePoseidon();
  return poseidonHash([privateKey, commitment, index]);
}

export class Note {
  public asset: Asset;

  constructor(
    public amount: bigint,
    public spender: string,
    public blinding: string,
    assetName: string
  ) {
    this.asset = Asset.fromTicker(assetName);
  }

  serialize() {
    return JSON.stringify({
      amount: this.amount.toString(),
      spender: this.spender,
      blinding: this.blinding,
      asset: this.asset.getSymbol(),
    });
  }

  encrypt(publicKey: string) {
    const jsonStr = this.serialize();
    return dataEncrypt(publicKey, Buffer.from(jsonStr, "utf8"));
  }

  async commitment() {
    await ensurePoseidon();
    return poseidonHash([
      this.amount,
      this.spender,
      this.blinding,
      await this.asset.getIdHash(),
    ]);
  }

  async nullifier(privateKey: string, index: bigint) {
    await ensurePoseidon();
    const commitment = await this.commitment();
    return poseidonHash([
      commitment,
      index,
      await signature(privateKey, commitment, index),
    ]);
  }

  private static fromJsonNote({ asset, amount, blinding, spender }: JsonNote) {
    return new Note(BigInt(amount), spender, blinding, asset);
  }

  static decrypt(privkey: string, data: string) {
    return Note.deserialize(dataDecrypt(privkey, data).toString("utf8"));
  }

  static deserialize(data: string) {
    const jsonNote = JsonNoteSchema.parse(JSON.parse(data));
    return Note.fromJsonNote(jsonNote);
  }

  static create(amount: bigint, spender: string, asset: string): Note {
    const blinding = toStr(getRandomBigInt(253));
    return new Note(amount, spender, blinding, asset);
  }
}

export function toXY(point: ExtPointType): [string, string] {
  return [toStr(point.x), toStr(point.y)];
}

const JsonNoteSchema = z.object({
  amount: z.string(),
  spender: z.string(),
  blinding: z.string(),
  asset: z.string(),
});

type JsonNote = z.infer<typeof JsonNoteSchema>;
