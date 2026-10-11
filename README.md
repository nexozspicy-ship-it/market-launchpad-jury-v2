# Market.Launchpad — technical review for Meteora and Colosseum

Market connects the stories of real places to Solana community tokens and storefronts in a persistent, evolving 3D world.

[Product](https://marketdotlaunchpad.com/) · [X: @marketdotpad_](https://x.com/marketdotpad_) · [V2 walkthrough — 1:24](https://youtu.be/Bh56M_c_fEU) · [Colosseum Week 4 video — 0:59](https://youtu.be/IH8SCAE3gUE)

**This is the maintained public technical review repository for the Meteora and Colosseum submissions.** Its URL is stable. The package is a selected source export, not the complete application or a production deployment bundle.

## V2 status — 11 October 2026

The V2 build is deployed behind a public maintenance screen while release checks continue. The public site remains closed. After reopening, World, Earth and News Radar discovery are intended to be available without a Citizen Pass or a $MARKET holding. Launching requires connecting a wallet, reviewing the transaction and making an initial purchase of **0.1–2 SOL**, with account setup and network fees added separately.

The integrated journey is **World → optional Earth or News Radar discovery → editable token draft → wallet-reviewed launch → Building Studio → token page and sharing**. Earth is a 3D globe for finding physical places; the globe inside World leads into it. News Radar gathers place-related stories and offers draft suggestions. A creator can also launch directly without using either discovery tool.

The demonstration is a product walkthrough; example wallet approvals and confirmations are simulated. Existing mainnet launches are separate evidence. Owner verification and administered payouts remain manual. Radar source coverage can be partial when a provider is unavailable, and the application labels dated or unavailable data.

## Start reviewing

Use Node.js 22.18 or newer and npm:

```sh
npm ci --ignore-scripts
npm run typecheck
npm test
```

The **27 tests run offline**. They generate synthetic accounts from Meteora's public IDL and exercise the **real pinned DBC SDK**. No production credentials, funded test accounts or broadcasts are included. A test result is not a mainnet trade or merchant payout.

Read [DBC integration](docs/DBC-INTEGRATION.md), [architecture](docs/ARCHITECTURE.md) and [source scope](docs/REVIEW-SCOPE.md). `SOURCE-SCOPE.json` lists every payload file and its hash; `SHA256SUMS.txt` additionally pins that manifest.

## What is original here

- A place-centric journey linking discovery, token creation and persistent-world building customisation.
- An unsigned integration of Meteora's `createPoolWithFirstBuy`: the required first purchase follows pool creation within the same transaction.
- Exact decimal-SOL validation for 0.1–2 SOL, including narrower runtime caps, and a minimum-output quote with a 1% slippage bound.
- Configuration checks for the community fee policy and the DAMM v2 migration destination.
- Versioned manual accounting that keeps accrued fees, recorded collections, place allocations and payments separate.
- A near-live place-fee reader that preserves dated values on read failure and labels incomplete post-migration coverage.

Meteora supplies the bonding curve and AMM protocols. This repository claims application engineering around those protocols, not authorship of Meteora.

## Fee policy

For the current community launch policy, the fixed trading fee is **2.25% on DBC and after the configured DAMM v2 migration**. Dynamic fee adjustments are disabled. Actual pool settings must be checked; historical registered pools retain their original policies.

After protocol deductions, eligible fees route **10% to the launcher and 90% to Market treasury**. Within that routing, **75% of eligible net trading fees is allocated to the IRL place**, leaving 15% for Market. The place allocation is therefore `75/90` of the treasury receipt, not 75% of that receipt.

The place counter is an allocation record, not proof that the owner has received funds. Collections and recorded payments remain separate. Owner verification and reconciliation precede administered payment; this source export does not enable automatic withdrawals. The project token is not an IRL-place allocation.

A community token is not equity in an establishment. Listing a place does not imply owner approval or a partnership. A token can use a meme inspired by the place rather than its literal name; the exact Google Maps listing is required. The optional metadata X link can be a profile or a published post.

## Review limits

The SDK tests check construction, instruction order, validated inputs and unsigned packet size against synthetic accounts. They do not execute a validator, confirm mainnet settlement, guarantee protection after pool creation or validate every migration trade.

The exported live-counter arithmetic covers DBC lifetime fees. It explicitly reports incomplete post-migration coverage and does not claim a verified cumulative DAMM v2 total.

The complete frontend, backend, identity and payment operations, deployment configuration and original art pipeline are outside this selected package. This remains a **partial technical review export**, not a full open-source release. See [NOTICE.md](NOTICE.md) for rights and dependency notices.
