import type { PlaceFeesSnapshot } from './place-fees-live.ts';
export const PLACE_FEE_POLL_MS = 15000;
export const PLACE_FEE_STALE_MS = 45000;
export type PlaceFeeClientSnapshot = Omit<PlaceFeesSnapshot, 'paidAtomic'> & {
    paidAtomic: string | null;
    refreshStatus?: 'unavailable';
};
export function failedPlaceFeeRead(mint: string, previous?: PlaceFeeClientSnapshot): PlaceFeeClientSnapshot {
    return previous ? { ...previous, refreshStatus: 'unavailable' } : { mint, percent: 75, denominator: 'eligible_protocol_net_trading_fees', phase: 'unavailable', status: 'unavailable', checkedAt: null, sourceSlot: null, collectedAllocatedAtomic: null, uncollectedAllocatedAtomic: null, totalAllocatedAtomic: null, dbcAllocatedAtomic: null, lifetimeNetFeeAtomic: null, paidAtomic: null, remainingAllocatedAtomic: null, reconciliation: 'unknown', coverage: 'unverified', claimable: false, reason: 'Fee data is temporarily unavailable.', refreshStatus: 'unavailable' };
}
export function placeFeeLiveSourceMessage(snapshot: PlaceFeeClientSnapshot): string {
    if (snapshot.status === 'ledger_mismatch')
        return 'Payment and allocation records need reconciliation. The remaining amount is unavailable.';
    if (snapshot.phase === 'curve' && snapshot.totalAllocatedAtomic !== null)
        return 'Confirmed on-chain DBC trading fees after protocol deductions, including fees not yet collected. Recorded receipts and payments are tracked separately.';
    if (snapshot.phase === 'migrated' || snapshot.phase === 'migration_pending')
        return 'DBC fee history is available. The total including fees after migration has not been verified; partial amounts stay separate.';
    if (snapshot.reason === 'source_precedes_reconciled_receipt')
        return 'Waiting for an on-chain snapshot that includes the latest recorded collection.';
    return 'The total allocation could not be verified. Any recorded receipts are shown separately; an unavailable amount is not zero.';
}
export function placeFeeMintBatches(key: string): string[][] {
    const mints = [...new Set(key.split(',').filter(m => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(m)))].slice(0, 120);
    return Array.from({ length: Math.ceil(mints.length / 12) }, (_, i) => mints.slice(i * 12, i * 12 + 12));
}
export function placeFeeLiveReadState(snapshot?: PlaceFeeClientSnapshot, now = Date.now()): 'loading' | 'ready' | 'stale' | 'unavailable' {
    if (!snapshot)
        return 'loading';
    const checked = Date.parse(snapshot.checkedAt || '');
    if (snapshot.refreshStatus === 'unavailable')
        return snapshot.checkedAt ? 'stale' : 'unavailable';
    if (snapshot.status === 'unavailable')
        return 'unavailable';
    if (snapshot.checkedAt && (!Number.isFinite(checked) || now - checked > PLACE_FEE_STALE_MS))
        return 'stale';
    return 'ready';
}
export function mergePlaceFeeResponse(previous: Record<string, PlaceFeeClientSnapshot>, mints: readonly string[], items: unknown): Record<string, PlaceFeeClientSnapshot> {
    const next = { ...previous }, allowed = new Set(mints), seen = new Set<string>();
    if (Array.isArray(items))
        for (const raw of items) {
            if (!raw || typeof raw !== 'object')
                continue;
            const row = raw as PlaceFeesSnapshot;
            if (!allowed.has(row.mint) || seen.has(row.mint) || !['live', 'partial', 'unavailable', 'not_applicable', 'ledger_mismatch'].includes(row.status))
                continue;
            if (!Number.isFinite(row.percent) || row.percent <= 0 || row.percent > 100)
                continue;
            if (['totalAllocatedAtomic', 'collectedAllocatedAtomic', 'uncollectedAllocatedAtomic', 'remainingAllocatedAtomic', 'paidAtomic'].some(key => {
                const value = (row as unknown as Record<string, unknown>)[key];
                return value !== null && (typeof value !== 'string' || !/^(0|[1-9]\d*)$/.test(value));
            }))
                continue;
            if (row.checkedAt !== null && (typeof row.checkedAt !== 'string' || !Number.isFinite(Date.parse(row.checkedAt))))
                continue;
            seen.add(row.mint);
            if (row.status === 'unavailable' && next[row.mint]?.checkedAt) {
                next[row.mint] = { ...next[row.mint], refreshStatus: 'unavailable' };
                continue;
            }
            next[row.mint] = { ...row };
        }
    for (const mint of mints)
        if (!seen.has(mint))
            next[mint] = failedPlaceFeeRead(mint, next[mint]);
    return next;
}
