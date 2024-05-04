const INFURA_KEY = "83b6d4ffde624c92bfcae15235ac20f0";
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
];
