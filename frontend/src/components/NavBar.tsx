"use client";

import {
    Box,
    Flex,
    Text,
    IconButton,
    Button,
    useColorModeValue,
    useColorMode,
    Select,
    Menu,
    MenuButton,
    MenuItem,
    MenuList,
} from "@chakra-ui/react";
import { ChevronDownIcon, MoonIcon, SunIcon } from "@chakra-ui/icons";
import { useConnectWallet, useSetChain } from "@web3-onboard/react";

export default function NavBar() {
    const { colorMode, toggleColorMode } = useColorMode();

    const [{ wallet }, connect, disconnect] = useConnectWallet();
    const [{ chains, connectedChain }, setChain] = useSetChain();

    return (
        <Box>
            <Flex
                minH={"60px"}
                py={{ base: 2 }}
                px={{ base: 4 }}
                borderBottom={1}
                borderStyle={"solid"}
                borderColor={useColorModeValue("gray.200", "gray.900")}
                align={"center"}
            >
                <Flex
                    flex={{ base: 1 }}
                    justify={{ base: "center", md: "start" }}
                >
                    <Text fontSize="l" fontWeight="bold" marginRight={"0px"}>
                        Roman Kyoto
                    </Text>
                </Flex>
                <IconButton
                    icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
                    onClick={toggleColorMode}
                    aria-label={"Toggle Color Mode"}
                    marginX={1}
                />

                {wallet ? (
                    <>
                        <Select
                            marginX={1}
                            width={"auto"}
                            onChange={({ target: { value } }) => {
                                if (
                                    chains.find(({ id }) => id === value) ===
                                    undefined
                                ) {
                                    alert("Invalid chain");
                                } else {
                                    setChain({ chainId: value });
                                }
                            }}
                            value={connectedChain?.id}
                        >
                            {chains.map(({ id, label }) => {
                                return (
                                    <option key={id} value={id}>
                                        {label}
                                    </option>
                                );
                            })}
                        </Select>
                        <Menu closeOnBlur closeOnSelect>
                            <MenuButton
                                marginX={1}
                                as={Button}
                                rightIcon={<ChevronDownIcon />}
                            >
                                {wallet.accounts[0].address.slice(0, 6)}...
                                {wallet.accounts[0].address.slice(-4)}
                            </MenuButton>
                            <MenuList>
                                <MenuItem
                                    onClick={() => {
                                        disconnect(wallet);
                                    }}
                                    maxWidth={"205px"}
                                >
                                    Disconnect
                                </MenuItem>
                            </MenuList>
                        </Menu>
                    </>
                ) : (
                    <Button marginX={1} onClick={() => connect()}>
                        Connect Wallet
                    </Button>
                )}
            </Flex>
        </Box>
    );
}
