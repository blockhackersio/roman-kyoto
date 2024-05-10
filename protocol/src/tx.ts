import { AbiCoder, keccak256 } from "ethers";
import { Bridge, Output, Spend } from ".";
import { Note, toXY } from "./note";
import MerkleTree from "fixed-merkle-tree";
import { toStr } from "./utils";
import { generateGroth16Proof, toFixedHex } from "./zklib";
import { R, modN } from "./curve";
import { reddsaSign, reddsaVerify } from "./reddsa";
import { Keyset } from "./keypair";
import { ValueCommitment } from "./vc";

function encodeTxInputs(spendProofs: Spend[], outputProofs: Output[]) {
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
  const vc = ValueCommitment.fromNote(n);
  const root = `${tree.root}`;
  const index = tree.indexOf(nc);
  const pathElements = tree.path(index).pathElements.map((e) => e.toString());
  const nullifier = await n.nullifier(toStr(spender.privateKey), BigInt(index));
  const Vs = await n.asset.getValueBase();
  const proofSpend = await spendProve(
    toStr(spender.privateKey),
    toStr(n.amount),
    toStr(n.blinding),
    toStr(await n.asset.getIdHash()),
    toStr(BigInt(index)),
    nullifier,
    root,
    pathElements,
    ...toXY(Vs),
    ...toXY(R),
    ...(await vc.toRXY()),
    toFixedHex(nc)
  );
  return {
    r: vc.getRandomness(),
    spend: {
      proof: proofSpend,
      valueCommitment: await vc.toXY(),
      nullifier: nullifier,
    },
  };
}

async function processOutput(sender: Keyset, receiver: Keyset, n: Note) {
  const nc = await n.commitment();
  const vc = ValueCommitment.fromNote(n);
  const Vo = await n.asset.getValueBase();

  const proofOutput = await outputProve(
    toStr(n.amount),
    toStr(n.blinding),
    toStr(n.asset.getId()),
    toStr(await n.asset.getIdHash()),
    toStr(n.spender),
    ...toXY(Vo),
    ...toXY(R),
    ...(await vc.toRXY())
  );

  const keyToEncryptTo =
    sender.publicKey === n.spender
      ? sender.encryptionKey
      : receiver.encryptionKey;

  const encryptedOutput = n.encrypt(keyToEncryptTo);

  return {
    r: vc.getRandomness(),
    output: {
      proof: proofOutput,
      valueCommitment: await vc.toXY(),
      commitment: nc,
      encryptedOutput,
    },
  };
}

export async function prepareTx(
  spendList: Note[],
  outputList: Note[],
  bridgeList: { note: Note; chainId: string; destination: string }[],
  tree: MerkleTree,
  sender: Keyset,
  receiver: Keyset
) {
  let totalRandomness = 0n;
  const outputs: Output[] = [];
  const spends: Spend[] = [];
  const bridges: Bridge[] = [];

  for (let n of spendList) {
    const result = await processSpend(sender, tree, n);
    totalRandomness = modN(totalRandomness + result.r);
    spends.push(result.spend);
  }

  for (let n of outputList) {
    const result = await processOutput(sender, receiver, n);
    totalRandomness = modN(totalRandomness - result.r);
    outputs.push(result.output);
  }

  for (let { note, chainId, destination } of bridgeList) {
    const result = await processOutput(sender, receiver, note);

    const { proof } = result.output;
  const vc = ValueCommitment.fromNote(note);
    const encryptedOutput = vc.encrypt(sender.encryptionKey);

    bridges.push({
      valueCommitment: await vc.toXY(),
      encryptedOutput,
      proof,
      chainId,
      destination,
    });
  }

  // Create sig
  const bsk = totalRandomness;
  const Bpk = R.multiply(bsk);

  const encoded = encodeTxInputs(spends, outputs);
  const hash = keccak256(encoded);
  const sig = reddsaSign(R, bsk, Bpk, hash);

  // Check sig on frontend
  const valid = reddsaVerify(R, Bpk, sig, hash);

  if (!valid) throw new Error("Signature is not valid!");

  return { sig, Bpk, spends, outputs, bridges, hash };
}
