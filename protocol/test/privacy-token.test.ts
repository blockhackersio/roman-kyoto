import hre, { ethers } from "hardhat";
import {
  MultiplierVerifier,
  OutputVerifier,
  SpendVerifier,
  RK,
  RK__factory,
  ERC20,
  USDC,
  WBTC,
  USDC__factory,
  WBTC__factory,
} from "../typechain-types";

import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
  withdraw,
  Note,
  getBabyJubJub,
  deposit,
  getAsset,
  transfer,
  buildMerkleTree,
  getKeys,
  decryptNote,
  nullifierHash,
} from "../src";
import { poseidonHash, poseidonHash2 } from "../src/poseidon";
import {
  LogDescription,
  Contract,
  ContractTransactionReceipt,
  Interface,
  Wallet,
  parseUnits,
} from "ethers";
import { generateGroth16Proof, toFixedHex } from "../src/zklib";
import { expect } from "chai";
import { ensureBytes } from "@noble/curves/abstract/utils";

describe("CCIP functionality testing", async () => {
  const sourceChainId = 1;
  const destChainId = 2;

  let Deployer: SignerWithAddress;

  // for our testing purposes, the CCIP router can just be a signer
  let CCIPRouter: SignerWithAddress;

  let RK: RK;

  let testUSDC: USDC;
  let testWBTC: WBTC;

  let rkAddress: string;

  const babyJub = getBabyJubJub();

  before(async () => {
    await hre.deployments.fixture("testbed");

    [Deployer, CCIPRouter] = await ethers.getSigners();

    const OutputVerifierSource = await hre.deployments.get(
      "OutputVerifierSource"
    );

    const SpendVerifierSource = await hre.deployments.get(
      "SpendVerifierSource"
    );

    const usdcAddress = (await hre.deployments.get("USDC")).address;
    testUSDC = new ethers.Contract(
      usdcAddress,
      USDC__factory.abi,
      Deployer
    ) as unknown as USDC;

    const wbtcAddress = (await hre.deployments.get("WBTC")).address;
    testWBTC = new ethers.Contract(
      wbtcAddress,
      WBTC__factory.abi,
      Deployer
    ) as unknown as WBTC;

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

    // tell our protocol these erc20s are supported
    await RK.addSupportedAsset(await getAsset("USDC"), usdcAddress, 6);
    await RK.addSupportedAsset(await getAsset("WBTC"), wbtcAddress, 18);
  });

  type WalletStore = {
    notes: { note: Note; nullifier: string; index: bigint }[];
    nullifiers: string[];
    privateKey: string;
    getNotesUpTo: (amount: bigint, asset: string) => Promise<Note[]>;
    getBalance: (asset: string) => Promise<bigint>;
    logBalances: () => Promise<void>;
  };

  const getUnspentNotes = (store: WalletStore) => {
    return store.notes.filter((note) => {
      return !store.nullifiers.includes(note.nullifier);
    });
  };

  const createStore = (hexPrivate: string) => {
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
          if (note.amount === 0n) continue;
          total += note.amount;
          notes.push(note);
          if (total > amount) break;
        }
        return notes;
      },
      async getBalance(asset: string) {
        const assetId = await getAsset(asset);
        const notesOfAsset = getUnspentNotes(store).filter(
          (n) => n.note.asset === assetId
        );
        return notesOfAsset.reduce((total, note) => {
          return total + note.note.amount;
        }, 0n);
      },
      async logBalances() {
        const assets = ["USDC", "WBTC"];
        const balances = await Promise.all(
          assets.map((asset) => this.getBalance(asset))
        );
        console.log("Balance");
        console.table(
          balances.map((bal, i) => ({
            Asset: assets[i],
            Balance: bal,
          }))
        );
      },
    };
    return store;
  };

  const getNoteCommitmentEvents = (
    receipt: ContractTransactionReceipt | null
  ) => {
    if (!receipt) throw new Error("receipt was null!");

    const decodedLogs = receipt?.logs
      .map((log) => {
        try {
          const sm = new Interface(RK__factory.abi);
          return sm.parseLog(log);
        } catch (error) {
          // This log was not from your contract, or not an event your contract emits
          return null;
        }
      })
      .filter((log) => log !== null);
    return decodedLogs.filter((c) => c !== null) as LogDescription[];
  };

  const extractToStore = async (
    hexPrivate: string,
    store: WalletStore,
    receipt: ContractTransactionReceipt | null
  ) => {
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
          store.notes.push({
            index: ev.args[1],
            nullifier,
            note,
          });
        } catch (err) {}
      }
      if (ev.name === "NewNullifier") {
        store.nullifiers.push(ev.args[0].toString());
      }
    }
    return store;
  };

  it.only("integrate", async () => {
    // for this test the user needs USDC and WBTC
    const usdcAmount = parseUnits("100", 6);
    await testUSDC.mint(Deployer.address, usdcAmount);
    const wbtcAmount = parseUnits("100", 18);
    await testWBTC.mint(Deployer.address, wbtcAmount);

    // we also need to approve the RK address to move these amounts
    await testUSDC.approve(rkAddress, usdcAmount);
    await testWBTC.approve(rkAddress, wbtcAmount);

    let tree = await buildMerkleTree(RK as any as Contract);

    const spenderPrivate = Wallet.createRandom().privateKey;
    const receiverPrivate = Wallet.createRandom().privateKey;
    const receiver = await getKeys(BigInt(receiverPrivate));
    const spender = await getKeys(BigInt(spenderPrivate));
    const hexPrivate = spender.privateKey.toString(16);

    // store is how we track our users encrypted notes/balances
    let store = createStore(hexPrivate);
    await store.logBalances();

    // first as the user, we need to deposit our USDC
    let tx = await deposit(
      await ethers.provider.getSigner(),
      rkAddress,
      usdcAmount,
      spender,
      "USDC",
      tree
    );
    let receipt = await tx.wait();

    // our users USDC balance should have gone down
    expect(await testUSDC.balanceOf(Deployer.address)).to.equal(0);
    // and our contracts balance should have gone up
    expect(await testUSDC.balanceOf(rkAddress)).to.equal(usdcAmount);

    store = await extractToStore(hexPrivate, store, receipt);
    await store.logBalances();

    // next, we deposit our WBTC
    tx = await deposit(
      await ethers.provider.getSigner(),
      rkAddress,
      wbtcAmount,
      spender,
      "WBTC",
      tree
    );

    // our users WBTC balance should have gone down
    expect(await testWBTC.balanceOf(Deployer.address)).to.equal(0);
    // and our contracts balance should have gone up
    expect(await testWBTC.balanceOf(rkAddress)).to.equal(wbtcAmount);

    receipt = await tx.wait();
    store = await extractToStore(hexPrivate, store, receipt);
    await store.logBalances();

    tree = await buildMerkleTree(RK as any as Contract);

    const transferAmountUSDC = parseUnits("10", 6);

    // now that we have our assets deposited/shielded, we can transfer them through the protocol
    tx = await transfer(
      await ethers.provider.getSigner(),
      rkAddress,
      transferAmountUSDC,
      spender,
      receiver,
      "USDC",
      tree,
      store
    );

    receipt = await tx.wait();
    store = await extractToStore(hexPrivate, store, receipt);
    await store.logBalances();
    tree = await buildMerkleTree(RK as any as Contract);

    const usdcWithdrawalAmount = parseUnits("50", 6);

    // and, we can withdraw them too
    tx = await withdraw(
      await ethers.provider.getSigner(),
      rkAddress,
      usdcWithdrawalAmount,
      spender,
      receiver,
      "USDC",
      tree,
      store
    );

    // the contracts USDC balance should have gone down
    expect(await testUSDC.balanceOf(rkAddress)).to.equal(
      usdcAmount - usdcWithdrawalAmount
    );

    // the users USDC balance should have gone up
    expect(await testUSDC.balanceOf(Deployer.address)).to.equal(
      usdcWithdrawalAmount
    );

    receipt = await tx.wait();
    store = await extractToStore(hexPrivate, store, receipt);
    await store.logBalances();
  });
});
