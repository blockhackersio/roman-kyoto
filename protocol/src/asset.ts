import { G } from "./curve";

export function getV(asset: string) {
  const V = G.multiply(BigInt(asset));
  return V;
}
