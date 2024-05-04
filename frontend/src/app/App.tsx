import Balances from "@/components/Balances";
import ConnectWallet from "@/components/ConnectWallet";
import DepositCard from "@/components/DepositCard";
import TransferCard from "@/components/TransferCard";
import WithdrawCard from "@/components/WithdrawCard";
import { Utxo } from "@/functions/shieldedBalance";
import { SimpleGrid } from "@chakra-ui/react";
import { useConnectWallet, useSetChain } from "@web3-onboard/react";
import { useEffect, useState } from "react";
import {
  getSpentNullifiers,
  getUserUtxos,
  calculateShieldedBalances,
} from "../functions/shieldedBalance";
import { getRpcUrl } from "@/helpers/chainHelpers";
import { ethers } from "ethers";

export default function App() {
  const [{ wallet }] = useConnectWallet();
  const [{ chains, connectedChain, settingChain }, setChain] = useSetChain();

  const [utxos, setUtxos] = useState<Utxo[]>([]);
  const [spentNullifiers, setSpentNullifiers] = useState<string[]>([]);
  const [shieldedBalances, setShieldedBalances] = useState<Map<string, bigint>>(
    new Map()
  );

  useEffect(() => {
    async function fetchData() {
      if (wallet && connectedChain) {
        // Get contract using connected wallets chain rpc url
        const rpcUrl = getRpcUrl(connectedChain.id);

        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        const contractAddress = "0xYourContractAddressHere"; // Replace with actual contract address
        const contractABI: any[] = []; // Replace with actual contract ABI
        const contract = new ethers.Contract(
          contractAddress,
          contractABI,
          provider
        );

        const userPrivateKey = "abc"; // Replace with actual user private key for used for note decryption
        const [utxos, nullifiers] = await Promise.all([
          getUserUtxos(contract, userPrivateKey),
          getSpentNullifiers(contract),
        ]);
        setUtxos(utxos);
        setSpentNullifiers(nullifiers);

        const balances = await calculateShieldedBalances(utxos, nullifiers);
        setShieldedBalances(balances);
      }
    }

    fetchData();
  }, [wallet, connectedChain]);

  return (
    <>
      {!wallet && <ConnectWallet />}
      {wallet && (
        <SimpleGrid
          columns={2}
          spacing={4}
          justifyContent="center"
          marginX={4}
          marginY={8}
        >
          <Balances shieldedBalances={shieldedBalances} />
          <TransferCard />
          <DepositCard />
          <WithdrawCard />
        </SimpleGrid>
      )}
    </>
  );
}
