import { useEffect, useState } from "react";
import { useConnectWallet } from "@web3-onboard/react";
import { ethers } from "ethers";
import { Button, Center, Heading, VStack, Image, Text } from "@chakra-ui/react";

export default function ConnectWallet() {
    const [{ wallet, connecting }, connect, disconnect] = useConnectWallet();

    return (
        <Center p={4} m={4}>
            <VStack spacing={4}>
                <Image
                    src="https://example.com/wallet-connect-icon.png"
                    alt="Connect Wallet"
                    boxSize="150px"
                />
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
                    colorScheme="teal"
                >
                    Connect Wallet
                </Button>
            </VStack>
        </Center>
    );
}
