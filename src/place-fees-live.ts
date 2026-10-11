import { PLACE_FEE_DENOMINATOR, type PlaceFeeAllocation } from './fee-accounting.ts';
export const PLACE_FEES_BATCH_MAX = 12;
export const PLACE_FEES_POLL_MS = 15000;
export type PlaceFeeChainSource = {
    phase: 'curve' | 'migration_pending' | 'migrated';
    checkedAt: string;
    sourceSlot: number;
    lifetimeNetQuoteAtomic: string;
    unclaimedTreasuryQuoteAtomic: string;
    unclaimedCreatorQuoteAtomic: string;
};
export type PlaceFeesSnapshot = {
    mint: string;
    percent: number;
    denominator: typeof PLACE_FEE_DENOMINATOR;
    phase: PlaceFeeChainSource['phase'] | 'unavailable' | 'not_applicable';
    status: 'live' | 'partial' | 'unavailable' | 'not_applicable' | 'ledger_mismatch';
    checkedAt: string | null;
    sourceSlot: number | null;
    collectedAllocatedAtomic: string | null;
    uncollectedAllocatedAtomic: string | null;
    totalAllocatedAtomic: string | null;
    dbcAllocatedAtomic: string | null;
    lifetimeNetFeeAtomic: string | null;
    paidAtomic: string;
    remainingAllocatedAtomic: string | null;
    reconciliation: 'complete' | 'pending' | 'unknown';
    coverage: 'dbc_only' | 'unverified';
    claimable: false;
    reason: string | null;
};
function atomic(value: string) {
    if (!/^(0|[1-9]\d*)$/.test(value))
        throw new RangeError('Require exact non-negative fee amounts.');
    return BigInt(value);
}
export function unavailablePlaceFees(mint: string, allocation: PlaceFeeAllocation | null, reason = 'source_unavailable', notApplicable = false): PlaceFeesSnapshot {
    return { mint, percent: allocation?.percent ?? 75, denominator: PLACE_FEE_DENOMINATOR, phase: notApplicable ? 'not_applicable' : 'unavailable', status: notApplicable ? 'not_applicable' : 'unavailable', checkedAt: null, sourceSlot: null, collectedAllocatedAtomic: allocation?.allocatedAtomic ?? null, uncollectedAllocatedAtomic: null, totalAllocatedAtomic: null, dbcAllocatedAtomic: null, lifetimeNetFeeAtomic: null, paidAtomic: allocation?.paidAtomic ?? '0', remainingAllocatedAtomic: null, reconciliation: 'unknown', coverage: 'unverified', claimable: false, reason };
}
export function composePlaceFeesSnapshot(mint: string, source: PlaceFeeChainSource, allocation: PlaceFeeAllocation, receiptAtomic: string | null): PlaceFeesSnapshot {
    const net = atomic(source.lifetimeNetQuoteAtomic), treasury = atomic(source.unclaimedTreasuryQuoteAtomic), creator = atomic(source.unclaimedCreatorQuoteAtomic);
    if (treasury + creator > net || !Number.isSafeInteger(source.sourceSlot) || source.sourceSlot < 0 || !Number.isFinite(Date.parse(source.checkedAt)))
        throw new RangeError('Fee source is inconsistent.');
    const percent = BigInt(allocation.percent), denominator = BigInt(allocation.treasuryReceiptRatio.denominator);
    if (percent <= 0n || percent > denominator || denominator > 100n)
        throw new RangeError('Fee allocation policy is inconsistent.');
    const lifetime = net * percent / 100n, claimedBoth = net - treasury - creator;
    if (claimedBoth === 0n && lifetime > treasury)
        throw new RangeError('Uncollected treasury fees cannot fund this allocation.');
    const uncollected = claimedBoth === 0n ? lifetime : treasury * percent / denominator, paid = atomic(allocation.paidAtomic);
    const collected = allocation.allocatedAtomic === null ? null : atomic(allocation.allocatedAtomic);
    const receipt = receiptAtomic === null ? null : atomic(receiptAtomic);
    const minimumPartnerLifetime = net - net * (100n - denominator) / 100n;
    let reconciliation: PlaceFeesSnapshot['reconciliation'] = claimedBoth === 0n && (!receipt || receipt === 0n) ? 'complete'
        : receipt !== null && receipt === claimedBoth ? 'complete'
            : receipt !== null && receipt + treasury < minimumPartnerLifetime ? 'pending' : 'unknown';
    const migrated = source.phase !== 'curve';
    const componentRounding = uncollected > lifetime || collected !== null && collected > lifetime;
    const sourceBehindLedger = receipt !== null && receipt > claimedBoth;
    const verifiedAllocation = collected !== null && collected > lifetime ? collected : lifetime;
    const mismatch = !migrated && (paid > verifiedAllocation || allocation.status === 'ledger_mismatch');
    if (componentRounding || sourceBehindLedger || mismatch)
        reconciliation = 'unknown';
    const total = !migrated && !sourceBehindLedger ? lifetime : null;
    return { mint, percent: allocation.percent, denominator: PLACE_FEE_DENOMINATOR, phase: source.phase,
        status: mismatch ? 'ledger_mismatch' : migrated || sourceBehindLedger || componentRounding ? 'partial' : 'live', checkedAt: source.checkedAt, sourceSlot: source.sourceSlot,
        collectedAllocatedAtomic: allocation.allocatedAtomic, uncollectedAllocatedAtomic: componentRounding ? null : uncollected.toString(),
        totalAllocatedAtomic: total?.toString() ?? null, dbcAllocatedAtomic: lifetime.toString(), lifetimeNetFeeAtomic: net.toString(), paidAtomic: allocation.paidAtomic,
        remainingAllocatedAtomic: total !== null && !mismatch && paid <= total ? (total - paid).toString() : null, reconciliation, coverage: 'dbc_only', claimable: false,
        reason: mismatch ? 'allocation_payment_mismatch' : migrated ? 'damm_fees_not_verified' : sourceBehindLedger ? 'source_precedes_reconciled_receipt' : componentRounding ? 'atomic_rounding_requires_reconciliation' : reconciliation === 'pending' ? 'claim_reconciliation_pending' : reconciliation === 'unknown' ? 'claim_coverage_unknown' : null };
}
