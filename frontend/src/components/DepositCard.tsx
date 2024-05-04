import { chains } from "@/constants/Chains";
import { USDC, WBTC } from "@/constants/Tokens";
import { getERC20Balance } from "@/helpers/ERC20helpers";

import {
    Button,
    Card,
    CardHeader,
    Input,
    Select,
    Heading,
    CardBody,
    CardFooter,
    Stack,
} from "@chakra-ui/react";
import { useConnectWallet } from "@web3-onboard/react";
import { useState, useEffect } from "react";

export default function DepositCard(): JSX.Element {
    const [{ wallet }] = useConnectWallet();

    const [selectedToken, setSelectedToken] = useState("USDC");
    const [depositAmount, setDepositAmount] = useState<number>();
    const [maxDeposit, setMaxDeposit] = useState<number>(0);


    useEffect(() => {
        if (wallet) {
            const fetchBalance = async () => {
                const token = selectedToken === "USDC" ? USDC : WBTC;
                const balance = await getERC20Balance(
                    token.contractAddress,
                    wallet?.accounts[0]?.address || "",
                    chains.find((chain) => chain.id === token.chainId)
                        ?.rpcUrl || ""
                );
                setMaxDeposit(balance.toNumber());
            };
            fetchBalance();
        }
    }, [wallet, selectedToken]);

    const handleTokenChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedToken(event.target.value);
        setDepositAmount(0); // Reset deposit amount on token change
    };

    const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const amount = Math.min(Number(event.target.value), maxDeposit);
        setDepositAmount(amount);
    };

    return (
        <Card p={4} border="1px" borderColor="gray.200" borderRadius="md">
            <CardHeader display="flex" justifyContent="center">
                <Heading size="md">Deposit</Heading>
            </CardHeader>
            <CardBody>
                <Stack spacing={4}>
                    <Select value={selectedToken} onChange={handleTokenChange}>
                        <option value="USDC">USDC</option>
                        <option value="WBTC">WBTC</option>
                    </Select>
                    <Input
                        type="number"
                        value={depositAmount}
                        onChange={handleAmountChange}
                        max={maxDeposit}
                        placeholder="Enter deposit amount"
                    />
                </Stack>
                <CardFooter display="flex" justifyContent="center">
                    <Button
                        onClick={
                            () =>
                                console.log(
                                    `Deposit ${depositAmount} ${selectedToken}`
                                )
                            // TODO: Implement deposit functionality
                        }
                        isDisabled={
                            !wallet ||
                            !selectedToken ||
                            !depositAmount ||
                            depositAmount <= 0
                        }
                        colorScheme="red"
                        width={"50%"}
                    >
                        Deposit
                    </Button>
                </CardFooter>
            </CardBody>
        </Card>
    );
}
