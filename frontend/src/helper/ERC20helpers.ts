import { ERC20Abi } from "@/constants/Abis";
import { BigNumber, ethers } from "ethers";

export async function getERC20Balance(
    provider: ethers.providers.Web3Provider,
    contractAddress: string,
    walletAddress: string
): Promise<BigNumber> {
    const contract = new ethers.Contract(contractAddress, ERC20Abi, provider);
    const balance = await contract.balanceOf(walletAddress);
    return balance;
}
