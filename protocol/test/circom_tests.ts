// import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ethers, ignition } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

// import { CircomExample } from "../src";
import CircomExampleModule from "../ignition/modules/CircomExample";
import { Note } from "../src/index";
import { ensurePoseidon, poseidonHash } from "../src/poseidon";
import { generateGroth16Proof, toFixedHex } from "../src/zklib";
import { keccak_256 } from "@noble/hashes/sha3";
import { ExtPointType, twistedEdwards } from "@noble/curves/abstract/edwards";
import { bytesToHex, hexToBytes, randomBytes } from "@noble/hashes/utils";
import { Field, mod } from "@noble/curves/abstract/modular";
import CircomExample from "../ignition/modules/CircomExample";
import { CircomExample__factory } from "../typechain-types";
import { Provider } from "ethers";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";

class CircomStuff {
  constructor(private provider: Provider, private address: string) {}

  async spendProve(privateKey: string) {
    return await generateGroth16Proof({ privateKey }, "spend");
  }

  async spendVerify(proof: string, publicKey: string) {
    const verifier = CircomExample__factory.connect(
      this.address,
      this.provider
    );
    return await verifier.spendVerify(proof, [publicKey]);
  }
}
describe("test", () => {
  async function deployVerifierFixture() {
    return ignition.deploy(CircomExampleModule);
  }

  describe("masp", () => {
    // it("should pass a valid proof", async () => {
    //   const { verifier } = await loadFixture(deployVerifierFixture);
    //   const address = await verifier.getAddress();
    //   const circomExample = new CircomExample(ethers.provider, address);
    //   const proof = await circomExample.multiplierProve(4, 11);
    //   await circomExample.multiplierVerify(proof, 44);
    // });
    //
    // it("should fail an invalid proof", async () => {
    //   const { verifier } = await loadFixture(deployVerifierFixture);
    //   const address = await verifier.getAddress();
    //   const circomExample = new CircomExample(ethers.provider, address);
    //   const proof = await circomExample.multiplierProve(4, 10);
    //   await expect(
    //     circomExample.multiplierVerify(proof, 44)
    //   ).to.be.revertedWith("invalid proof");
    // });
    //
    //
    function getBabyJubJub() {
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

    async function proveSpend(): Promise<string> {
      // privateKey,
      // amount,
      // blinding,
      // index,
      // merkleProof,
      // valueBase,
      // valueCommitmentRandomness,
      // spendNullifier,
      // valueCommitment
      return "";
    }
    async function proveOutput(): Promise<string> {
      // amount: bigint,
      // publicKey: string,
      // blinding: ,
      // valueBase,
      // valueBaseString,
      // valueCommitment,
      // valueCommitmentRandomness,
      // noteCommitment,
      // valueCommitment
      return "";
    }
    const modN = (a: bigint) => mod(a, babyJub.CURVE.n);

    function valcommit(V: ExtPointType, v: bigint, R: ExtPointType, r: bigint) {
      const vV = V.multiply(modN(v));
      const rR = R.multiply(modN(r));
      const Vc = vV.add(rR);
      return Vc;
    }
    const babyJub = getBabyJubJub();

    function getRandomBigInt(bits: number) {
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

    function getRandomBits(count: number, bits: number) {
      return new Array(count).fill(0).map(() => getRandomBigInt(bits));
    }
    async function getCircomExampleContract() {
      const { verifier } = await loadFixture(deployVerifierFixture);
      const address = await verifier.getAddress();
      const circomExample = new CircomStuff(ethers.provider, address);
      return circomExample;
    }

    it("should create a transaction", async () => {
      await ensurePoseidon();
      // create:
      const [Ro, Vo, pk, b1, b2, r1, r2, r3, r4] = getRandomBits(10, 253);

      const pub = poseidonHash([pk]);
      const G = babyJub.ExtendedPoint.fromAffine({
        x: babyJub.CURVE.Gx,
        y: babyJub.CURVE.Gy,
      });
      const R = G.multiply(Ro);
      const V = G.multiply(Vo);

      // 2 preexisting notes
      const n1: Note = {
        amount: 10n,
        asset: "USDC",
        spender: pub,
        blinding: toFixedHex(b1),
      };

      const n2: Note = {
        amount: 10n,
        asset: "USDC",
        spender: pub,
        blinding: toFixedHex(b2),
      };

      function stringToBytes(str: string) {
        return BigInt("0x" + Buffer.from(str, "utf-8").toString("hex"));
      }

      async function hashToField(bytes: bigint) {
        await ensurePoseidon();
        return poseidonHash([bytes]);
      }

      async function notecommitment(n: Note): Promise<string> {
        return poseidonHash([
          n1.amount,
          BigInt("0x" + n1.spender),
          BigInt(n1.blinding),
          BigInt("0x" + (await hashToField(stringToBytes(n1.asset)))),
        ]);
      }

      // 2 note commitments
      const n1nc = await notecommitment(n1);
      const n2nc = await notecommitment(n2);
      // 2 value commitments

      const n1vc = valcommit(V, n1.amount, R, r1);
      const n2vc = valcommit(V, n2.amount, R, r2);
      console.log({ n1nc, n2nc, n1vc, n2vc });

      const contract = await getCircomExampleContract();
      const proof = await contract.spendProve("0x" + pk.toString(16));
      console.log(proof)
      // Add the note commitments to a merkle tree
      //
      //
      // create 2 note commitments
      //
      //
    });
  });
});
