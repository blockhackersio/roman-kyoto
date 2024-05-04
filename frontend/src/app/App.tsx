import Balances from "@/components/Balances";
import ConnectWallet from "@/components/ConnectWallet";
import DepositCard from "@/components/DepositCard";
import TransferCard from "@/components/TransferCard";
import WithdrawCard from "@/components/WithdrawCard";
import { SimpleGrid } from "@chakra-ui/react";
import { useConnectWallet } from "@web3-onboard/react";

export default function App() {
    const [{ wallet }] = useConnectWallet();
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
                    <Balances />
                    <TransferCard />
                    <DepositCard />
                    <WithdrawCard />
                </SimpleGrid>
            )}
        </>
    );
}
