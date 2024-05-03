import React, { useEffect } from "react";
import TokenBalanceCard from "./TokenBalanceCard";
import { HStack } from "@chakra-ui/react";
import { USDC, WBTC } from "@/constants/Tokens";
import { useConnectWallet, useWallets } from "@web3-onboard/react";
import { ethers } from "ethers";
import { ERC20Abi } from "@/constants/Abis";
import { getERC20Balance } from "@/helper/ERC20helpers";

export default function Balances(): JSX.Element {
    const [{ wallet }] = useConnectWallet();

    return (
        <>
            {wallet && (
                <HStack spacing={3} justify="center" margin={4}>
                    <TokenBalanceCard symbol={USDC.symbol} balance={10} />
                    <TokenBalanceCard symbol={WBTC.symbol} balance={10} />
                </HStack>
            )}
        </>
    );
}
