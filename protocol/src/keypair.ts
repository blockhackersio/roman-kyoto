import { getEncryptionPublicKey } from "@metamask/eth-sig-util";
import { ensurePoseidon, poseidonHash } from "./poseidon";

export type Keyset = {
  encryptionKey: string;
  publicKey: string;
  privateKey: bigint;
};

// Use this to get the public keys from a users private key
export async function getKeys(privateKey: bigint) {
  await ensurePoseidon();
  const encryptionKey = getEncryptionPublicKey(
    privateKey.toString(16).padStart(64, "0")
  );

  const publicKey = poseidonHash([privateKey]);

  return {
    encryptionKey,
    publicKey,
    privateKey: BigInt(privateKey),
  };
}


