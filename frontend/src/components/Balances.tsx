import React, { useEffect, useState } from "react";
import TokenBalanceCard from "./TokenBalanceCard";
import {
  Card,
  CardBody,
  CardHeader,
  Heading,
  HStack,
  VStack,
} from "@chakra-ui/react";
import { USDC, USDC_contract_addresses, WBTC } from "@/constants/Tokens";
import { useConnectWallet, useSetChain } from "@web3-onboard/react";
import { getERC20Balance } from "@/helpers/ERC20helpers";

interface BalancesProps {
  shieldedBalances: Map<string, bigint>;
}

export default function Balances({
  shieldedBalances,
}: BalancesProps): JSX.Element {
  const [{ wallet }] = useConnectWallet();
  const [USDCBalance, setUSDCBalance] = useState<number>(0);
  const [WBTCBalance, setWBTCBalance] = useState<number>(0);
  const [{ chains, connectedChain }, setChain] = useSetChain();

  useEffect(() => {
    if (wallet && connectedChain) {
      const rpcUrl = chains.find(
        (chain) => chain.id === connectedChain?.id
      )?.rpcUrl;

      if (wallet && rpcUrl && rpcUrl !== "") {
        getERC20Balance(
          USDC_contract_addresses[connectedChain?.id],
          wallet?.accounts[0]?.address || "",
          rpcUrl
        ).then((result) => setUSDCBalance(result.toNumber()));

        getERC20Balance("", wallet?.accounts[0]?.address || "", rpcUrl).then(
          (result) => setWBTCBalance(result.toNumber())
        );
      }
    }
  }, [wallet, connectedChain, chains]);

  return (
    <Card p={4} border="1px" borderColor="gray.200" borderRadius="md">
      <CardHeader display="flex" justifyContent="center">
        <Heading size="md">Balances</Heading>
      </CardHeader>
      <CardBody>
        <HStack spacing={3} justify="center">
          <TokenBalanceCard
            symbol={"USDC"}
            balance={USDCBalance}
            icon={"https://cryptologos.cc/logos/usd-coin-usdc-logo.png"}
          />
          <TokenBalanceCard
            symbol={WBTC.symbol}
            balance={WBTCBalance}
            icon={WBTC.icon}
          />
        </HStack>
      </CardBody>
    </Card>
  );
}
