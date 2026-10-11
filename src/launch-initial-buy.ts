import type { DynamicBondingCurveClient, PoolConfig } from '@meteora-ag/dynamic-bonding-curve-sdk';
export const PUBLIC_INITIAL_BUY_MAX_LAMPORTS = 2000000000;
export function initialBuyLamports(value: string, maximum = 1000000000): number {
    const amount = value.trim() || '0';
    if (!/^(?:0|[1-9]\d*)(?:\.\d{1,9})?$/.test(amount))
        throw Error('Enter a SOL amount with up to 9 decimal places.');
    const [whole, fraction = ''] = amount.split('.'), atoms = BigInt(whole) * 1000000000n + BigInt(fraction.padEnd(9, '0'));
    if (atoms > BigInt(maximum))
        throw Error(`Initial buys are limited to ${maximum / 1e9} SOL per launch. Choose a smaller amount.`);
    return Number(atoms);
}
export function quoteInitialBuy(client: DynamicBondingCurveClient, config: PoolConfig, lamports: number) {
    const BN = config.sqrtStartPrice.constructor as new (value: string) => PoolConfig['sqrtStartPrice'];
    const quote = client.pool.getQuoteFromInputAmount({ config, amountIn: new BN(String(lamports)), swapBaseForQuote: false, slippageBps: 100, hasReferral: false, eligibleForFirstSwapWithMinFee: false }) as unknown as {
        outputAmount: PoolConfig['sqrtStartPrice'];
        minimumAmountOut: PoolConfig['sqrtStartPrice'];
        includedFeeInputAmount: PoolConfig['sqrtStartPrice'];
        amountLeft: PoolConfig['sqrtStartPrice'];
    };
    if (!quote.outputAmount || !quote.minimumAmountOut || quote.outputAmount.isZero() || quote.minimumAmountOut.isZero())
        throw Error('The initial buy is too small to receive tokens.');
    if (!quote.includedFeeInputAmount.eq(new BN(String(lamports))) || !quote.amountLeft.isZero())
        throw Error('This initial buy would exceed the curve capacity. Choose a smaller amount.');
    return { amount: new BN(String(lamports)), expected: quote.outputAmount, minimum: quote.minimumAmountOut };
}
