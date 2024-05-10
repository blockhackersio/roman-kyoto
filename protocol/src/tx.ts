import { AbiCoder, keccak256 } from "ethers";
import { OutputProof, SpendProof } from ".";
import { Note } from "./note";
import MerkleTree from "fixed-merkle-tree";
import { toStr } from "./utils";
import { generateGroth16Proof, toFixedHex } from "./zklib";
import { R, modN } from "./curve";
import { reddsaSign, reddsaVerify } from "./reddsa";
import { Keyset } from "./keypair";

function encodeTxInputs(
  spendProofs: SpendProof[],
  outputProofs: OutputProof[]
) {
  const nullifiers = [];
  const valueCommitments = [];
  const commitments = [];

  for (let { nullifier, valueCommitment } of spendProofs) {
    nullifiers.push(nullifier);
    valueCommitments.push(valueCommitment);
  }

  for (let { commitment, valueCommitment } of outputProofs) {
    commitments.push(commitment);
    valueCommitments.push(valueCommitment);
  }

  const abi = new AbiCoder();
  const encodeTypes = [
    ...nullifiers.map(() => "uint256"),
    ...commitments.map(() => "uint256"),
    ...valueCommitments.flatMap(() => ["uint256", "uint256"]),
  ];

  const encodeData = [
    ...nullifiers,
    ...commitments,
    ...valueCommitments.flatMap((a) => a),
  ];

  const encoded = abi.encode(encodeTypes, encodeData);

  return encoded;
}

export async function outputProve(
  amount: string,
  blinding: string,
  assetId: string,
  assetIdHash: string,
  publicKey: string,
  Vx: string,
  Vy: string,
  Rx: string,
  Ry: string,
  r: string,
  Cx: string,
  Cy: string
) {
  return await generateGroth16Proof(
    {
      amount,
      blinding,
      assetId,
      assetIdHash,
      publicKey,
      Vx,
      Vy,
      Rx,
      Ry,
      r,
      Cx,
      Cy,
    },
    "output"
  );
}

export async function spendProve(
  privateKey: string,
  amount: string,
  blinding: string,
  asset: string,
  pathIndex: string,
  nullifier: string,
  root: string,
  pathElements: string[],
  Vx: string,
  Vy: string,
  Rx: string,
  Ry: string,
  r: string,
  Cx: string,
  Cy: string,
  commitment: string
) {
  return await generateGroth16Proof(
    {
      privateKey,
      amount,
      blinding,
      asset,
      pathIndex,
      nullifier,
      root,
      pathElements,
      Vx,
      Vy,
      Rx,
      Ry,
      r,
      Cx,
      Cy,
      commitment,
    },
    "spend"
  );
}

async function processSpend(spender: Keyset, tree: MerkleTree, n: Note) {
  const nc = await n.commitment();
  const { Vc, r } = await n.valcommit();
  const root = `${tree.root}`;
  const index = tree.indexOf(nc);
  const pathElements = tree.path(index).pathElements.map((e) => e.toString());
  const nullifier = await n.nullifier(toStr(spender.privateKey), BigInt(index));
  const Vs = await n.asset.getValueBase();
  const proofSpend = await spendProve(
    toStr(spender.privateKey),
    toStr(n.amount),
    n.blinding,
    await n.asset.getIdHash(),
    toStr(BigInt(index)),
    nullifier,
    root,
    pathElements,
    toStr(Vs.x),
    toStr(Vs.y),
    toStr(R.x),
    toStr(R.y),
    toStr(r),
    toStr(Vc.x),
    toStr(Vc.y),
    toFixedHex(nc)
  );
  return {
    r,
    spendProof: {
      proof: proofSpend,
      valueCommitment: [toStr(Vc.x), toStr(Vc.y)] as [string, string],
      nullifier: nullifier,
    },
  };
}

async function processOutput(sender: Keyset, receiver: Keyset, n: Note) {
  const nc = await n.commitment();
  const { Vc, r } = await n.valcommit();

  const Vo = await n.asset.getValueBase();
  const proofOutput = await outputProve(
    toStr(n.amount),
    n.blinding,
    toStr(n.asset.getId()),
    await n.asset.getIdHash(),
    n.spender,
    toStr(Vo.x),
    toStr(Vo.y),
    toStr(R.x),
    toStr(R.y),
    toStr(r),
    toStr(Vc.x),
    toStr(Vc.y)
  );
  const keyToEncryptTo =
    sender.publicKey === n.spender
      ? sender.encryptionKey
      : receiver.encryptionKey;

  const encryptedOutput = n.encrypt(keyToEncryptTo);

  return {
    r,
    outputProof: {
      proof: proofOutput,
      valueCommitment: [toStr(Vc.x), toStr(Vc.y)] as [string,string],
      commitment: nc,
      encryptedOutput,
    },
  };
}

export async function prepareTx(
  spendList: Note[],
  outputList: Note[],
  tree: MerkleTree,
  sender: Keyset,
  receiver: Keyset
) {
  let totalRandomness = 0n;
  const outputProofs: OutputProof[] = [];
  const spendProofs: SpendProof[] = [];

  for (let n of spendList) {
    const result = await processSpend(sender, tree, n);
    totalRandomness = modN(totalRandomness + result.r);
    spendProofs.push(result.spendProof);
  }

  for(let n of outputList) {
    const result = await processOutput(sender, receiver, n);
    totalRandomness = modN(totalRandomness - result.r);
    outputProofs.push(result.outputProof);
  }

  // Create sig
  const bsk = totalRandomness;
  const Bpk = R.multiply(bsk);

  const encoded = encodeTxInputs(spendProofs, outputProofs);
  const hash = keccak256(encoded);
  const sig = reddsaSign(R, bsk, Bpk, hash);

  // Check sig on frontend
  const valid = reddsaVerify(R, Bpk, sig, hash);

  if (!valid) throw new Error("Signature is not valid!");

  return { sig, Bpk, spendProofs, outputProofs, hash };
}
