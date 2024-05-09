import { G } from "./curve";
import { ensurePoseidon, poseidonHash } from "./poseidon";

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
    return poseidonHash([this.getId()]);
  }

  async getValueBase() {
    const assetHash = await this.getIdHash();
    return G.multiply(BigInt(assetHash));
  }

  static fromTicker(symbol: string) {
    return new Asset(symbol);
  }
}
