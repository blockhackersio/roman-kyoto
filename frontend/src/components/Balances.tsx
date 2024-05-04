import React, { useEffect, useState } from "react";
import TokenBalanceCard from "./TokenBalanceCard";
import { Heading, HStack, VStack } from "@chakra-ui/react";
import { USDC, WBTC } from "@/constants/Tokens";
import { useConnectWallet, useWallets } from "@web3-onboard/react";
import { getERC20Balance } from "@/helper/ERC20helpers";
import { chains } from "@/constants/Chains";

export default function Balances(): JSX.Element {
    const [{ wallet }] = useConnectWallet();

    const [USDCBalance, setUSDCBalance] = useState<number>(0);
    const [WBTCBalance, setWBTCBalance] = useState<number>(0);
    useEffect(() => {
        if (wallet) {
            getERC20Balance(
                USDC.contractAddress,
                wallet?.accounts[0]?.address || "",
                chains.find((chain) => chain.id === USDC.chainId)?.rpcUrl || ""
            ).then((result) => setUSDCBalance(result.toNumber()));

            getERC20Balance(
                WBTC.contractAddress,
                wallet?.accounts[0]?.address || "",
                chains.find((chain) => chain.id === WBTC.chainId)?.rpcUrl || ""
            ).then((result) => setWBTCBalance(result.toNumber()));
        }
    }, [wallet]);

    return (
        <VStack>
            <Heading size="md" textAlign="center" mb={4}>
                Balances
            </Heading>

            <HStack spacing={3} justify="center">
                <TokenBalanceCard
                    symbol={USDC.symbol}
                    balance={USDCBalance}
                    icon={USDC.icon}
                />
                <TokenBalanceCard
                    symbol={WBTC.symbol}
                    balance={WBTCBalance}
                    icon={WBTC.icon}
                />
            </HStack>
        </VStack>
    );
}
