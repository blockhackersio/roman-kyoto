import { EthEncryptedData, decrypt, encrypt } from "@metamask/eth-sig-util";

export function toFixedHex(
  number: number | string | bigint | Uint8Array,
  length = 32
) {
  let result =
    "0x" +
    (number instanceof Uint8Array
      ? Array.from(number)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
      : BigInt(number).toString(16)
    ).padStart(length * 2, "0");
  if (result.indexOf("-") > -1) {
    result = "-" + result.replace("-", "");
  }
  return result;
}

export function dataEncrypt(encryptionKey: string, bytes: Buffer) {
  const d = encrypt({
    publicKey: encryptionKey.replace(/^0x/, ""),
    data: bytes.toString("base64"),
    version: "x25519-xsalsa20-poly1305",
  });
  return packEncryptedMessage(d);
}

export function dataDecrypt(privkey: string, data: string): Buffer {
  return Buffer.from(
    decrypt({
      encryptedData: unpackEncryptedMessage(data),
      privateKey: privkey.replace(/^0x/, ""),
    }),
    "base64"
  );
}

export function packEncryptedMessage(encryptedData: EthEncryptedData) {
  const nonceBuf = Buffer.from(encryptedData.nonce, "base64");
  const ephemPublicKeyBuf = Buffer.from(encryptedData.ephemPublicKey, "base64");
  const ciphertextBuf = Buffer.from(encryptedData.ciphertext, "base64");
  const messageBuff = Buffer.concat([
    Buffer.alloc(24 - nonceBuf.length),
    nonceBuf,
    Buffer.alloc(32 - ephemPublicKeyBuf.length),
    ephemPublicKeyBuf,
    ciphertextBuf,
  ]);

  return "0x" + messageBuff.toString("hex");
}

export function unpackEncryptedMessage(encryptedMessage: string) {
  if (encryptedMessage.slice(0, 2) === "0x") {
    encryptedMessage = encryptedMessage.slice(2);
  }

  const messageBuff = Buffer.from(encryptedMessage, "hex");
  const nonceBuf = messageBuff.slice(0, 24);
  const ephemPublicKeyBuf = messageBuff.slice(24, 56);
  const ciphertextBuf = messageBuff.slice(56);

  return {
    version: "x25519-xsalsa20-poly1305",
    nonce: nonceBuf.toString("base64"),
    ephemPublicKey: ephemPublicKeyBuf.toString("base64"),
    ciphertext: ciphertextBuf.toString("base64"),
  };
}
