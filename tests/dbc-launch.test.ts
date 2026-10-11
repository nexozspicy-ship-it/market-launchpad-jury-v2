import test from 'node:test';
import assert from 'node:assert/strict';
import {Keypair} from '@solana/web3.js';
import {getAssociatedTokenAddressSync} from '@solana/spl-token';
import {DynamicBondingCurveClient, DYNAMIC_BONDING_CURVE_PROGRAM_ID} from '@meteora-ag/dynamic-bonding-curve-sdk';
import {initialBuyLamports, PUBLIC_INITIAL_BUY_MAX_LAMPORTS} from '../src/launch-initial-buy.ts';
import {prepareCommunityLaunch} from '../src/prepare-community-launch.ts';
import {syntheticSdkConfig} from './helpers/synthetic-sdk-config.ts';

test('SOL inputs use exact lamports and reject fractional precision, exponents and excess', () => {
  assert.equal(initialBuyLamports('', PUBLIC_INITIAL_BUY_MAX_LAMPORTS), 0);
  assert.equal(initialBuyLamports('0.000000001', PUBLIC_INITIAL_BUY_MAX_LAMPORTS), 1);
  assert.equal(initialBuyLamports('2', PUBLIC_INITIAL_BUY_MAX_LAMPORTS), 2_000_000_000);
  for (const value of ['2.000000001', '0.0000000001', '-1', '1e-3', 'Infinity']) assert.throws(() => initialBuyLamports(value, PUBLIC_INITIAL_BUY_MAX_LAMPORTS));
});

for (const amount of ['0', '0.01', '2']) test(`real SDK builds one unsigned creation transaction, initial buy ${amount} SOL`, async t => {
  t.mock.method(globalThis, 'fetch', async () => {throw new Error('No network reads are permitted by this offline test.');});
  const f = await syntheticSdkConfig(), mint = Keypair.generate().publicKey, creator = Keypair.generate().publicKey;
  const result = await prepareCommunityLaunch(f.client, {
    mint, creator, configAddress: f.configAddress, expectedTreasury: f.treasury,
    name: 'Synthetic Review Place', symbol: 'REVIEW', metadataUri: 'https://example.invalid/review.json', initialBuySol: amount,
  });
  const dbc = result.transaction.instructions.filter(ix => ix.programId.equals(DYNAMIC_BONDING_CURVE_PROGRAM_ID));
  const coder = f.client.state.program.coder.instruction as typeof f.client.state.program.coder.instruction & {
    decode(data: Buffer): {name: string; data: unknown} | null;
  };
  const decoded = dbc.map(ix => coder.decode(ix.data));
  assert.ok(decoded.every(Boolean));
  assert.equal(decoded[0]!.name, 'initializeVirtualPoolWithSplToken');
  assert.equal(dbc.length, amount === '0' ? 1 : 2);
  assert.equal(result.transaction.signatures.some(entry => entry.signature !== null), false);
  assert.ok(dbc[0]!.keys.some(key => key.pubkey.equals(mint) && key.isSigner));
  assert.ok(dbc[0]!.keys.some(key => key.pubkey.equals(creator) && key.isSigner));
  if (amount !== '0') {
    assert.equal(decoded[1]!.name, 'swap');
    const data = decoded[1]!.data as {params: {amountIn: {toString(): string}; minimumAmountOut: {toString(): string}}};
    assert.equal(data.params.amountIn.toString(), String(result.buyLamports));
    assert.equal(data.params.minimumAmountOut.toString(), result.minimumTokens);
    assert.ok(BigInt(result.expectedTokens) >= BigInt(result.minimumTokens));
    assert.ok(BigInt(result.minimumTokens) > 0n);
    assert.ok(dbc[1]!.keys.some(key => key.pubkey.equals(creator) && key.isSigner));
    assert.ok(dbc[1]!.keys.some(key => key.pubkey.equals(result.pool)));
    const swapAccounts = f.client.state.program.idl.instructions.find(ix => ix.name === 'swap')!.accounts;
    const receiverIndex = swapAccounts.findIndex(account => account.name === 'outputTokenAccount');
    assert.ok(receiverIndex >= 0);
    assert.ok(dbc[1]!.keys[receiverIndex]!.pubkey.equals(getAssociatedTokenAddressSync(mint, creator)));
  }
  result.transaction.feePayer = creator;
  result.transaction.recentBlockhash = Keypair.generate().publicKey.toBase58();
  assert.ok(result.transaction.serialize({requireAllSignatures: false, verifySignatures: false}).length <= 1232);
  assert.ok(f.reads.includes(f.configAddress.toBase58()));
});

test('a mismatched SOL fee destination stops before construction', async () => {
  const f = await syntheticSdkConfig();
  await assert.rejects(prepareCommunityLaunch(f.client, {
    mint: Keypair.generate().publicKey, creator: Keypair.generate().publicKey,
    configAddress: f.configAddress, expectedTreasury: Keypair.generate().publicKey,
    name: 'Synthetic', symbol: 'REVIEW', metadataUri: 'https://example.invalid/review.json', initialBuySol: '0',
  }), /does not route SOL fees/);
});

test('SDK pin is the exercised integration, not a transaction mock', async () => {
  const f = await syntheticSdkConfig();
  assert.ok(f.client instanceof DynamicBondingCurveClient);
  assert.equal((await f.client.state.getPoolConfig(f.configAddress))!.creatorTradingFeePercentage, 10);
});
