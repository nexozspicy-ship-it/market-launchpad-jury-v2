import { BUSINESS_FEE_V3, type RegisteredBusinessPolicy } from './registered-fee-policy.ts';
export const PLACE_TRADING_FEE_PERCENT = 75;
export const PLACE_TREASURY_SHARE_PERCENT = 90;
export const PLACE_FEE_DENOMINATOR = 'eligible_protocol_net_trading_fees';
export type PlaceFeeAllocation = {
    asset: 'SOL';
    percent: number;
    denominator: typeof PLACE_FEE_DENOMINATOR;
    treasuryReceiptRatio: {
        numerator: number;
        denominator: number;
    };
    allocatedAtomic: string | null;
    paidAtomic: string;
    remainingAtomic: string | null;
    status: 'not_reconciled' | 'calculated_from_receipts' | 'recorded' | 'receipt_unavailable' | 'ledger_mismatch';
    basis: 'recorded_business_allocation' | 'finalized_treasury_receipts';
    claimable: false;
    registeredPolicyVersion: string;
};
export type FeeLedgerEntry = {
    businessShareAtomic: string;
    treasuryReceiptAtomic: string | null;
};
export type FeePayoutEntry = {
    amountAtomic: string;
};
export type FeeAccountingStatus = 'not_reconciled' | 'reconciled' | 'legacy_receipt_unavailable' | 'ledger_mismatch';
function sumAtomic(values: string[]): bigint {
    return values.reduce((sum, value) => {
        if (!/^(0|[1-9]\d*)$/.test(value))
            throw new RangeError('Fee ledger amounts must be non-negative atomic integer strings.');
        return sum + BigInt(value);
    }, 0n);
}
export function summarizeBusinessFeeLedger(ledger: FeeLedgerEntry[], payouts: FeePayoutEntry[]) {
    const hasLedger = ledger.length > 0;
    const businessShare = hasLedger ? sumAtomic(ledger.map(entry => entry.businessShareAtomic)) : null;
    const paid = sumAtomic(payouts.map(entry => entry.amountAtomic));
    const reserve = businessShare !== null && businessShare >= paid ? businessShare - paid : null;
    const receiptsComplete = hasLedger && ledger.every(entry => entry.treasuryReceiptAtomic !== null);
    const receipt = receiptsComplete ? sumAtomic(ledger.map(entry => entry.treasuryReceiptAtomic!)) : null;
    const status: FeeAccountingStatus = !hasLedger ? 'not_reconciled' : businessShare !== null && paid > businessShare ? 'ledger_mismatch' : receiptsComplete ? 'reconciled' : 'legacy_receipt_unavailable';
    return { treasuryReceiptsObservedAtomic: receipt?.toString() ?? null, businessShareReconciledAtomic: businessShare?.toString() ?? null, businessSharePaidAtomic: paid.toString(), businessShareReservedAtomic: reserve?.toString() ?? null, accountingStatus: status };
}
export function summarizePlaceFeeAllocation(policy: RegisteredBusinessPolicy, ledger: FeeLedgerEntry[], payouts: FeePayoutEntry[]): PlaceFeeAllocation {
    const accounting = summarizeBusinessFeeLedger(ledger, payouts), projection = policy.version === BUSINESS_FEE_V3;
    const percent = projection ? PLACE_TRADING_FEE_PERCENT : policy.businessPercent;
    if (percent === null || percent < 0 || percent > policy.treasuryPercent)
        throw new RangeError('Place allocation policy is incomplete.');
    const receipts = accounting.treasuryReceiptsObservedAtomic;
    const allocated = projection
        ? receipts === null ? null : BigInt(receipts) * BigInt(PLACE_TRADING_FEE_PERCENT) / BigInt(PLACE_TREASURY_SHARE_PERCENT)
        : accounting.businessShareReconciledAtomic === null ? null : BigInt(accounting.businessShareReconciledAtomic);
    const paid = BigInt(accounting.businessSharePaidAtomic), mismatch = allocated !== null && paid > allocated;
    const status: PlaceFeeAllocation['status'] = mismatch ? 'ledger_mismatch'
        : !ledger.length ? 'not_reconciled'
            : receipts === null ? 'receipt_unavailable'
                : projection ? 'calculated_from_receipts' : 'recorded';
    return { asset: 'SOL', percent, denominator: PLACE_FEE_DENOMINATOR, treasuryReceiptRatio: { numerator: percent, denominator: policy.treasuryPercent }, allocatedAtomic: allocated?.toString() ?? null, paidAtomic: paid.toString(), remainingAtomic: allocated !== null && !mismatch ? (allocated - paid).toString() : null, status, basis: projection ? 'finalized_treasury_receipts' : 'recorded_business_allocation', claimable: false, registeredPolicyVersion: policy.version };
}
