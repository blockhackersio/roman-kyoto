import { chains } from "@/constants/Chains";

// Get RPC Url for the connected chain based on a chainId
export function getRpcUrl(chainId: number | string): string | undefined {
  const chain = chains.find((chain) => chain.id === chainId);
  return chain?.rpcUrl;
}
