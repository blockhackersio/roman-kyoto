const INFURA_KEY = "1f80dfadfd824fe8ba572bc9341b0535";
export const chains = [
    {
        id: "0x1",
        token: "ETH",
        label: "Ethereum Mainnet",
        rpcUrl: `https://mainnet.infura.io/v3/${INFURA_KEY}`,
    },
    {
        id: 11155111,
        token: "ETH",
        label: "Sepolia",
        rpcUrl: "https://rpc.sepolia.org/",
    },
    {
        id: "0x13881",
        token: "MATIC",
        label: "Polygon - Mumbai",
        rpcUrl: "https://matic-mumbai.chainstacklabs.com",
    },
    {
        id: "0x38",
        token: "BNB",
        label: "Binance",
        rpcUrl: "https://bsc-dataseed.binance.org/",
    },
    {
        id: "0xA",
        token: "OETH",
        label: "OP Mainnet",
        rpcUrl: "https://mainnet.optimism.io",
    },
    {
        id: "0xA4B1",
        token: "ARB-ETH",
        label: "Arbitrum",
        rpcUrl: "https://rpc.ankr.com/arbitrum",
    },
    {
        id: "0xa4ec",
        token: "ETH",
        label: "Celo",
        rpcUrl: "https://1rpc.io/celo",
    },
    {
        id: 666666666,
        token: "DEGEN",
        label: "Degen",
        rpcUrl: "https://rpc.degen.tips",
    },
    {
        id: 80002,
        token: "MATIC",
        label: "Polygon - Amoy",
        rpcUrl: "https://rpc-amoy.polygon.technology/",
    },
    {
        id: 84532,
        token: "ETH",
        label: "Base Sepolia",
        rpcUrl: "https://sepolia.base.org",
    },
];
