import { G, modN } from "./curve";
import { ensurePoseidon, poseidonHash } from "./poseidon";
console.log("G.x", G.x);
console.log("G.y", G.y);
export class Asset {
  constructor(private symbol: string) { }

  private getId() {
    return BigInt("0x" + Buffer.from(this.symbol, "utf-8").toString("hex"));
  }

  getSymbol() {
    return this.symbol;
  }

  async getIdHash() {
    await ensurePoseidon();
    const id = this.getId();
    return modN(BigInt(poseidonHash([id])));
  }

  async getValueBase() {
    const assetHash = await this.getIdHash();
    return G.multiply(modN(BigInt(assetHash)));
  }

  static fromTicker(symbol: string) {
    return new Asset(symbol);
  }
}