
type BigNumberish = string | number | bigint;
declare module "circomlibjs" {
export type BigNumberish = string | bigint | number | Uint8Array;

export type Point = [Uint8Array, Uint8Array];

export interface Poseidon {
  (arr: BigNumberish[], state?: BigNumberish, nOut?: number): Uint8Array;
  F: any;
}

export interface Signature {
  R8: Point;
  S: bigint;
}

export class SMT {
  F: any; // https://github.com/iden3/ffjavascript/blob/master/src/wasm_field1.js
  db: SMTMemDb;
  root: BigNumberish;
  hash0: (left: BigNumberish, right: BigNumberish) => Uint8Array;
  hash1: (key: BigNumberish, value: BigNumberish) => Uint8Array;

  constructor(
    db: SMTMemDb,
    root: BigNumberish,
    hash0: (left: BigNumberish, right: BigNumberish) => Uint8Array,
    hash1: (key: BigNumberish, value: BigNumberish) => Uint8Array,
    F: any,
  );

  delete(key: BigNumberish): any;

  find(key: BigNumberish): any;

  insert(key: BigNumberish, value: BigNumberish): any;

  update(key: BigNumberish, newValue: BigNumberish): any;
}

export class SMTMemDb {
  F: any; // https://github.com/iden3/ffjavascript/blob/master/src/wasm_field1.js
  nodes: any;
  root: BigNumberish;

  constructor(F: any);

  get(key: BigNumberish): any;

  getRoot(): any;

  multiDel(dels: BigNumberish[]): void;

  multiGet(keys: BigNumberish[]): any;

  multiIns(inserts: BigNumberish[]): void;

  setRoot(root: BigNumberish): void;
}

export interface BabyJub {
  F: any; // https://github.com/iden3/ffjavascript/blob/master/src/wasm_field1.js
  p: bigint;
  pm1d2: bigint;
  Generator: Point;
  Base8: Point;
  order: bigint;
  subOrder: bigint;
  A: Uint8Array;
  D: Uint8Array;

  addPoint(a: Point, b: Point): Point;

  mulPointEscalar(base: Point, e: BigNumberish): Point;

  inSubgroup(point: Point): boolean;

  inCurve(point: Point): boolean;

  packPoint(point: Point): Uint8Array;

  unpackPoint(buff: Uint8Array): Point;
}

export interface Mimc7 {
  F: any; // https://github.com/iden3/ffjavascript/blob/master/src/wasm_field1.js
  cts: Uint8Array[];

  getIV(seed?: string): bigint;

  getConstants(seed?: string, nRounds?: number): Uint8Array[];

  hash(_x_in: BigNumberish, _k: BigNumberish): Uint8Array;

  multiHash(arr: BigNumberish[], key?: BigNumberish): Uint8Array;
}

export interface MimcSponge {
  F: any; // https://github.com/iden3/ffjavascript/blob/master/src/wasm_field1.js
  cts: Uint8Array[];

  getIV(seed?: string): bigint;

  getConstants(seed?: string, nRounds?: number): Uint8Array[];

  hash(_xL_in: BigNumberish, _xR_in: BigNumberish, _k: BigNumberish): Uint8Array;

  multiHash(arr: BigNumberish[], key?: BigNumberish, numOutputs?: number): Uint8Array;
}

export interface PedersenHash {
  babyJub: BabyJub;
  bases: any[];

  baseHash(type: "blake" | "blake2b", S: any): any;

  hash(msg: Uint8Array, options?: { baseHash?: "blake" | "blake2b" }): Uint8Array;

  getBasePoint(baseHashType: "blake" | "blake2b", pointIdx: number): Point;

  padLeftZeros(idx: number, n: number): string;

  buffer2bits(buff: Uint8Array): boolean[];
}

export interface Eddsa {
  F: any; // https://github.com/iden3/ffjavascript/blob/master/src/wasm_field1.js
  babyJub: BabyJub;
  pedersenHash: PedersenHash;
  mimc7: Mimc7;
  poseidon: Poseidon;
  mimcSponge: MimcSponge;

  pruneBuffer(buff: Uint8Array): Uint8Array;

  prv2pub(prv: any): Point;

  signPedersen(prv: any, msg: Uint8Array): Signature;

  signMiMC(prv: any, msg: Uint8Array): Signature;

  signMiMCSponge(prv: any, msg: Uint8Array): Signature;

  signPoseidon(prv: any, msg: Uint8Array): Signature;

  verifyPedersen(msg: Uint8Array, sig: Signature, A: Point): boolean;

  verifyMiMC(msg: Uint8Array, sig: Signature, A: Point): boolean;

  verifyMiMCSponge(msg: Uint8Array, sig: Signature, A: Point): boolean;

  verifyPoseidon(msg: Uint8Array, sig: Signature, A: Point): boolean;

  packSignature(sig: Signature): Uint8Array;

  unpackSignature(sigBuff: Uint8Array): Signature;
}

export class evmasm {
  constructor(...args: any[]);

  add(...args: any[]): void;

  addmod(...args: any[]): void;

  address(...args: any[]): void;

  and(...args: any[]): void;

  balance(...args: any[]): void;

  blockhash(...args: any[]): void;

  byte(...args: any[]): void;

  call(...args: any[]): void;

  callcode(...args: any[]): void;

  calldatacopy(...args: any[]): void;

  calldataload(...args: any[]): void;

  calldatasize(...args: any[]): void;

  caller(...args: any[]): void;

  callvalue(...args: any[]): void;

  codecopy(...args: any[]): void;

  codesize(...args: any[]): void;

  coinbase(...args: any[]): void;

  create(...args: any[]): void;

  createTxData(...args: any[]): void;

  delegatecall(...args: any[]): void;

  difficulty(...args: any[]): void;

  div(...args: any[]): void;

  dup(...args: any[]): void;

  eq(...args: any[]): void;

  exp(...args: any[]): void;

  extcodecopy(...args: any[]): void;

  extcodesize(...args: any[]): void;

  gas(...args: any[]): void;

  gaslimit(...args: any[]): void;

  gasprice(...args: any[]): void;

  gt(...args: any[]): void;

  invalid(...args: any[]): void;

  iszero(...args: any[]): void;

  jmp(...args: any[]): void;

  jmpi(...args: any[]): void;

  keccak(...args: any[]): void;

  label(...args: any[]): void;

  log0(...args: any[]): void;

  log1(...args: any[]): void;

  log2(...args: any[]): void;

  log3(...args: any[]): void;

  log4(...args: any[]): void;

  lt(...args: any[]): void;

  mload(...args: any[]): void;

  mod(...args: any[]): void;

  msize(...args: any[]): void;

  mstore(...args: any[]): void;

  mstore8(...args: any[]): void;

  mul(...args: any[]): void;

  mulmod(...args: any[]): void;

  not(...args: any[]): void;

  number(...args: any[]): void;

  or(...args: any[]): void;

  origin(...args: any[]): void;

  pc(...args: any[]): void;

  pop(...args: any[]): void;

  push(...args: any[]): void;

  return(...args: any[]): void;

  returndatacopy(...args: any[]): void;

  returndatasize(...args: any[]): void;

  revert(...args: any[]): void;

  sdiv(...args: any[]): void;

  selfdestruct(...args: any[]): void;

  sgt(...args: any[]): void;

  sha3(...args: any[]): void;

  shor(...args: any[]): void;

  signextend(...args: any[]): void;

  sload(...args: any[]): void;

  slt(...args: any[]): void;

  smod(...args: any[]): void;

  sstore(...args: any[]): void;

  staticcall(...args: any[]): void;

  stop(...args: any[]): void;

  sub(...args: any[]): void;

  swap(...args: any[]): void;

  timestamp(...args: any[]): void;
}

export function buildBabyjub(): Promise<BabyJub>;

export function buildEddsa(): Promise<Eddsa>;

export function buildMimc7(): Promise<Mimc7>;

export function buildMimcSponge(): Promise<MimcSponge>;

export function buildPedersenHash(): Promise<PedersenHash>;

export function buildPoseidon(): Promise<Poseidon>;

export function buildPoseidonOpt(): Promise<Poseidon>;

export function buildPoseidonReference(): Promise<Poseidon>;

export function buildPoseidonWasm(module: any): void;

export function buildSMT(db: SMTMemDb, root: any): Promise<SMT>;

export function newMemEmptyTrie(): Promise<SMT>;

export namespace mimc7Contract {
  const abi: Array<{
    constant: boolean;
    inputs: Array<{
      name: string;
      type: string;
    }>;
    name: string;
    outputs: Array<{
      name: string;
      type: string;
    }>;
    payable: boolean;
    stateMutability: string;
    type: string;
  }>;

  function createCode(seed: string, n: number): any;
}

export namespace mimcSpongecontract {
  const abi: Array<{
    constant: boolean;
    inputs: Array<{
      name: string;
      type: string;
    }>;
    name: string;
    outputs: Array<{
      name: string;
      type: string;
    }>;
    payable: boolean;
    stateMutability: string;
    type: string;
  }>;

  function createCode(seed: string, n: number): any;
}

export namespace poseidonContract {
  function createCode(nInputs: number): any;

  function generateABI(nInputs: number): any;
}
}

declare module "ffjavascript" {
  export class BigBuffer {
    constructor(...args: any[]);

    set(...args: any[]): void;

    slice(...args: any[]): void;
  }

  export class ChaCha {
    constructor(...args: any[]);

    nextBool(...args: any[]): void;

    nextU32(...args: any[]): void;

    nextU64(...args: any[]): void;

    update(...args: any[]): void;
  }

  export class EC {
    constructor(...args: any[]);

    add(...args: any[]): void;

    affine(...args: any[]): void;

    double(...args: any[]): void;

    eq(...args: any[]): void;

    fromRng(...args: any[]): void;

    fromRprBE(...args: any[]): void;

    fromRprBEM(...args: any[]): void;

    fromRprCompressed(...args: any[]): void;

    fromRprLE(...args: any[]): void;

    fromRprLEJM(...args: any[]): void;

    fromRprLEM(...args: any[]): void;

    fromRprUncompressed(...args: any[]): void;

    isZero(...args: any[]): void;

    mulScalar(...args: any[]): void;

    multiAffine(...args: any[]): void;

    neg(...args: any[]): void;

    sub(...args: any[]): void;

    timesScalar(...args: any[]): void;

    toRprBE(...args: any[]): void;

    toRprBEM(...args: any[]): void;

    toRprCompressed(...args: any[]): void;

    toRprLE(...args: any[]): void;

    toRprLEJM(...args: any[]): void;

    toRprLEM(...args: any[]): void;

    toRprUncompressed(...args: any[]): void;

    toString(...args: any[]): void;
  }

  export class F1Field {
    constructor(...args: any[]);

    fromRprBE(...args: any[]): void;

    fromRprBEM(...args: any[]): void;

    fromRprLE(...args: any[]): void;

    fromRprLEM(...args: any[]): void;

    toRprBE(...args: any[]): void;

    toRprBEM(...args: any[]): void;

    toRprLE(...args: any[]): void;

    toRprLEM(...args: any[]): void;
  }

  export class F2Field {
    constructor(...args: any[]);

    add(...args: any[]): void;

    conjugate(...args: any[]): void;

    copy(...args: any[]): void;

    div(...args: any[]): void;

    double(...args: any[]): void;

    eq(...args: any[]): void;

    exp(...args: any[]): void;

    fromRng(...args: any[]): void;

    fromRprBE(...args: any[]): void;

    fromRprBEM(...args: any[]): void;

    fromRprLE(...args: any[]): void;

    fromRprLEM(...args: any[]): void;

    geq(...args: any[]): void;

    gt(...args: any[]): void;

    inv(...args: any[]): void;

    isZero(...args: any[]): void;

    leq(...args: any[]): void;

    lt(...args: any[]): void;

    mul(...args: any[]): void;

    mulScalar(...args: any[]): void;

    neg(...args: any[]): void;

    neq(...args: any[]): void;

    pow(...args: any[]): void;

    random(...args: any[]): void;

    square(...args: any[]): void;

    sub(...args: any[]): void;

    toRprBE(...args: any[]): void;

    toRprBEM(...args: any[]): void;

    toRprLE(...args: any[]): void;

    toRprLEM(...args: any[]): void;

    toString(...args: any[]): void;
  }

  export class F3Field {
    constructor(...args: any[]);

    add(...args: any[]): void;

    affine(...args: any[]): void;

    copy(...args: any[]): void;

    div(...args: any[]): void;

    double(...args: any[]): void;

    eq(...args: any[]): void;

    exp(...args: any[]): void;

    fromRng(...args: any[]): void;

    fromRprBE(...args: any[]): void;

    fromRprBEM(...args: any[]): void;

    fromRprLE(...args: any[]): void;

    fromRprLEM(...args: any[]): void;

    geq(...args: any[]): void;

    gt(...args: any[]): void;

    inv(...args: any[]): void;

    isZero(...args: any[]): void;

    leq(...args: any[]): void;

    lt(...args: any[]): void;

    mul(...args: any[]): void;

    mulScalar(...args: any[]): void;

    neg(...args: any[]): void;

    neq(...args: any[]): void;

    pow(...args: any[]): void;

    random(...args: any[]): void;

    square(...args: any[]): void;

    sub(...args: any[]): void;

    toRprBE(...args: any[]): void;

    toRprBEM(...args: any[]): void;

    toRprLE(...args: any[]): void;

    toRprLEM(...args: any[]): void;

    toString(...args: any[]): void;
  }

  export class PolField {
    constructor(...args: any[]);

    add(...args: any[]): void;

    computeVanishingPolinomial(...args: any[]): void;

    div(...args: any[]): void;

    double(...args: any[]): void;

    eq(...args: any[]): void;

    eval(...args: any[]): void;

    eval2(...args: any[]): void;

    evaluateLagrangePolynomials(...args: any[]): void;

    extend(...args: any[]): void;

    fft(...args: any[]): void;

    fft2(...args: any[]): void;

    ifft(...args: any[]): void;

    ifft2(...args: any[]): void;

    lagrange(...args: any[]): void;

    log2(...args: any[]): void;

    mul(...args: any[]): void;

    mulFFT(...args: any[]): void;

    mulNormal(...args: any[]): void;

    mulScalar(...args: any[]): void;

    normalize(...args: any[]): void;

    oneRoot(...args: any[]): void;

    reduce(...args: any[]): void;

    ruffini(...args: any[]): void;

    scaleX(...args: any[]): void;

    square(...args: any[]): void;

    sub(...args: any[]): void;

    toString(...args: any[]): void;
  }

  export class ZqField {
    constructor(...args: any[]);

    fromRprBE(...args: any[]): void;

    fromRprBEM(...args: any[]): void;

    fromRprLE(...args: any[]): void;

    fromRprLEM(...args: any[]): void;

    toRprBE(...args: any[]): void;

    toRprBEM(...args: any[]): void;

    toRprLE(...args: any[]): void;

    toRprLEM(...args: any[]): void;
  }

  export function buildBls12381(singleThread: any): any;

  export function buildBn128(singleThread?: any): any;

  export function getCurveFromName(name: any, singleThread: any): any;

  export function getCurveFromQ(q: any, singleThread: any): any;

  export function getCurveFromR(r: any, singleThread: any): any;

  export namespace Scalar {
    const one: any;

    const zero: any;

    function abs(a: any): any;

    function add(a: any, b: any): any;

    function band(a: any, b: any): any;

    function bitLength(a: any): any;

    function bits(n: any): any;

    function bor(a: any, b: any): any;

    function bxor(a: any, b: any): any;

    function div(a: any, b: any): any;

    function e(s: any, radix: any): any;

    function eq(a: any, b: any): any;

    function exp(a: any, b: any): any;

    function fromArray(a: any, radix: any): any;

    function fromRprBE(buff: any, o: any, n8: any): any;

    function fromRprLE(buff: any, o: any, n8: any): any;

    function fromString(s: any, radix?: any): any;

    function geq(a: any, b: any): any;

    function gt(a: any, b: any): any;

    function isNegative(a: any): any;

    function isOdd(a: any): any;

    function isZero(a: any): any;

    function land(a: any, b: any): any;

    function leq(a: any, b: any): any;

    function lnot(a: any): any;

    function lor(a: any, b: any): any;

    function lt(a: any, b: any): any;

    function mod(a: any, b: any): any;

    function mul(a: any, b: any): any;

    function naf(n: any): any;

    function neg(a: any): any;

    function neq(a: any, b: any): any;

    function pow(a: any, b: any): any;

    function shiftLeft(a: any, n: any): any;

    function shiftRight(a: any, n: any): any;

    function shl(a: any, n: any): any;

    function shr(a: any, n: any): any;

    function square(a: any): any;

    function sub(a: any, b: any): any;

    function toArray(s: any, radix: any): any;

    function toLEBuff(a: any): any;

    function toNumber(s: any): any;

    function toRprBE(buff: any, o: any, e: any, n8: any): void;

    function toRprLE(buff: any, o: any, e: any, n8: any): void;

    function toString(a: any, radix: any): any;
  }

  export namespace utils {
    function beBuff2int(buff: any): any;

    function beInt2Buff(n: any, len: any): any;

    function bitReverse(idx: any, bits: any): any;

    function buffReverseBits(buff: any, eSize: any): void;

    function leBuff2int(buff: any): any;

    function leInt2Buff(n: any, len?: any): any;

    function log2(V: any): any;

    function stringifyBigInts(o: any): any;

    function unstringifyBigInts(o: any): any;
  }
}

