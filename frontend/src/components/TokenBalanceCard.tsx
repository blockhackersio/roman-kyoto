import { Box, Card, CardHeader, Heading, Text, VStack } from "@chakra-ui/react";
import { useConnectWallet, useSetChain, useWallets } from "@web3-onboard/react";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { USDC } from "@/constants/Tokens";
import { ERC20Abi } from "@/constants/Abis";
import { chains } from "@/constants/Chains";

export default function TokenBalanceCard(props: {
    symbol: string;
    balance: number;
}): JSX.Element {
    return (
        <Card border="1px" borderColor="gray.200" p={4} borderRadius="md">
            <VStack spacing={2}>
                <CardHeader>
                    <Heading size="md"> {props.symbol}</Heading>
                </CardHeader>
                <Text>Token: {props.symbol}</Text>

                <Text>Balance: {props.balance}</Text>
            </VStack>
        </Card>
    );
}
