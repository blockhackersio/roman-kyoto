import { chains } from "@/constants/Chains";
import { USDC, WBTC } from "@/constants/Tokens";
import { Button, Card, Input, Select, VStack } from "@chakra-ui/react";
import { useConnectWallet } from "@web3-onboard/react";
import { useState, useEffect } from "react";

export default function TransferCard(): JSX.Element {
    const [{ wallet }] = useConnectWallet();

    const [selectedToken, setSelectedToken] = useState("USDC");
    const [transferAmount, setTransferAmount] = useState(0);
    const [maxTransfer, setMaxTransfer] = useState(0);

    useEffect(() => {
        if (wallet) {
            const fetchBalance = async () => {
                const token = selectedToken === "USDC" ? USDC : WBTC;
                const balance = 100; // TODO: Fetch Shielded Balance
                setMaxTransfer(balance);
            };
            fetchBalance();
        }
    }, [wallet, selectedToken]);

    const handleTokenChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedToken(event.target.value);
        setTransferAmount(0); // Reset transfer amount on token change
    };

    const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const amount = Math.min(Number(event.target.value), maxTransfer);
        setTransferAmount(amount);
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
                    value={transferAmount}
                    onChange={handleAmountChange}
                    max={maxTransfer}
                    placeholder="Enter transfer amount"
                />
                <Button
                    onClick={
                        () =>
                            console.log(
                                `Transfer ${transferAmount} ${selectedToken}`
                            )
                        // TODO: Implement transfer functionality
                    }
                    isDisabled={!wallet || transferAmount <= 0}
                >
                    Transfer
                </Button>
            </VStack>
        </Card>
    );
}
