import { ethers } from "hardhat";
import { withdraw, deposit, transfer, buildMerkleTree, getKeys } from "../src";
import { Wallet, parseUnits } from "ethers";
import { expect } from "chai";
import { deployRK } from "./utils";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { MaspWallet } from "../src/wallet";

describe("CCIP functionality testing", async () => {
  it("integrate", async () => {
    const { RK, Deployer, testUSDC, testWBTC, rkAddress } = await loadFixture(
      deployRK
    );

    // for this test the user needs USDC and WBTC
    const usdcAmount = parseUnits("100", 6);
    await testUSDC.mint(Deployer.address, usdcAmount);
    const wbtcAmount = parseUnits("100", 18);
    await testWBTC.mint(Deployer.address, wbtcAmount);

    // we also need to approve the RK address to move these amounts
    await testUSDC.approve(rkAddress, usdcAmount);
    await testWBTC.approve(rkAddress, wbtcAmount);

    let tree = await buildMerkleTree(RK);

    const spenderPrivate = Wallet.createRandom().privateKey;
    const receiverPrivate = Wallet.createRandom().privateKey;
    const receiver = await getKeys(BigInt(receiverPrivate));
    const spender = await getKeys(BigInt(spenderPrivate));
    const hexPrivate = spender.privateKey.toString(16);

    // store is how we track our users encrypted notes/balances
    // let store = createStore(hexPrivate);
    const store = MaspWallet.fromPrivateKey(hexPrivate);
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

    await store.updateFromReceipt(receipt);
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
    await store.updateFromReceipt(receipt);
    await store.logBalances();

    tree = await buildMerkleTree(RK);

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
    await store.updateFromReceipt(receipt);
    await store.logBalances();
    tree = await buildMerkleTree(RK);

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
    await store.updateFromReceipt(receipt);
    await store.logBalances();
  });
});
