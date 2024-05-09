import { G } from "./curve";
import { ensurePoseidon, poseidonHash } from "./poseidon";

export class Asset {
  constructor(private symbol: string) { }

  getIdentifier() {
    return BigInt("0x" + Buffer.from(this.symbol, "utf-8").toString("hex"));
  }

  getSymbol() {
    return this.symbol;
  }

  async getIdentifierHash() {
    await ensurePoseidon();
    return poseidonHash([this.getIdentifier()]);
  }

  async getValueBase() {
    const assetHash = await this.getIdentifierHash();
    return G.multiply(BigInt(assetHash));
  }

  static fromTicker(symbol: string) {
    return new Asset(symbol);
  }
}
