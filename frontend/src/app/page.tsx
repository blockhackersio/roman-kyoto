"use client";
import { Web3OnboardProvider, init } from "@web3-onboard/react";
import injectedModule from "@web3-onboard/injected-wallets";
import infinityWalletModule from "@web3-onboard/infinity-wallet";
import safeModule from "@web3-onboard/gnosis";
import keepkeyModule from "@web3-onboard/keepkey";
import keystoneModule from "@web3-onboard/keystone";
import coinbaseModule from "@web3-onboard/coinbase";
import dcentModule from "@web3-onboard/dcent";
import sequenceModule from "@web3-onboard/sequence";
import tahoModule from "@web3-onboard/taho";
import trustModule from "@web3-onboard/trust";
import frontierModule from "@web3-onboard/frontier";
import { chains } from "../constants/Chains";
import NavBar from "../components/NavBar";
import Balances from "@/components/Balances";

const injected = injectedModule();
const coinbase = coinbaseModule();
const dcent = dcentModule();
const infinityWallet = infinityWalletModule();
const keystone = keystoneModule();
const keepkey = keepkeyModule();
const safe = safeModule();
const sequence = sequenceModule();
const taho = tahoModule();
const trust = trustModule();
const frontier = frontierModule();

const wallets = [
    injected,
    // infinityWallet,
    // keepkey,
    // sequence,
    // trust,
    // frontier,
    // taho,
    // coinbase,
    // dcent,
    // safe,
    // keystone,
];

const appMetadata = {
    name: "Dapp Starter Template",
    icon: "<svg>My App Icon</svg>",
    description: "A decentralized application (Dapp) starter template.",
    recommendedInjectedWallets: [
        { name: "MetaMask", url: "https://metamask.io" },
        { name: "Coinbase", url: "https://wallet.coinbase.com/" },
    ],
};

const web3Onboard = init({
    wallets,
    chains,
    appMetadata,
});

export default function Page() {
    return (
        <Web3OnboardProvider web3Onboard={web3Onboard}>
            <NavBar />
            <Balances />
        </Web3OnboardProvider>
    );
}
