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
import { USDC, WBTC } from "@/constants/Tokens";
import { useConnectWallet, useSetChain } from "@web3-onboard/react";
import { getERC20Balance } from "@/helpers/ERC20helpers";

export default function Balances(): JSX.Element {
    const [{ wallet }] = useConnectWallet();
    const [USDCBalance, setUSDCBalance] = useState<number>(0);
    const [WBTCBalance, setWBTCBalance] = useState<number>(0);
    const [{ chains, connectedChain }, setChain] = useSetChain();

    useEffect(() => {
        if (wallet && connectedChain) {
            const rpcUrl = chains.find(
                (chain) => chain.id === connectedChain?.id
            )?.rpcUrl;

            var USDCcontractAddress = "";
            switch (connectedChain?.id) {
                case "0x14a34":
                    USDCcontractAddress =
                        "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
                    break;
                case "0x13882":
                    USDCcontractAddress =
                        "0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582";
                    break;
                case "0x61":
                    USDCcontractAddress = "";
                    break;
            }
            if (wallet && rpcUrl && rpcUrl !== "") {
                getERC20Balance(
                    USDCcontractAddress,
                    wallet?.accounts[0]?.address || "",
                    rpcUrl
                ).then((result) => setUSDCBalance(result.toNumber()));

                getERC20Balance(
                    "",
                    wallet?.accounts[0]?.address || "",
                    rpcUrl
                ).then((result) => setWBTCBalance(result.toNumber()));
            }
        }
    }, [wallet, connectedChain]);

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
                        icon={
                            "https://cryptologos.cc/logos/usd-coin-usdc-logo.png"
                        }
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
