import { ExtPointType } from "@noble/curves/abstract/edwards";
import { randomBytes } from "@noble/hashes/utils";
import { AbiCoder, keccak256 } from "ethers";
import { B, modN } from "./curve";
import { bytesToNumberBE } from "@noble/curves/abstract/utils";

export function reddsaSign(
  G: ExtPointType, // generator
  a: bigint, // private key
  A: ExtPointType, // public key
  msgByteStr: string // message
) {
  // B - base point
  // a - secret key
  // A - Public Key
  // T - random bytes
  // M - message bytes
  // --- sign ------
  // r = H(T||A||M)
  // R = r * B
  // S = r + H(R||A||M) * a
  // R = H(T||A||M) * B
  // S = H(T||A||M) + H(R||A||M) * a
  // --- verify ----
  // c = H(R||A||M)
  // -B * S + R + c * A == identity
  const abi = new AbiCoder();

  const hash = B.CURVE.hash;
  const T = randomBytes(32);
  const r = modN(
    bytesToNumberBE(
      hash(
        abi.encode(
          ["bytes", "uint256", "uint256", "bytes"],
          [T, A.x, A.y, msgByteStr]
        )
      )
    )
  );
  const R = G.multiply(r);
  const cData = abi.encode(
    ["uint256", "uint256", "uint256", "uint256", "bytes"],
    [R.x, R.y, A.x, A.y, msgByteStr]
  );

  const hashed = keccak256(cData);

  const c = modN(BigInt(hashed));
  const s = modN(r + c * a);
  return { R, s };
}

export function reddsaVerify(
  G: ExtPointType,
  A: ExtPointType,
  sig: { R: ExtPointType; s: bigint },
  msgByteStr: string
) {
  const abi = new AbiCoder();
  const cData = abi.encode(
    ["uint256", "uint256", "uint256", "uint256", "bytes"],
    [sig.R.x, sig.R.y, A.x, A.y, msgByteStr]
  );
  const hashed = keccak256(cData);
  const c = modN(BigInt(hashed));

  // Check sig on frontend
  return G.negate()
    .multiply(sig.s)
    .add(sig.R)
    .add(A.multiply(c))
    .equals(B.ExtendedPoint.ZERO);
}
