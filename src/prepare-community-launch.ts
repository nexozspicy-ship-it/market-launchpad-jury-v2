import {DynamicBondingCurveClient, deriveDbcPoolAddress, type PoolConfig} from '@meteora-ag/dynamic-bonding-curve-sdk';
import {NATIVE_MINT} from '@solana/spl-token';
import {type PublicKey, type Transaction} from '@solana/web3.js';
import {assertBusinessLaunchConfig} from './business-live-policy.ts';
import {initialBuyLamports, quoteInitialBuy, PUBLIC_INITIAL_BUY_MAX_LAMPORTS} from './launch-initial-buy.ts';

export type CommunityLaunchInput = {
  mint: PublicKey;
  creator: PublicKey;
  configAddress: PublicKey;
  expectedTreasury: PublicKey;
  name: string;
  symbol: string;
  metadataUri: string;
  initialBuySol: string;
};

/** An unsigned review extraction of the public launch's SDK construction.
 * Callers supply already validated metadata and addresses. This export has no
 * wallet provider, signing method, transport, submission or deployment action. */
export async function prepareCommunityLaunch(client: DynamicBondingCurveClient, input: CommunityLaunchInput): Promise<{
  transaction: Transaction; pool: PublicKey; config: PoolConfig;
  buyLamports: number; expectedTokens: string; minimumTokens: string;
}> {
  const buyLamports = initialBuyLamports(input.initialBuySol, PUBLIC_INITIAL_BUY_MAX_LAMPORTS);
  const config = await client.state.getPoolConfig(input.configAddress);
  if (!config) throw new Error('The reviewed community pool configuration is unavailable.');
  assertBusinessLaunchConfig(config, input.expectedTreasury.toBase58());
  const purchase = quoteInitialBuy(client, config, buyLamports);
  const transaction = await client.creator.createPoolWithFirstBuy({
    createPoolParam: {
      baseMint: input.mint, config: input.configAddress, payer: input.creator,
      poolCreator: input.creator, name: input.name, symbol: input.symbol, uri: input.metadataUri,
    },
    firstBuyParam: {
      buyer: input.creator, receiver: input.creator, buyAmount: purchase.amount,
      minimumAmountOut: purchase.minimum, referralTokenAccount: null,
    },
  });
  return {
    transaction, config, pool: deriveDbcPoolAddress(NATIVE_MINT, input.mint, input.configAddress),
    buyLamports, expectedTokens: purchase.expected.toString(),
    minimumTokens: purchase.minimum.toString(),
  };
}
