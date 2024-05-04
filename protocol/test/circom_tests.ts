// import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ethers, ignition } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

import MerkleTree from "fixed-merkle-tree";
import CircomExampleModule from "../ignition/modules/CircomExample";
import {
  BabyJub,
  CircomStuff,
  Note,
  NoteStore,
  OutputProof,
  SpendProof,
  buildMerkleTree,
  decryptNote,
  deposit,
  encryptNote,
  getAsset,
  getBabyJubJub,
  getInitialPoints,
  getKeys,
  getRandomBigInt,
  getRandomBits,
  notecommitment,
  nullifierHash,
  toStr,
  transfer,
  withdraw,
} from "../src/index";
import { ensurePoseidon, poseidonHash, poseidonHash2 } from "../src/poseidon";
import { generateGroth16Proof, toFixedHex } from "../src/zklib";
import { keccak_256 } from "@noble/hashes/sha3";
import { ExtPointType, twistedEdwards } from "@noble/curves/abstract/edwards";
import { randomBytes } from "@noble/hashes/utils";
import { Field, mod } from "@noble/curves/abstract/modular";
import { CircomExample__factory } from "../typechain-types";
import {
  AbiCoder,
  Contract,
  ContractTransactionReceipt,
  Interface,
  LogDescription,
  Provider,
  Signer,
  Wallet,
  keccak256,
} from "ethers";
import { bytesToNumberBE, ensureBytes } from "@noble/curves/abstract/utils";
import hasherArtifact from "../contracts/generated/Hasher.json";
async function deployVerifierFixture() {
  return ignition.deploy(CircomExampleModule);
}

export async function getCircomExampleContract() {
  const { verifier } = await loadFixture(deployVerifierFixture);
  const Hasher = await ethers.getContractFactory(
    hasherArtifact.abi,
    hasherArtifact.bytecode
  );
  const hasher = await Hasher.deploy();
  const tx = await hasher.waitForDeployment();
  const signer = await ethers.provider.getSigner();
  const hasherAddr = await tx.getAddress();
  console.log("Hasher deployed to:", hasherAddr);
  const address = await verifier.getAddress();
  const v = CircomExample__factory.connect(address, signer);
  await v.setHasherAddress(hasherAddr);
  console.log("after vset hasher");
  const circomExample = new CircomStuff(
    await ethers.provider.getSigner(),
    address
  );
  return circomExample;
}

const babyJub = getBabyJubJub();

it("output", async () => {
  await ensurePoseidon();

  const { R, valcommit, getV } = getInitialPoints(babyJub);
  const [privateKey, b1] = getRandomBits(10, 253);
  const spendKey = poseidonHash([privateKey]);

  const n1: Note = {
    amount: 10n,
    asset: await getAsset("USDC"),
    spender: spendKey,
    blinding: toFixedHex(b1),
  };

  const n1nc = await notecommitment(n1);
  const { Vc: n1vc, r: r1 } = valcommit(n1);
  const contract = await getCircomExampleContract();
  const V = getV(n1.asset);
  const proof = await contract.outputProve(
    toStr(n1.amount),
    n1.blinding,
    n1.asset,
    n1.spender,
    toStr(V.x),
    toStr(V.y),
    toStr(R.x),
    toStr(R.y),
    toStr(r1),
    toStr(n1vc.x),
    toStr(n1vc.y)
  );
  await contract.outputVerify(proof, n1nc);
});

it("spend", async () => {
  await ensurePoseidon();
  const [privateKey, b1] = getRandomBits(10, 253);
  const spendKey = poseidonHash([privateKey]);

  const { R, valcommit, getV } = getInitialPoints(babyJub);
  const n1: Note = {
    amount: 10n,
    asset: await getAsset("USDC"),
    spender: spendKey,
    blinding: toFixedHex(b1),
  };

  const n1nc = await notecommitment(n1);

  const { Vc: n1vc, r: r1 } = valcommit(n1);
  const contract = await getCircomExampleContract();

  const tree = new MerkleTree(5, [], {
    hashFunction: poseidonHash2,
    zeroElement:
      "21663839004416932945382355908790599225266501822907911457504978515578255421292",
  });

  tree.bulkInsert([n1nc]);

  const index = tree.indexOf(n1nc);

  const pathElements = tree.path(index).pathElements.map((e) => e.toString());

  const root = `${tree.root}`;
  const V = getV(n1.asset);
  const proof = await contract.spendProve(
    toStr(privateKey),
    toStr(n1.amount),
    n1.blinding,
    n1.asset,
    toStr(BigInt(index)),
    await nullifierHash(toStr(privateKey), n1, BigInt(index)),
    root,
    pathElements,
    toStr(V.x),
    toStr(V.y),
    toStr(R.x),
    toStr(R.y),
    toStr(r1),
    toStr(n1vc.x),
    toStr(n1vc.y)
  );
  // simple proof verification
  await contract.spendVerify(proof, n1nc);
});

it("Bind signatures", async () => {
  const message = "Hello world";
  const msgBytes = ensureBytes("message", Buffer.from(message, "utf8"));

  const { modN, reddsaSign } = getInitialPoints(babyJub);

  const a = modN(BigInt("0x" + Buffer.from(randomBytes(32)).toString("hex")));
  const A = babyJub.ExtendedPoint.BASE.multiply(a);

  const msgByteStr = toFixedHex(msgBytes);
  const { s, R } = reddsaSign(a, A, msgByteStr);

  /////////////////////////////
  // sig is now R and s
  //////////////////////////////
  // Following should happen in solidity
  //
  const abi = new AbiCoder();
  const cData = abi.encode(
    ["uint256", "uint256", "uint256", "uint256", "bytes"],
    [R.x, R.y, A.x, A.y, msgByteStr]
  );
  const hashed = keccak256(cData);
  const c = modN(BigInt(hashed));
  const B = babyJub.ExtendedPoint.BASE;

  expect(
    B.negate()
      .multiply(s)
      .add(R)
      .add(A.multiply(c))
      .equals(babyJub.ExtendedPoint.ZERO)
  ).to.be.true;

  const contract = await getCircomExampleContract();
  contract.verifySig(
    toStr(s),
    [toStr(R.x), toStr(R.y)],
    [toStr(A.x), toStr(A.y)],
    Buffer.from(msgBytes).toString("hex")
  );
});

it("encrypt", async () => {
  const [privateKey, blinding] = getRandomBits(10, 256);
  const keys = await getKeys(privateKey);

  const encrypted = await encryptNote(keys.encryptionKey, {
    amount: 123n,
    asset: await getAsset("USDC"),
    spender: keys.publicKey,
    blinding: blinding.toString(),
  });
  console.log(encrypted);
});

it("transact", async () => {
  const { verifier } = await loadFixture(deployVerifierFixture);
  await ensurePoseidon();
  const [privateKey, recieverPrivateKey, b1] = getRandomBits(10, 256);
  const { publicKey: spendKey } = await getKeys(privateKey);
  const { publicKey: receiverSpendKey, encryptionKey } = await getKeys(
    recieverPrivateKey
  );
  const spendList: Note[] = [
    {
      amount: 10n,
      asset: await getAsset("USDC"),
      spender: spendKey,
      blinding: toFixedHex(b1),
    },
  ];

  const nc = await notecommitment(spendList[0]);
  const tree = new MerkleTree(5, [], {
    hashFunction: poseidonHash2,
  });

  tree.insert(nc);

  await transfer(
    await ethers.provider.getSigner(),
    await verifier.getAddress(),
    10n,
    privateKey,
    spendKey,
    receiverSpendKey,
    encryptionKey,
    "USDC",
    tree,
    {
      async getNotesUpTo(_amount: bigint, _asset: string) {
        return spendList;
      },
    }
  );
});

it("deposit", async () => {
  const contract = await getCircomExampleContract();
  const verifier = contract.getContract();
  // const { verifier } = await loadFixture(deployVerifierFixture);
  await ensurePoseidon();
  const [privateKey, recieverPrivateKey, b1] = getRandomBits(10, 256);
  const spendKey = poseidonHash([privateKey]);
  const { publicKey: receiverSpendKey, encryptionKey } = await getKeys(
    recieverPrivateKey
  );

  const spendList: Note[] = [
    {
      amount: 10n,
      asset: await getAsset("USDC"),
      spender: spendKey,
      blinding: toFixedHex(b1),
    },
  ];

  const nc = await notecommitment(spendList[0]);
  const tree = new MerkleTree(5, [], {
    hashFunction: poseidonHash2,
  });

  tree.insert(nc);

  await deposit(
    await ethers.provider.getSigner(),
    await verifier.getAddress(),
    10n,
    privateKey,
    receiverSpendKey,
    encryptionKey,
    "USDC",
    tree
  );
});

it("withdaw", async () => {
  const contract = await getCircomExampleContract();
  const verifier = contract.getContract();
  // const { verifier } = await loadFixture(deployVerifierFixture);
  await ensurePoseidon();
  const [privateKey, recieverPrivateKey, b1] = getRandomBits(10, 256);
  const spendKey = poseidonHash([privateKey]);
  const { publicKey: receiverSpendKey, encryptionKey } = await getKeys(
    recieverPrivateKey
  );

  const spendList: Note[] = [
    {
      amount: 10n,
      asset: await getAsset("USDC"),
      spender: spendKey,
      blinding: toFixedHex(b1),
    },
  ];

  const nc = await notecommitment(spendList[0]);
  const tree = new MerkleTree(5, [], {
    hashFunction: poseidonHash2,
  });

  tree.insert(nc);

  await withdraw(
    await ethers.provider.getSigner(),
    await verifier.getAddress(),
    10n,
    privateKey,
    spendKey,
    receiverSpendKey,
    encryptionKey,
    "USDC",
    tree,
    {
      async getNotesUpTo(_amount: bigint, _asset: string) {
        return spendList;
      },
    }
  );
});

it("k", async () => {
  const note = {
    amount: 100n,
    spender:
      "19807204869336450808882067410408830110949238429594039068086271832610670264832",
    asset:
      "20127191088397187424089338044691488801975848983440234473083399104886363173023",
    blinding:
      "0x1da72ac35112755e9c645d42e10a0dd2a4bf91e162b69591080b7650e7c6f3f5",
  };
  const inputs = {
    privateKey:
      "0x28305b81492f2fb67d000a6ace843ab310887122c5ae8ec1d618c59600055d67",
    amount: "0x64",
    blinding:
      "0x1da72ac35112755e9c645d42e10a0dd2a4bf91e162b69591080b7650e7c6f3f5",
    asset:
      "20127191088397187424089338044691488801975848983440234473083399104886363173023",
    pathIndex: "0x0",
    nullifier:
      "1027965109721644940135240405116141077779411191513834201745255694605457776831",
    root: "12211343057785689949037215225253064103215064881203322012072754617152168342536",
    pathElements: [
      "20852855321025354209468958424484787777972708366695127796395017975925852331301",
      "8995896153219992062710898675021891003404871425075198597897889079729967997688",
      "15126246733515326086631621937388047923581111613947275249184377560170833782629",
      "6404200169958188928270149728908101781856690902670925316782889389790091378414",
      "17903822129909817717122288064678017104411031693253675943446999432073303897479",
    ],
    Vx: "0xce746b038f3f71167d459af646cacde7124a5f81b67ee3c7d804cdcbc17a60a",
    Vy: "0x40ffd37a1d3cf4d2c842874d7122f83aa057c115b419e284c168ea0cc43fad8",
    Rx: "0x2f5307e683c59c3f032430ded7b7fd1736e860148b42a97327b88e9c308256a",
    Ry: "0x2dfc4efc24fb941059288d8a9babf3adae8eceb61648e02dfa6d3e1680a44873",
    r: "0x9192c54b59eac761c7d2aeb2ba1e9ac4d8257699bce7e247a266cfb3cd8c00",
    Cx: "0x15732d7ec4bf19f4c23cd29e7913c44901e1b345f57966389bb983874f03dcba",
    Cy: "0x2787c39b80e25c52baf364ee8e23ad23ec2b3651675aab8de2766cd116e56946",
  };
  const proof = await generateGroth16Proof(inputs, "spend");
  const commitment = await notecommitment(note);
  const contract = await getCircomExampleContract();
  console.log(proof);
  contract.spendVerify(proof, commitment);
});

function getNoteCommitmentEvents(receipt: ContractTransactionReceipt | null) {
  if (!receipt) throw new Error("receipt was null!");

  const decodedLogs = receipt?.logs
    .map((log) => {
      try {
        const sm = new Interface(CircomExample__factory.abi);
        return sm.parseLog(log);
      } catch (error) {
        // This log was not from your contract, or not an event your contract emits
        return null;
      }
    })
    .filter((log) => log !== null);
  return decodedLogs.filter((c) => c !== null) as LogDescription[];
}

type WalletStore = {
  notes: { note: Note; nullifier: string; index: bigint }[];
  nullifiers: string[];
  privateKey: string;
  getNotesUpTo: (amount: bigint, asset: string) => Promise<Note[]>;
};

async function extractToStore(
  hexPrivate: string,
  store: WalletStore,
  receipt: ContractTransactionReceipt | null
) {
  const events = getNoteCommitmentEvents(receipt);
  for (let ev of events) {
    if (ev.name === "NewCommitment") {
      const cypher = ev.args[2] as string;
      const index = ev.args[1] as bigint;
      try {
        const note = await decryptNote(hexPrivate, cypher);
        const nullifier = await nullifierHash(
          "0x" + store.privateKey,
          note,
          index
        );
        console.log("GOT NOT");
        store.notes.push({
          index: ev.args[1],
          nullifier,
          note,
        });
      } catch (err) { }
    }
    if (ev.name === "NewNullifier") {
      store.nullifiers.push(ev.args[0].toString());
    }
  }
  return store;
}

function getUnspentNotes(store: WalletStore) {
  return store.notes.filter((note) => {
    return !store.nullifiers.includes(note.nullifier);
  });
}

it.only("integrate", async () => {
  await ensurePoseidon();

  const contract = await getCircomExampleContract();
  const verifier = contract.getContract();
  let tree = await buildMerkleTree(verifier as any as Contract);

  const spenderPrivate = Wallet.createRandom().privateKey;
  const receiverPrivate = Wallet.createRandom().privateKey;
  const receiver = await getKeys(BigInt(receiverPrivate));
  const spender = await getKeys(BigInt(spenderPrivate));
  const hexPrivate = spender.privateKey.toString(16);

  let store: WalletStore = {
    notes: [],
    nullifiers: [],
    privateKey: hexPrivate,
    async getNotesUpTo(amount: bigint, asset: string) {
      const assetId = await getAsset(asset);
      const notesOfAsset = getUnspentNotes(store).filter(
        (n) => n.note.asset === assetId
      );
      let total = 0n;
      let notes: Note[] = [];
      for (let { note } of notesOfAsset) {
        if(note.amount === 0n) continue;
        total += note.amount;
        notes.push(note);
        if(total > amount) break;
      }
      return notes;
    },
  };

  let tx = await deposit(
    await ethers.provider.getSigner(),
    await verifier.getAddress(),
    100n,
    spender,
    "USDC",
    tree
  );

  let receipt = await tx.wait();

  store = await extractToStore(hexPrivate, store, receipt);

  tree = await buildMerkleTree(verifier as any as Contract);

  tx = await transfer(
    await ethers.provider.getSigner(),
    await verifier.getAddress(),
    10n,
    spender,
    receiver,
    "USDC",
    tree,
    store
  );
  receipt = await tx.wait();
  store = await extractToStore(hexPrivate, store, receipt);
  tree = await buildMerkleTree(verifier as any as Contract);

  tx = await withdraw(
    await ethers.provider.getSigner(),
    await verifier.getAddress(),
    50n,
    spender,
    receiver,
    "USDC",
    tree,
    store
  );
});
