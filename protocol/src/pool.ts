import { Signer } from "ethers";
import { MultiAssetShieldedPool__factory } from "../typechain-types";

// These are more for testing
export async function outputVerify(
  address: string,
  provider: Signer,
  proof: string,
  commitment: string
) {
  const verifier = MultiAssetShieldedPool__factory.connect(address, provider);
  return await verifier.outputVerify(proof, [commitment]);
}

// These are more for testing
export async function spendVerify(
  address: string,
  provider: Signer,
  proof: string,
  commitment: string
) {
  const verifier = MultiAssetShieldedPool__factory.connect(address, provider);
  return await verifier.spendVerify(proof, [commitment]);
}
