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
import TransactionTable from "@/components/TransactionTable";
import { Button, Container, Flex } from "@chakra-ui/react";
import { Transaction } from "@/models/Transaction";
import EventRetrieval from "@/functions/EventRetrieval";

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
  infinityWallet,
  keepkey,
  sequence,
  trust,
  frontier,
  taho,
  coinbase,
  dcent,
  safe,
  keystone,
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

// Dummy data for demonstration
const transactions: Transaction[] = [
  { id: 1, date: "2023-01-01", amount: 150, description: "Grocery shopping" },
  { id: 2, date: "2023-01-02", amount: 200, description: "Electronics" },
  { id: 3, date: "2023-01-03", amount: 50, description: "Books" },
];

export default function Page() {
  const handleButtonClick = () => {
    // Call NoteListener with a test chain ID or any other parameter
    EventRetrieval("0x1"); // Example chain ID, replace with actual test data as needed
  };

  return (
    <Web3OnboardProvider web3Onboard={web3Onboard}>
      <NavBar />
      <Container maxW="container.lg" p={4}>
        <Flex
          justifyContent={{ base: "space-around", md: "space-around" }}
          mb={4}
          gap={{ base: "2", md: "4" }}
        >
          <Button colorScheme="blue" size="lg" onClick={handleButtonClick}>
            USDC
          </Button>
          <Button colorScheme="yellow" size="lg">
            WBTC
          </Button>
        </Flex>
      </Container>
      <Container maxW="container.xl" p={4}>
        <TransactionTable transactions={transactions} />
      </Container>
    </Web3OnboardProvider>
  );
}
