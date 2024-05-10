import { Signer } from "ethers";
import { IMasp__factory, MultiAssetShieldedPool__factory } from "../typechain-types";
import { OutputProof, SpendProof } from ".";


export async function outputVerify(
  address: string,
  provider: Signer,
  proof: string,
  commitment: string
) {
  const verifier = MultiAssetShieldedPool__factory.connect(address, provider);
  return await verifier.outputVerify(proof, [commitment]);
}

export async function spendVerify(
  address: string,
  provider: Signer,
  proof: string,
  commitment: string
) {
  const verifier = MultiAssetShieldedPool__factory.connect(address, provider);
  return await verifier.spendVerify(proof, [commitment]);
}

export class MaspContract {
  constructor(private provider: Signer, private address: string) {}

  async deposit(
    spends: SpendProof[],
    outputs: OutputProof[],
    Bpk: [string, string],
    assetId: string,
    amount: string,
    root: string,
    sigRx: string,
    sigRy: string,
    sigS: string,
    hash: string
  ) {
    const verifier = IMasp__factory.connect(this.address, this.provider);
    return await verifier.deposit(
      spends,
      outputs,
      Bpk,
      assetId,
      amount,
      root,
      [sigRx, sigRy],
      sigS,
      hash
    );
  }

  async withdraw(
    spends: SpendProof[],
    outputs: OutputProof[],
    Bpk: [string, string],
    assetId: string,
    amount: string,
    root: string,
    sigRx: string,
    sigRy: string,
    sigS: string,
    hash: string
  ) {
    const verifier = IMasp__factory.connect(this.address, this.provider);
    return await verifier.withdraw(
      spends,
      outputs,
      Bpk,
      assetId,
      amount,
      root,
      [sigRx, sigRy],
      sigS,
      hash
    );
  }

  async transact(
    spends: SpendProof[],
    outputs: OutputProof[],
    Bpk: [string, string],
    root: string,
    sigRx: string,
    sigRy: string,
    sigS: string,
    hash: string
  ) {
    const verifier = IMasp__factory.connect(this.address, this.provider);
    return await verifier.transact(
      spends,
      outputs,
      Bpk,
      root,
      [sigRx, sigRy],
      sigS,
      hash
    );
  }
}

