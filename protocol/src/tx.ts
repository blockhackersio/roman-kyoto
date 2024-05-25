import { AbiCoder, keccak256 } from "ethers";
import { Note, toXY } from "./note";
import MerkleTree from "fixed-merkle-tree";
import { toStr } from "./utils";
import { generateGroth16Proof, toFixedHex } from "./zklib";
import { B, R, modN, modP } from "./curve";
import { reddsaSign, reddsaVerify } from "./reddsa";
import { Keyset } from "./keypair";
import { ValueCommitment } from "./vc";
import { ExtPointType } from "@noble/curves/abstract/edwards";
import { TxDataStruct } from "../typechain-types/contracts/interfaces/IMasp";
import { Asset } from "./asset";

// TODO: add bridges to hash
function encodeTxInputs(
  spendNullifier: string[],
  outputCommitment: string[],
  outputValueCommitment: [string, string][],
  spendValueCommitment: [string, string][]
  // bridgeIns: BridgeIn[],
  // bridgeOuts: BridgeOut[]
) {
  const valueCommitments = [];
  for (let spend of spendValueCommitment) {
    const [x, y] = spend;
    valueCommitments.push(x);
    valueCommitments.push(y);
  }
  for (let output of outputValueCommitment) {
    const [x, y] = output;
    valueCommitments.push(x);
    valueCommitments.push(y);
  }

  const abi = new AbiCoder();
  const encodeTypes = [
    ...spendNullifier.map(() => "uint256"),
    ...outputCommitment.map(() => "uint256"),
    ...valueCommitments.map(() => "uint256"),
  ];

  const encodeData = [
    ...spendNullifier,
    ...outputCommitment,
    ...valueCommitments,
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

type TxData = {
  root: string;
  privateKey: string;
  spendAmount: string[];
  spendBlinding: string[];
  spendAsset: string[];
  spendPathIndex: string[];
  spendNullifier: string[];
  spendPathElements: string[][];
  spendCommitment: string[];
  spendV: [string, string][];
  spendR: [string, string][];
  spendr: string[];
  spendC: [string, string][];
  outAmount: string[];
  outBlinding: string[];
  outAssetId: string[];
  outAssetIdHash: string[];
  outPublicKey: string[];
  outV: [string, string][];
  outR: [string, string][];
  outr: string[];
  outC: [string, string][];
};

export async function txProve(txData: TxData) {
  return await generateGroth16Proof(txData, "tx");
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

export async function bridgeoutProve(
  amount: string,
  assetId: string,
  Vx: string,
  Vy: string,
  Rx: string,
  Ry: string,
  r: string
) {
  return await generateGroth16Proof(
    {
      amount,
      assetId,
      Vx,
      Vy,
      Rx,
      Ry,
      r,
    },
    "bridgeout"
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
    vc,
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
    vc,
  };
}

type ValueInput = {
  ins: ValueCommitment[];
  outs: ValueCommitment[];
  bridgeOuts: ValueCommitment[];
  bridgeIns: ValueCommitment[];
  extValueBase: ExtPointType;
  extAmount: bigint;
};

async function checkValueBalance(
  ins: ValueCommitment[],
  outs: ValueCommitment[],
  bridgeOut: ValueCommitment[],
  bridgeIn: ValueCommitment[],
  extValueBase: ExtPointType,
  extAmount: bigint
) {
  let sumRIns = 0n;
  let sumROuts = 0n;
  let sumRBridgeOut = 0n;
  let sumRBridgeIn = 0n;

  let sumIns = B.ExtendedPoint.ZERO;
  let sumOuts = B.ExtendedPoint.ZERO;
  let sumBridgeOut = B.ExtendedPoint.ZERO;
  let sumBridgeIn = B.ExtendedPoint.ZERO;

  for (let vc of ins) {
    sumRIns += vc.getRandomness();
    sumIns = sumIns.add(await vc.toPoint());
  }

  for (let vc of outs) {
    sumROuts += vc.getRandomness();
    sumOuts = sumOuts.add(await vc.toPoint());
  }

  for (let vc of bridgeOut) {
    sumRBridgeOut += vc.getRandomness();
    sumBridgeOut = sumBridgeOut.add((await vc.toPoint()).negate());
  }

  for (let vc of bridgeIn) {
    sumRBridgeIn += vc.getRandomness();
    sumBridgeIn = sumBridgeIn.add((await vc.toPoint()).negate());
  }
  const ext =
    extAmount === 0n
      ? B.ExtendedPoint.ZERO
      : extValueBase.multiply(modN(extAmount));

  const totalR = sumRIns - sumROuts - sumRBridgeOut + sumRBridgeIn;

  const isBalanced = sumIns
    .subtract(sumOuts)
    .add(sumBridgeOut)
    .subtract(sumBridgeIn)
    .add(ext)
    .equals(R.multiply(modN(totalR)));

  if (!isBalanced) throw new Error("Value balance precheck failed");

  console.log("Value balance passed");
}

export async function prepareTx(
  spendList: Note[],
  outputList: Note[],
  bridgeInList: ValueCommitment[],
  bridgeOutList: { note: Note; chainId: string; destination: string }[],
  tree: MerkleTree,
  sender: Keyset,
  receiver: Keyset,
  asset: string,
  amount: bigint
) {
  for (let i = 0; i < 2; i++) {
    if (typeof spendList[i] === "undefined") {
      spendList[i] = Note.create(0n, sender.publicKey, asset);
    }
  }
  for (let i = 0; i < 2; i++) {
    if (typeof outputList[i] === "undefined") {
      outputList[i] = Note.create(0n, receiver.publicKey, asset);
    }
  }

  let totalRandomness = 0n;
  const root = `${tree.root}`;

  const spendAmount: string[] = [];
  const spendBlinding: string[] = [];
  const spendAsset: string[] = [];
  const spendPathIndex: string[] = [];
  const spendNullifier: string[] = [];
  const spendPathElements: string[][] = [];
  const spendCommitment: string[] = [];
  const spendV: [string, string][] = [];
  const spendR: [string, string][] = [];
  const spendr: string[] = [];
  const spendC: [string, string][] = [];
  const spendVc: ValueCommitment[] = [];
  const outAmount: string[] = [];
  const outBlinding: string[] = [];
  const outAssetId: string[] = [];
  const outAssetIdHash: string[] = [];
  const outPublicKey: string[] = [];
  const outV: [string, string][] = [];
  const outR: [string, string][] = [];
  const outr: string[] = [];
  const outC: [string, string][] = [];
  const outputEncryptedOutput: string[] = [];
  const outputCommitment: string[] = [];
  const outVc: ValueCommitment[] = [];

  for (let n of spendList) {
    const nc = await n.commitment();
    const vc = ValueCommitment.fromNote(n);
    const index = tree.indexOf(nc);
    const pathElements =
      index > -1
        ? tree.path(index).pathElements.map((e) => e.toString())
        : new Array(tree.levels).fill(0);
    const nullifier = await n.nullifier(
      toStr(sender.privateKey),
      BigInt(index >= 0 ? index : 0)
    );
    const Vs = await n.asset.getValueBase();
    spendAmount.push(toStr(n.amount));
    spendBlinding.push(toStr(n.blinding));
    spendAsset.push(toStr(await n.asset.getIdHash()));
    spendPathIndex.push(toStr(BigInt(index >= 0 ? index : 0)));
    spendNullifier.push(toFixedHex(nullifier));
    spendPathElements.push(pathElements);
    spendCommitment.push(toFixedHex(nc));
    spendV.push(toXY(Vs));
    spendR.push(toXY(R));
    const [r, Cx, Cy] = await vc.toRXY();
    spendr.push(r);
    spendC.push([Cx, Cy]);
    spendVc.push(vc);
    totalRandomness = modN(totalRandomness + vc.getRandomness());
  }

  for (let n of outputList) {
    const nc = await n.commitment();
    const vc = ValueCommitment.fromNote(n);
    const Vo = await n.asset.getValueBase();

    outAmount.push(toStr(n.amount));
    outBlinding.push(toStr(n.blinding));
    outAssetId.push(toStr(n.asset.getId()));
    outAssetIdHash.push(toStr(await n.asset.getIdHash()));
    outPublicKey.push(toStr(n.spender));
    outV.push(toXY(Vo));
    outR.push(toXY(R));
    const [r, Cx, Cy] = await vc.toRXY();
    outr.push(r);
    outC.push([Cx, Cy]);
    outputCommitment.push(toFixedHex(nc));

    const keyToEncryptTo =
      sender.publicKey === n.spender
        ? sender.encryptionKey
        : receiver.encryptionKey;

    const encryptedOutput = n.encrypt(keyToEncryptTo);
    outputEncryptedOutput.push(encryptedOutput);
    outVc.push(vc);

    totalRandomness = modN(totalRandomness - vc.getRandomness());
  }

  // for (let { note, chainId, destination } of bridgeOutList) {
  //   const vc = ValueCommitment.fromNote(note);
  //   const valueBase = await vc.asset.getValueBase();
  //
  //   const result = await processOutput(sender, receiver, note);
  //   const proof = await bridgeoutProve(
  //     toStr(vc.amount),
  //     toStr(vc.asset.getId()),
  //     toStr(valueBase.x),
  //     toStr(valueBase.y),
  //     toStr(R.x),
  //     toStr(R.y),
  //     toStr(vc.getRandomness())
  //   );
  //
  //   const encryptedOutput = vc.encrypt(sender.encryptionKey);
  //   totalRandomness = modN(totalRandomness - vc.getRandomness());
  //   bridgeOuts.push({
  //     valueCommitment: await vc.toXY(),
  //     encryptedOutput,
  //     proof,
  //     chainId,
  //     destination,
  //   });
  //   // vcs.bridgeOuts.push(vc);
  // }
  //
  // for (let vc of bridgeInList) {
  //   const r = vc.getRandomness();
  //   totalRandomness = modN(totalRandomness + r);
  //   bridgeIns.push({ valueCommitment: await vc.toXY() });
  //   // vcs.bridgeIns.push(vc);
  // }

  // Create sig
  const bsk = totalRandomness;
  const Bpk = R.multiply(bsk);

  // test clientside value check
  // checkValueBalance(vcs);

  const encoded = encodeTxInputs(
    spendNullifier,
    outputCommitment,
    outC,
    spendC
  );
  const hash = keccak256(encoded);
  const sig = reddsaSign(R, bsk, Bpk, hash);

  // Check sig on frontend
  const valid = reddsaVerify(R, Bpk, sig, hash);

  if (!valid) throw new Error("Signature is not valid!");

  const proof = await txProve({
    root,
    privateKey: toStr(sender.privateKey),
    spendAmount,
    spendBlinding,
    spendCommitment,
    spendPathElements,
    spendPathIndex,
    spendC,
    spendr,
    spendR,
    spendV,
    spendAsset,
    spendNullifier,
    outAmount,
    outBlinding,
    outAssetId,
    outAssetIdHash,
    outPublicKey,
    outV,
    outR,
    outr,
    outC,
  });

  const extValueBase = await Asset.fromTicker(asset).getValueBase();
  const extAssetHash = await Asset.fromTicker(asset).getIdHash();

  await checkValueBalance(spendVc, outVc, [], [], extValueBase, amount);

  const txData: TxDataStruct = {
    proof,
    spendNullifier,
    spendValueCommitment: spendC,
    outputCommitment,
    outputValueCommitment: outC,
    outputEncryptedOutput,
    bridgeInValueCommitment: [],
    bridgeOutChainId: [],
    bridgeOutDestination: [],
    bridgeOutEncryptedOutput: [],
    bridgeOutValueCommitment: [],
    extAssetHash,
    extAmount: amount,
    bpk: [toStr(Bpk.x), toStr(Bpk.y)],
    root: `${tree.root}`,
    R: [toStr(sig.R.x), toStr(sig.R.y)],
    s: toStr(sig.s),
    hash,
  };

  return { txData };
}
