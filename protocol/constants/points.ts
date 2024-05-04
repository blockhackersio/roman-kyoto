import { ExtPointType } from "@noble/curves/abstract/edwards";
import { BabyJub, Note } from "../src";
import { ensurePoseidon, poseidonHash } from "../src/poseidon";
import { Field, mod } from "@noble/curves/abstract/modular";

export const getRandomBigInt = (bits: number) => {
  const bytes = Math.ceil(bits / 8);
  const extraBits = bytes * 8 - bits; // Extra bits we get due to byte alignment
  const arraySize = Math.ceil(bits / 32);
  const randomValues = new Uint32Array(arraySize);
  crypto.getRandomValues(randomValues);

  let randomBigInt = BigInt(0);
  for (let i = 0; i < arraySize - 1; i++) {
    randomBigInt = (randomBigInt << BigInt(32)) | BigInt(randomValues[i]);
  }

  // For the last element, only shift the necessary bits
  randomBigInt =
    (randomBigInt << BigInt(32 - extraBits)) |
    (BigInt(randomValues[arraySize - 1]) >> BigInt(extraBits));

  return randomBigInt;
};

export const getRandomBits = (count: number, bits: number) => {
  return new Array(count).fill(0).map(() => getRandomBigInt(bits));
};

export const stringToBytes = (str: string) => {
  return BigInt("0x" + Buffer.from(str, "utf-8").toString("hex"));
};

export const hashToField = async (bytes: bigint) => {
  await ensurePoseidon();
  return poseidonHash([bytes]);
};

export const getAsset = async (assetString: string) => {
  const bytes = stringToBytes(assetString);
  return await hashToField(bytes);
};

export const toFixedHex = (
  number: number | string | bigint | Uint8Array,
  length = 32
) => {
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
};

export const noteCommitment = (n: Note): string => {
  return poseidonHash([n.amount, n.spender, n.blinding, n.asset]);
};

// a kind of class function, that takes a Baby Jub curve + a random seed to hash points for value commitments
export const getInitialPoints = (B: BabyJub, sharedRandom: bigint) => {
  // baby jub generator point
  const G = B.ExtendedPoint.fromAffine({
    x: B.CURVE.Gx,
    y: B.CURVE.Gy,
  });

  // common random value to start
  const R = G.multiply(sharedRandom);

  // gets the value point/commitment
  const getV = (asset: string) => {
    const V = G.multiply(BigInt(asset));
    return V;
  };

  const getValueCommitment = (n: Note, Random: ExtPointType, r: bigint) => {
    // don't know if this check will work, but worth a try
    if (Random !== R)
      throw new Error(
        "Random point is not the same as the shared random point"
      );

    // get the value point for the given asset
    const V = getV(n.asset);
    // multiply the value point by the value of this note
    const vV = V.multiply(modN(n.amount));
    // multiply the random for this note, by the shared random point of this jubjub curve
    const rR = Random.multiply(modN(r));

    // get our final value commitment point
    const Vc = vV.add(rR);
    return Vc;
  };

  const modN = (a: bigint) => mod(a, B.CURVE.n);

  return { G, R, modN, getValueCommitment };
};
