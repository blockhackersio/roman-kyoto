import { getEncryptionPublicKey } from "@metamask/eth-sig-util";
import { ensurePoseidon, poseidonHash } from "./poseidon";

export type Keyset = {
  encryptionKey: string;
  publicKey: string;
  privateKey: bigint;
};

// TODO: generate key from metamask entropy + passed user password
// TODO: then hash out different private keys for encryption and hash sigs
// Use this to get the public keys from a users private key
export async function getKeys(privateKey: bigint) {
  await ensurePoseidon();
  const encryptionKey = getEncryptionPublicKey(
    privateKey.toString(16).padStart(64, "0")
  );

  const publicKey = poseidonHash([privateKey]);

  const keys = {
    encryptionKey,
    publicKey,
    privateKey: BigInt(privateKey),
  };

  console.log({ keys });
  return keys;
}
