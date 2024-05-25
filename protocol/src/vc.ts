import { Asset } from "./asset";
import { B, R, getRandomBigInt, modN } from "./curve";
import { Note, toXY } from "./note";
import { dataDecrypt, dataEncrypt } from "./zklib";
import { z } from "zod";

function base64Encode(str: string): string {
  return Buffer.from(str, "utf-8").toString("base64");
}

function base64Decode(encodedStr: string): string {
  return Buffer.from(encodedStr, "base64").toString("utf-8");
}

// TODO: This should have basic addition and subtraction function which adds randomness as well as value
export class ValueCommitment {
  constructor(
    public asset: Asset,
    public amount: bigint,
    private r: bigint = getRandomBigInt(253)
  ) {
    // console.log("ValueCommitment from " + asset.getSymbol() + ", " + amount);
  }

  encrypt(publicKey: string) {
    const jsonStr = this.serialize();
    return dataEncrypt(publicKey, Buffer.from(jsonStr, "utf8"));
  }

  serialize64() {
    return base64Encode(this.serialize());
  }

  serialize() {
    return JSON.stringify({
      r: this.r.toString(),
      asset: this.asset.getSymbol(),
      amount: this.amount.toString(),
    });
  }

  async toPoint() {
    const V = await this.asset.getValueBase();
    const vV =
      this.amount == 0n ? B.ExtendedPoint.ZERO : V.multiply(modN(this.amount));
    const rR = R.multiply(modN(this.r));
    return vV.add(rR);
  }

  getRandomness() {
    return this.r;
  }

  async toXY(): Promise<[string, string]> {
    return toXY(await this.toPoint());
  }

  async toRXY(): Promise<[string, string, string]> {
    const r = this.getRandomness().toString();
    const [x, y] = await this.toXY();
    return [r, x, y];
  }

  static deserialize(data: string) {
    const parsed: JsonValueCommitment = JSON.parse(data);
    return ValueCommitment.fromJsonValueCommitment(parsed);
  }

  static deserialize64(data: string) {
    return this.deserialize(base64Decode(data));
  }

  static decrypt(privkey: string, data: string) {
    return ValueCommitment.deserialize(
      dataDecrypt(privkey, data).toString("utf8")
    );
  }

  static fromNote(note: Note) {
    return new ValueCommitment(note.asset, note.amount);
  }

  static create(asset: string, amount: bigint) {
    return new ValueCommitment(Asset.fromTicker(asset), BigInt(amount));
  }

  static fromJsonValueCommitment(data: JsonValueCommitment) {
    return new ValueCommitment(
      Asset.fromTicker(data.asset),
      BigInt(data.amount),
      BigInt(data.r)
    );
  }
}

const JsonCommitmentSchema = z.object({
  amount: z.string(),
  asset: z.string(),
  r: z.string(),
});

type JsonValueCommitment = z.infer<typeof JsonCommitmentSchema>;
