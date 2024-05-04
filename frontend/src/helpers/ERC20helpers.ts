import { ERC20Abi } from "@/constants/Abis";
import { chains } from "@/constants/Chains";
import { BigNumber, ethers } from "ethers";

export async function getERC20Balance(
    contractAddress: string,
    walletAddress: string,
    rpcUrl: string
): Promise<BigNumber> {
    if (rpcUrl === "" || contractAddress === "" || walletAddress === "") {
        return BigNumber.from(0);
    }
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    if (!provider) {
        throw new Error("Provider not found");
    }
    const contract = new ethers.Contract(contractAddress, ERC20Abi, provider);
    const balance = await contract.balanceOf(walletAddress);
    const decimals = await contract.decimals();
    const formattedBalance = balance.div(BigNumber.from(10).pow(decimals));
    return formattedBalance;
}
