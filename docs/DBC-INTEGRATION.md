# Meteora DBC integration

## Why DBC

The product needs a public token-launch curve that can progress to AMM liquidity, while keeping the token creator and the associated place connected through explicit fee records. DBC supplies the launch curve and DAMM v2 migration path. Market supplies story preparation, token metadata, wallet review, confirmed registration and the persistent-world association.

The protocol name **Dynamic Bonding Curve** does not mean that Market enables dynamic trading-fee adjustments. The current community configuration uses a fixed 225 bps fee.

## Reviewable source

| Module | Role |
| --- | --- |
| `src/prepare-community-launch.ts` | Unsigned extraction of the application's actual `createPoolWithFirstBuy` construction. No signer or submission method. |
| `src/launch-initial-buy.ts` | Exact decimal-SOL input, quote for the empty curve, 100 bps slippage bound, capacity rejection. |
| `src/business-live-policy.ts` | Community configuration checks: fixed fee, SOL quote and approved destination supplied by the caller. |
| `src/meteora-config-policy.ts` | Fee and migration parameter validation. |
| `src/registered-fee-policy.ts` | Selected V3/V4 manual accounting rules for current registered launches. |
| `src/fee-accounting.ts` | Exact collection/allocation/payment accounting, including explicit unknown and mismatch states. |
| `src/place-fees-live.ts` | DBC lifetime allocation and separate collection evidence. |
| `src/place-fees-reader.ts` | Bounded batches, stale-source handling and validation of returned fee snapshots. |

The helper's inputs are caller-supplied public keys and metadata, not embedded production account settings. In the complete app, metadata validation, access control, transaction simulation, wallet review and confirmation surround this construction. Those services are outside this export.

## Creation and optional first purchase

1. Read the requested pool configuration and check its fee/quote routing.
2. Parse the optional purchase in lamports without floating-point arithmetic.
3. Obtain a quote from the pinned SDK using the initial curve configuration. Reject a zero-output or partially filled input.
4. Call `client.creator.createPoolWithFirstBuy` once with the pool parameters and optional purchase parameters.
5. Return the unsigned transaction and derived DBC pool address for the application's simulation and review.

The same transaction contains creation before the initial buy. There is no separately broadcast pool-creation transaction in this helper. Atomic construction does not guarantee submission, confirmation or exclusion of later transactions.

The offline tests decode the real SDK-generated DBC instructions, check input/minimum output and measure the unsigned transaction against Solana's 1,232-byte packet limit. They also verify the no-purchase case and reject a mismatched fee destination.

## Fee attribution

For a verified DBC source, `metrics.totalTradingQuoteFee` is the eligible trading fee after protocol/referral deductions and before the creator/partner split. Its lifetime total remains meaningful after a party collects fees.

For the current 75% place policy:

```text
place lifetime allocation = floor(eligible net quote fee × 75 / 100)
place allocation from a finalized treasury receipt = 75 / 90 of that receipt
```

The implementation does not add a potentially stale uncollected balance to a newly recorded collection to manufacture a lifetime total. It preserves exact atomic amounts and separates on-chain accrual, finalized receipts and recorded owner payments.

After migration, DBC history remains available. The exported counter states that DAMM lifetime fees are not fully verified. A migration configuration check is distinct from execution of that migration or proof that all migrated trades have succeeded.

## Upstream dependency

The exercised package is [`@meteora-ag/dynamic-bonding-curve-sdk` 1.5.13](https://github.com/MeteoraAg/dynamic-bonding-curve-sdk). The lockfile pins its dependency graph. Meteora's program and SDK retain their upstream authorship and licenses.
