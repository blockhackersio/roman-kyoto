import { ERC20Abi } from "@/constants/Abis";
import { chains } from "@/constants/Chains";
import { BigNumber, ethers } from "ethers";

export async function getERC20Balance(
    contractAddress: string,
    walletAddress: string,
    rpcUrl: string
): Promise<BigNumber> {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    if (!provider) throw new Error("Invalid chain");
    const contract = new ethers.Contract(contractAddress, ERC20Abi, provider);
    const balance = await contract.balanceOf(walletAddress);
    return balance;
}
