import MerkleTree from "fixed-merkle-tree";
import { poseidonHash2 } from "./poseidon";
import { IMasp } from "../typechain-types";

export function toStr(b: bigint|string): string {
  if(typeof b === 'string'){
    return b
  }
  return "0x" + b.toString(16);
}

export async function buildMerkleTree(contract: IMasp) {
  const filter = contract.filters.NewCommitment();

  const events = await contract.queryFilter(filter);
  const leaves = events
    .sort((a, b) => {
      return Number(a.args?.index) - Number(b.args?.index);
    })
    .map((e) => {
      return e.args?.commitment.toString();
    });
  const t = new MerkleTree(5, leaves, {
    hashFunction: poseidonHash2,
    zeroElement:
      "21663839004416932945382355908790599225266501822907911457504978515578255421292",
  });

  return t;
}

export function shrtn(str: string) {
  return str.slice(0, 5) + ".." + str.slice(-5);
}
