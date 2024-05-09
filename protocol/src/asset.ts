import { ExtPointType } from "@noble/curves/abstract/edwards";
import { G, modN } from "./curve";
import { ensurePoseidon, poseidonHash } from "./poseidon";
import { toStr } from "./utils";

export async function hashToCurve(s: string): Promise<ExtPointType> {
  await ensurePoseidon()
  return G.multiply(
    modN(
      BigInt(
        poseidonHash([BigInt("0x" + Buffer.from(s, "utf-8").toString("hex"))])
      )
    )
  );
}

export class Asset {
  constructor(private symbol: string) {}

  getId() {
    return BigInt("0x" + Buffer.from(this.symbol, "utf-8").toString("hex"));
  }

  getSymbol() {
    return this.symbol;
  }

  async getIdHash() {
    await ensurePoseidon();
    const id = this.getId();
    return toStr(modN(BigInt(poseidonHash([id]))));
  }

  async getValueBase() {
    const assetHash = await this.getIdHash();
    return G.multiply(modN(BigInt(assetHash)));
  }

  static fromTicker(symbol: string) {
    return new Asset(symbol);
  }
}
