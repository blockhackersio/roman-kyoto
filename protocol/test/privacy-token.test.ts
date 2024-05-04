import hre, { ethers } from "hardhat";
import {
  MultiplierVerifier,
  OutputVerifier,
  SpendVerifier,
  RK,
  RK__factory,
} from "../typechain-types";
import MerkleTree from "fixed-merkle-tree";

import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
  withdraw,
  Note,
  getBabyJubJub,
  getRandomBits,
  notecommitment,
  deposit,
  getInitialPoints,
  getAsset,
  toStr,
  transfer,
  CircomStuff,
} from "../src";
import { poseidonHash, poseidonHash2 } from "../src/poseidon";
import { AbiCoder, keccak256, randomBytes } from "ethers";
import { generateGroth16Proof, toFixedHex } from "../src/zklib";
import { expect } from "chai";
import { ensureBytes } from "@noble/curves/abstract/utils";

describe("CCIP functionality testing", async () => {
  const sourceChainId = 1;
  const destChainId = 2;

  let Deployer: SignerWithAddress;

  // for our testing purposes, the CCIP router can just be a signer
  let CCIPRouter: SignerWithAddress;

  let MultiplierVerifierSource: MultiplierVerifier;
  let OutputVerifierSource: OutputVerifier;
  let SpendVerifierSource: SpendVerifier;
  let RK: RK;

  let rkAddress: string;

  const babyJub = getBabyJubJub();

  before(async () => {
    await hre.deployments.fixture("testbed");

    [Deployer, CCIPRouter] = await ethers.getSigners();

    const MultiplierVerifierSource = await hre.deployments.get(
      "MultiplierVerifierSource"
    );

    const OutputVerifierSource = await hre.deployments.get(
      "OutputVerifierSource"
    );

    const SpendVerifierSource = await hre.deployments.get(
      "SpendVerifierSource"
    );

    // deploy our EdOnBN254 library
    await hre.deployments.deploy("EdOnBN254", {
      contract: "EdOnBN254",
      from: Deployer.address,
    });
    const EdOnBN254 = (await hre.deployments.get("EdOnBN254")).address;

    const Hasher = await hre.deployments.get("Hasher");

    // next we deploy our source RK contract
    await hre.deployments.deploy("RKSource", {
      contract: "RK",
      from: Deployer.address,
      args: [
        SpendVerifierSource.address,
        OutputVerifierSource.address,
        Hasher.address,
        CCIPRouter.address,
        [],
        [],
      ],
      libraries: {
        EdOnBN254: EdOnBN254,
      },
    });

    // hardhat deployments typing fuckin sucks
    const tempRK = await hre.deployments.get("RKSource");
    rkAddress = tempRK.address;

    RK = new ethers.Contract(
      rkAddress,
      RK__factory.abi,
      Deployer
    ) as unknown as RK;
  });

  it("bind siggies", async () => {
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

    const circomHelper = new CircomStuff(
      await ethers.provider.getSigner(),
      rkAddress
    );

    circomHelper.verifySig(
      toStr(s),
      [toStr(R.x), toStr(R.y)],
      [toStr(A.x), toStr(A.y)],
      Buffer.from(msgBytes).toString("hex")
    );
  });

  it("transact", async () => {
    const [privateKey, recieverPrivateKey, b1] = getRandomBits(10, 253);
    const spendKey = poseidonHash([privateKey]);
    const receiverSpendKey = poseidonHash([recieverPrivateKey]);

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
      rkAddress,
      10n,
      privateKey,
      spendKey,
      receiverSpendKey,
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
    const [privateKey, recieverPrivateKey, b1] = getRandomBits(10, 253);
    const spendKey = poseidonHash([privateKey]);
    const receiverSpendKey = poseidonHash([recieverPrivateKey]);

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
      rkAddress,
      10n,
      privateKey,
      receiverSpendKey,
      "USDC",
      tree
    );
  });

  it("withdrawal", async () => {
    const [privateKey, recieverPrivateKey, b1] = getRandomBits(10, 253);
    const spendKey = poseidonHash([privateKey]);
    const receiverSpendKey = poseidonHash([recieverPrivateKey]);

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
      rkAddress,
      10n,
      privateKey,
      spendKey,
      receiverSpendKey,
      "USDC",
      tree,
      {
        async getNotesUpTo(_amount: bigint, _asset: string) {
          return spendList;
        },
      }
    );
  });

  const outputProve = async (
    amount: string,
    blinding: string,
    asset: string,
    publicKey: string,
    Vx: string,
    Vy: string,
    Rx: string,
    Ry: string,
    r: string,
    Cx: string,
    Cy: string
  ) => {
    return await generateGroth16Proof(
      {
        amount,
        blinding,
        asset,
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
  };

  it("output", async () => {
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

    const V = getV(n1.asset);
    const proof = await outputProve(
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

    await RK.outputVerify(proof, [n1nc]);
  });
});
