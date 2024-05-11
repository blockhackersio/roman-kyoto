import { twistedEdwards } from "@noble/curves/abstract/edwards";
import { Field, mod } from "@noble/curves/abstract/modular";
import { keccak_256 } from "@noble/hashes/sha3";
import { randomBytes } from "@noble/hashes/utils";

export type BabyJub = ReturnType<typeof getBabyJubJub>;
export function getBabyJubJub() {
  return twistedEdwards({
    // Params: a, d
    a: BigInt("168700"),
    d: BigInt("168696"),
    // Finite field 𝔽p over which we'll do calculations
    Fp: Field(
      BigInt(
        "21888242871839275222246405745257275088548364400416034343698204186575808495617"
      )
    ),
    // Subgroup order: how many points curve has
    n: BigInt(
      "21888242871839275222246405745257275088614511777268538073601725287587578984328"
    ),
    // Cofactor
    h: BigInt(8),
    // Base point (x, y) aka generator point
    Gx: BigInt(
      "995203441582195749578291179787384436505546430278305826713579947235728471134"
    ),
    Gy: BigInt(
      "5472060717959818805561601436314318772137091100104008585924551046643952123905"
    ),
    hash: keccak_256,
    randomBytes,
  } as const);
}

export const B = getBabyJubJub();

function getInitialPoints(B: BabyJub) {
  const G = B.ExtendedPoint.fromAffine({
    x: B.CURVE.Gx,
    y: B.CURVE.Gy,
  });
  const BASE = B.ExtendedPoint.BASE;
  const BASE8 = BASE.multiply(8n);

  return { G, BASE, BASE8 };
}
export const { G, BASE, BASE8 } = getInitialPoints(B);

// hashToCurve("__ROMAN_KYOTO_R")
export const R = B.ExtendedPoint.fromAffine({
  x: 6822643173076850086669063981200675861034234425876310494228829770726075732893n,
  y: 9156654395656950371299901424185770236726741503478930161752204964343448620279n,
});

export function getRandomBigInt(bits: number) {
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
}

export function getRandomBits(count: number, bits: number) {
  return new Array(count).fill(0).map(() => getRandomBigInt(bits));
}
export const modP = (a: bigint) => mod(a, B.CURVE.p);
export const modN = (a: bigint) => mod(a, B.CURVE.n);
