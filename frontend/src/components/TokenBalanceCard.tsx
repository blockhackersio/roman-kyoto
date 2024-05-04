import {
    Box,
    Card,
    CardHeader,
    Heading,
    HStack,
    Image,
    Text,
    VStack,
} from "@chakra-ui/react";

export default function TokenBalanceCard(props: {
    symbol: string;
    balance: number;
    icon: string;
}): JSX.Element {
    return (
        <Card border="1px" borderColor="gray.200" p={4} borderRadius="md">
            <VStack spacing={2}>
                <CardHeader>
                    <HStack>
                        <Image
                            borderRadius="full"
                            boxSize={8}
                            src={props.icon}
                            alt={props.symbol}
                        />
                        <Heading size="md"> {props.symbol}</Heading>
                    </HStack>
                </CardHeader>

                <Text> Unshielded Balance: {props.balance}</Text>
                <Text> Shielded Balance: TODO</Text>
            </VStack>
        </Card>
    );
}
