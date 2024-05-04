import hre, { ethers } from "hardhat";
import {
  MultiplierVerifier,
  OutputVerifier,
  SpendVerifier,
  RK,
} from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
  getAsset,
  noteCommitment,
  toFixedHex,
  getInitialPoints,
} from "../constants/points";
import { Note, getBabyJubJub, getRandomBits } from "../src";
import { poseidonHash } from "../src/poseidon";

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

    // next we deploy our source RK contract
    await hre.deployments.deploy("RKSource", {
      contract: "RK",
      from: Deployer.address,
      args: [
        SpendVerifierSource.address,
        OutputVerifierSource.address,
        CCIPRouter.address,
        [],
        [],
      ],
      libraries: {
        EdOnBN254: EdOnBN254,
      },
    });

    RK = (await hre.deployments.get("RKSource")) as unknown as RK;
  });

  it.only("should be able to transfer a note of 10 between 2 accounts", async () => {
    // for our first note, we need our spender's private key and a blinding factor
    const [spenderPrivateKey, blindingOne, randomOne] = getRandomBits(3, 253);

    // create our first note for a given user
    const firstNote: Note = {
      amount: 10n,
      asset: await getAsset("USDC"),
      spender: poseidonHash([spenderPrivateKey]),
      blinding: toFixedHex(blindingOne),
    };

    // next, we commit to our note (turn it into a poseidon hash)
    const firstNoteCommitment = noteCommitment(firstNote);

    // in order to spend a note, we need to prove that this spend operation
    // still executes within the rules of the system
    // To do this, we utilise some points on a baby jubjub curve
    const babyJub = getBabyJubJub();
    const [initialRandomJubJubPoint] = getRandomBits(1, 253);

    // R is the point representation of our initialRandomJubJubPoint * BJJ G point
    const { R, getValueCommitment, modN } = getInitialPoints(
      babyJub,
      initialRandomJubJubPoint
    );

    const firstNoteValueCommitment = getValueCommitment(
      firstNote,
      R,
      randomOne
    );
  });
});
