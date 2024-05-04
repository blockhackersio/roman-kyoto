import { useConnectWallet } from "@web3-onboard/react";
import { ethers } from "ethers";
import { Button, Center, Heading, VStack, Text } from "@chakra-ui/react";
import Image from "next/image";
import toriigate from "../images/toriigate.jpg";
export default function ConnectWallet() {
    const [{ wallet, connecting }, connect, disconnect] = useConnectWallet();

    return (
        <Center p={4} m={4}>
            <VStack spacing={4}>
                <Image src={toriigate.src} alt="" width={200} height={200} />
                <Heading as="h1" size="xl">
                    Connect Your Wallet
                </Heading>
                <Text fontSize="md" textAlign="center">
                    Please connect your wallet to interact with the
                    decentralized application.
                </Text>
                <Button
                    isLoading={connecting}
                    onClick={() => connect()}
                    colorScheme="red"
                >
                    Connect Wallet
                </Button>
            </VStack>
        </Center>
    );
}
