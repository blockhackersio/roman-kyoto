export async function getShieldedBalance(): Promise<number> {
    return 20;
}

export async function deposit(amount: number, token: string): Promise<void> {
    console.log(`Depositing ${amount} ${token}`);
}

export async function withdraw(amount: number, token: string): Promise<void> {
    console.log(`Withdrawing ${amount} ${token}`);
}

export async function transfer(
    amount: number,
    to: string,
    token: string,
    chainId: number
): Promise<void> {
    console.log(`Transferring ${amount} ${token} to ${to} on chain ${chainId}`);
}
