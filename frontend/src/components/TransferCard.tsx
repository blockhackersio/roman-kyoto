import { USDC, WBTC } from "@/constants/Tokens";
import {
    Button,
    Card,
    CardBody,
    CardFooter,
    CardHeader,
    Heading,
    Input,
    Select,
    Stack,
} from "@chakra-ui/react";
import { useConnectWallet } from "@web3-onboard/react";
import { useState, useEffect } from "react";
import { chains } from "../constants/Chains";

export default function TransferCard(): JSX.Element {
    const [{ wallet }] = useConnectWallet();

    const [selectedToken, setSelectedToken] = useState("USDC");
    const [selectedChain, setSelectedChain] = useState(chains[0].id);
    const [recipientAddress, setRecipientAddress] = useState("");
    const [transferAmount, setTransferAmount] = useState<number>();
    const [maxTransfer, setMaxTransfer] = useState<number>(0);

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

    const handleChainChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedChain(Number(event.target.value));
    };

    const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const amount = Math.min(Number(event.target.value), maxTransfer);
        setTransferAmount(amount);
    };

    return (
        <Card p={4} border="1px" borderColor="gray.200" borderRadius="md">
            <CardHeader display="flex" justifyContent="center">
                <Heading size="md">Transfer</Heading>
            </CardHeader>
            <CardBody>
                <Stack spacing={4}>
                    <Select value={selectedChain} onChange={handleChainChange}>
                        {chains.map((chain) => (
                            <option value={chain.id} key={chain.id}>
                                {chain.label}
                            </option>
                        ))}
                    </Select>
                    <Select value={selectedToken} onChange={handleTokenChange}>
                        <option value="USDC">USDC</option>
                        <option value="WBTC">WBTC</option>
                    </Select>
                    <Input
                        type="text"
                        placeholder="Enter recipient address"
                        value={recipientAddress}
                        onChange={(e) => setRecipientAddress(e.target.value)}
                        required
                        pattern="^0x[a-fA-F0-9]{40}$"
                    />
                    <Input
                        type="number"
                        value={transferAmount}
                        onChange={handleAmountChange}
                        max={maxTransfer}
                        placeholder="Enter transfer amount"
                        required
                    />
                </Stack>
            </CardBody>
            <CardFooter display="flex" justifyContent="center">
                <Button
                    onClick={() =>
                        console.log(
                            `Transfer ${transferAmount} ${selectedToken}`
                        )
                    }
                    isDisabled={
                        !wallet ||
                        !transferAmount ||
                        transferAmount <= 0 ||
                        !recipientAddress
                    }
                    colorScheme="red"
                    width="50%"
                >
                    Transfer
                </Button>
            </CardFooter>
        </Card>
    );
}
