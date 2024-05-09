import { getRandomBigInt } from "./curve";
import { toStr } from "./utils";
import { dataDecrypt, dataEncrypt } from "./zklib";
import { z } from "zod";

export class Note {
  constructor(
    public amount: bigint,
    public spender: string,
    public blinding: string,
    public asset: string
  ) { }

  serialize() {
    return JSON.stringify({
      amount: this.amount.toString(),
      spender: this.spender,
      blinding: this.blinding,
      asset: this.asset,
    });
  }

  encrypt(publicKey: string) {
    const jsonStr = this.serialize();
    return dataEncrypt(publicKey, Buffer.from(jsonStr, "utf8"));
  }

  private static fromJsonNote({ asset, amount, blinding, spender }: JsonNote) {
    return new Note(BigInt(amount), spender, blinding, asset);
  }

  static async decrypt(privkey: string, data: string) {
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

const JsonNoteSchema = z.object({
  amount: z.string(),
  spender: z.string(),
  blinding: z.string(),
  asset: z.string(),
});

type JsonNote = z.infer<typeof JsonNoteSchema>;


