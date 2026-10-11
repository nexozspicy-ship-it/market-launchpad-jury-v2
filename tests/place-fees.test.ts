import test from 'node:test';
import assert from 'node:assert/strict';
import { PublicKey } from '@solana/web3.js';
import { NATIVE_MINT } from '@solana/spl-token';
import { currentRegisteredBusinessPolicy } from '../src/registered-fee-policy.ts';
import { summarizePlaceFeeAllocation, type PlaceFeeAllocation } from '../src/fee-accounting.ts';
import { composePlaceFeesSnapshot, type PlaceFeeChainSource } from '../src/place-fees-live.ts';
const at = '2026-10-10T10:00:00.000Z', mint = PublicKey.default.toBase58();
const policy = currentRegisteredBusinessPolicy(PublicKey.default.toBase58(), NATIVE_MINT.toBase58());
const source: PlaceFeeChainSource = { phase: 'curve', checkedAt: at, sourceSlot: 10, lifetimeNetQuoteAtomic: '1000', unclaimedTreasuryQuoteAtomic: '900', unclaimedCreatorQuoteAtomic: '100' };
const empty = summarizePlaceFeeAllocation(policy, [], []);
const allocation = (allocated = '750', paid = '0'): PlaceFeeAllocation => ({ ...empty, allocatedAtomic: allocated, paidAtomic: paid, remainingAtomic: BigInt(allocated) >= BigInt(paid) ? (BigInt(allocated) - BigInt(paid)).toString() : null, status: BigInt(paid) > BigInt(allocated) ? 'ledger_mismatch' : 'recorded' });
test('verified lifetime eligible net fees produce a near-live allocation without needing a manually reconciled receipt', () => {
    const snapshot = composePlaceFeesSnapshot(mint, source, empty, null);
    assert.equal(snapshot.totalAllocatedAtomic, '750');
    assert.equal(snapshot.uncollectedAllocatedAtomic, '750');
    assert.equal(snapshot.collectedAllocatedAtomic, null);
    assert.equal(snapshot.status, 'live');
    assert.equal(snapshot.coverage, 'dbc_only');
    assert.equal(snapshot.reconciliation, 'complete');
    assert.equal(snapshot.claimable, false);
    const zero = composePlaceFeesSnapshot(mint, { ...source, lifetimeNetQuoteAtomic: '0', unclaimedTreasuryQuoteAtomic: '0', unclaimedCreatorQuoteAtomic: '0' }, empty, null);
    assert.equal(zero.totalAllocatedAtomic, '0', 'Zero is permitted only when a verified pool lifetime metric proves zero eligible fees.');
});
test('claiming treasury fees before reconciliation does not make lifetime allocation drop or label fees received', () => {
    const before = composePlaceFeesSnapshot(mint, source, empty, null), after = composePlaceFeesSnapshot(mint, { ...source, unclaimedTreasuryQuoteAtomic: '0' }, empty, null);
    assert.equal(after.totalAllocatedAtomic, before.totalAllocatedAtomic);
    assert.equal(after.uncollectedAllocatedAtomic, '0');
    assert.equal(after.collectedAllocatedAtomic, null);
    assert.equal(after.reconciliation, 'unknown');
    const reconciled = composePlaceFeesSnapshot(mint, { ...source, unclaimedTreasuryQuoteAtomic: '0' }, allocation(), '900');
    assert.equal(reconciled.totalAllocatedAtomic, '750');
    assert.equal(reconciled.collectedAllocatedAtomic, '750');
    assert.equal(reconciled.reconciliation, 'complete');
});
test('creator-only claims are not incorrectly labelled a pending treasury reconciliation', () => {
    const creatorClaim = composePlaceFeesSnapshot(mint, { ...source, unclaimedCreatorQuoteAtomic: '0' }, allocation('0'), '0');
    assert.equal(creatorClaim.reconciliation, 'unknown');
    assert.notEqual(creatorClaim.reason, 'claim_reconciliation_pending');
    assert.equal(creatorClaim.totalAllocatedAtomic, '750');
    const missingTreasuryClaim = composePlaceFeesSnapshot(mint, { ...source, unclaimedTreasuryQuoteAtomic: '400' }, allocation('0'), '0');
    assert.equal(missingTreasuryClaim.reconciliation, 'pending', 'The minimum provable lifetime partner fee exceeds recorded+unclaimed treasury fees.');
});
test('cached unclaimed fees plus a newer ledger receipt are never added together as a false total', () => {
    const snapshot = composePlaceFeesSnapshot(mint, source, allocation(), '900');
    assert.equal(snapshot.totalAllocatedAtomic, null);
    assert.equal(snapshot.collectedAllocatedAtomic, '750');
    assert.equal(snapshot.status, 'partial');
    assert.equal(snapshot.reason, 'source_precedes_reconciled_receipt');
    assert.notEqual(snapshot.totalAllocatedAtomic, '1500');
});
test('atomic protocol rounding disagreement is partial rather than a false ledger fraud/mismatch', () => {
    const dust = composePlaceFeesSnapshot(mint, { ...source, lifetimeNetQuoteAtomic: '10', unclaimedTreasuryQuoteAtomic: '0', unclaimedCreatorQuoteAtomic: '0' }, allocation('8', '8'), '10');
    assert.equal(dust.totalAllocatedAtomic, '7');
    assert.equal(dust.remainingAllocatedAtomic, null);
    assert.equal(dust.status, 'partial');
    assert.equal(dust.reason, 'atomic_rounding_requires_reconciliation');
    const allUnclaimed = composePlaceFeesSnapshot(mint, { ...source, lifetimeNetQuoteAtomic: '10', unclaimedTreasuryQuoteAtomic: '10', unclaimedCreatorQuoteAtomic: '0' }, empty, null);
    assert.equal(allUnclaimed.totalAllocatedAtomic, '7');
    assert.equal(allUnclaimed.uncollectedAllocatedAtomic, '7');
    assert.equal(allUnclaimed.status, 'live');
    assert.throws(() => composePlaceFeesSnapshot(mint, { ...source, unclaimedTreasuryQuoteAtomic: '700', unclaimedCreatorQuoteAtomic: '300' }, empty, null), /cannot fund/);
});
test('paid amounts exceeding every verified allocation are mismatches without clamped zero balances', () => {
    const snapshot = composePlaceFeesSnapshot(mint, { ...source, unclaimedTreasuryQuoteAtomic: '0' }, allocation('750', '751'), '900');
    assert.equal(snapshot.status, 'ledger_mismatch');
    assert.equal(snapshot.remainingAllocatedAtomic, null);
    assert.equal(snapshot.paidAtomic, '751');
});
test('migrated and pending sources remain explicitly DBC-only rather than a whole-market total', () => {
    for (const phase of ['migrated', 'migration_pending'] as const) {
        const snapshot = composePlaceFeesSnapshot(mint, { ...source, phase }, empty, null);
        assert.equal(snapshot.totalAllocatedAtomic, null);
        assert.equal(snapshot.dbcAllocatedAtomic, '750');
        assert.equal(snapshot.status, 'partial');
        assert.equal(snapshot.reason, 'damm_fees_not_verified');
        assert.equal(snapshot.remainingAllocatedAtomic, null);
    }
});
test('live arithmetic preserves exact integer amounts above JavaScript Number precision and rejects inconsistent sources', () => {
    const huge = '9007199254740993000000', snapshot = composePlaceFeesSnapshot(mint, { ...source, lifetimeNetQuoteAtomic: huge, unclaimedTreasuryQuoteAtomic: '0', unclaimedCreatorQuoteAtomic: '0' }, empty, null);
    assert.equal(snapshot.totalAllocatedAtomic, (BigInt(huge) * 75n / 100n).toString());
    for (const changed of [{ lifetimeNetQuoteAtomic: '999' }, { sourceSlot: -1 }, { checkedAt: 'not-a-date' }, { unclaimedTreasuryQuoteAtomic: '-1' }])
        assert.throws(() => composePlaceFeesSnapshot(mint, { ...source, ...changed }, empty, null));
});
