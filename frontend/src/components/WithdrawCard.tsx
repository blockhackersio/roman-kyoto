import { chains } from "@/constants/Chains";
import { USDC, WBTC } from "@/constants/Tokens";
import { getERC20Balance } from "@/helper/ERC20helpers";
import { Button, Card, Input, Select, VStack } from "@chakra-ui/react";
import { useConnectWallet } from "@web3-onboard/react";
import { useState, useEffect } from "react";

export default function WithdrawCard(): JSX.Element {
    const [{ wallet }] = useConnectWallet();

    const [selectedToken, setSelectedToken] = useState("USDC");
    const [withdrawAmount, setWithdrawAmount] = useState(0);
    const [maxWithdraw, setMaxWithdraw] = useState(0);

    useEffect(() => {
        if (wallet) {
            const fetchBalance = async () => {
                const token = selectedToken === "USDC" ? USDC : WBTC;
                const balance = 20; // TODO: Implement getShieldedBalance function
                setMaxWithdraw(balance);
            };
            fetchBalance();
        }
    }, [wallet, selectedToken]);

    const handleTokenChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedToken(event.target.value);
        setWithdrawAmount(0); // Reset withdraw amount on token change
    };

    const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const amount = Math.min(Number(event.target.value), maxWithdraw);
        setWithdrawAmount(amount);
    };

    return (
        <Card p={4} border="1px" borderColor="gray.200" borderRadius="md">
            <VStack spacing={4}>
                <Select value={selectedToken} onChange={handleTokenChange}>
                    <option value="USDC">USDC</option>
                    <option value="WBTC">WBTC</option>
                </Select>
                <Input
                    type="number"
                    value={withdrawAmount}
                    onChange={handleAmountChange}
                    max={maxWithdraw}
                    placeholder="Enter withdraw amount"
                />
                <Button
                    onClick={
                        () =>
                            console.log(
                                `Withdraw ${withdrawAmount} ${selectedToken}`
                            )
                        // TODO: Implement withdraw functionality
                    }
                    isDisabled={!wallet || withdrawAmount <= 0}
                >
                    Withdraw
                </Button>
            </VStack>
        </Card>
    );
}
