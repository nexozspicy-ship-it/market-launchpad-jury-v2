# Market.Launchpad — selected source for Colosseum review

Market turns the stories of physical places into Solana community tokens and storefronts in a persistent, evolving 3D world. News Radar helps people discover unusual real-world stories; token creators can give a place its own identity in the world.

Product: [marketdotlaunchpad.com](https://marketdotlaunchpad.com/) · Updates: [@marketdotpad_](https://x.com/marketdotpad_)

This **11 October 2026 partial source review** exposes the DBC integration, exact fee allocation and near-live place-fee display logic. It is neither the complete application nor its production deployment package. V2 release preparation and a live production release are separate states; this repository alone does not prove that V2 is published.

## Start reviewing

Use Node.js 22.18 or newer and npm:

```sh
npm ci --ignore-scripts
npm run typecheck
npm test
```

Tests run offline. They generate synthetic accounts from Meteora's public IDL and exercise the **real pinned DBC SDK**. There are no production credentials, funded accounts or broadcasts. No test result is a mainnet trade or merchant payout.

Read [DBC integration](docs/DBC-INTEGRATION.md), [architecture](docs/ARCHITECTURE.md) and [source scope](docs/REVIEW-SCOPE.md). Every publishable file is enumerated in `SOURCE-SCOPE.json` and hashed in `SHA256SUMS.txt`.

## What is original here

- A place-centric journey: World → optional Radar story → editable token draft → wallet-reviewed launch → building placement and customisation.
- An application integration of Meteora's `createPoolWithFirstBuy`: optional initial purchase is part of the same transaction as pool creation, with exact SOL input and a minimum-output quote.
- Pool configuration checks for the community fee policy and the DAMM v2 migration destination.
- Versioned V3/V4 manual accounting: recorded collections, current on-chain accrual, allocation and payments remain distinct.
- A near-live place-fee display that retains dated values on read failure and labels incomplete post-migration coverage.

Meteora supplies the bonding curve and AMM protocols. This repository claims application engineering around those protocols, not authorship of Meteora.

## Fee policy

For the current community launch policy, the fixed trading fee is **2.25% on DBC and after the configured DAMM v2 migration**. Dynamic fee adjustments are disabled. Actual pool settings must be checked; historical registered pools retain their original policies.

After protocol deductions, eligible fees route **10% to the launcher and 90% to Market treasury**. Within this routing, the current place policy allocates **75% of eligible net trading fees to the IRL place**, leaving 15% for Market. Thus the place allocation is `75/90` of the treasury receipt, not 75% of that receipt.

The place counter is an allocation record, not proof of cash received by the owner. Collections and recorded payments are shown separately. Owner verification and reconciliation precede administered payment; this source export does not enable automatic owner withdrawals. The project token is not an IRL-place allocation.

Community tokens are not equity in the establishment. A token listing does not imply owner approval or a partnership. Radar is optional for launching and has its own membership access rules.

## Review limits

The included SDK transaction tests prove construction, instruction order, inputs and unsigned packet size against a synthetic configuration. They do not execute a validator, confirm mainnet settlement, guarantee protection after pool creation or validate every migration trade.

The included live-counter arithmetic verifies DBC lifetime fee composition. The exported version explicitly reports DBC-only coverage after migration; it does not claim a verified cumulative DAMM v2 fee total.

For privacy, the full production backend, identity and payment operation, deployment configuration, private workspaces and working history are excluded. This repository must be described as a **partial review export**, not a full open-source release. See [NOTICE.md](NOTICE.md) for rights and dependency notices.
