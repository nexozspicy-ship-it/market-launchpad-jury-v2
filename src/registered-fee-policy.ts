export const BUSINESS_FEE_V4 = 'business-225bps-net-75-10-15-manual-payout-v4';
export const BUSINESS_FEE_V3 = 'business-225bps-creator10-treasury90-manual-v3';
export type RegisteredBusinessPolicy = {
    version: typeof BUSINESS_FEE_V3 | typeof BUSINESS_FEE_V4;
    treasury: string;
    config: string;
    curveFeeBps: number;
    postMigrationFeeBps: number;
    creatorPercent: number;
    treasuryPercent: number;
    businessPercent: number | null;
    marketPercent: number | null;
    reserveMode: 'manual' | 'v4-manual-payout';
};
export function currentRegisteredBusinessPolicy(treasury: string, config: string): RegisteredBusinessPolicy {
    return { version: BUSINESS_FEE_V4, treasury, config, curveFeeBps: 225, postMigrationFeeBps: 225, creatorPercent: 10, treasuryPercent: 90, businessPercent: 75, marketPercent: 15, reserveMode: 'v4-manual-payout' };
}
export function registeredBusinessPolicy(raw: string | null | undefined, treasury: string, config: string): RegisteredBusinessPolicy {
    if (raw == null)
        throw Error('This review export requires a supported V3/V4 registered policy.');
    const p = JSON.parse(raw) as Partial<RegisteredBusinessPolicy>;
    const validKey = (value: unknown) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(String(value));
    if (!p || !validKey(p.treasury) || !validKey(p.config) || p.config !== config)
        throw Error('Unknown or inconsistent registered fee policy.');
    if (p.version === BUSINESS_FEE_V3) {
        if (p.curveFeeBps !== 225 || p.postMigrationFeeBps !== 225 || p.creatorPercent !== 10 || p.treasuryPercent !== 90 || p.reserveMode !== 'manual' || p.businessPercent != null || p.marketPercent != null)
            throw Error('Unknown or inconsistent registered fee policy.');
        return { ...p, version: BUSINESS_FEE_V3, treasury: p.treasury!, config: p.config!, curveFeeBps: 225, postMigrationFeeBps: 225, creatorPercent: 10, treasuryPercent: 90, businessPercent: null, marketPercent: null, reserveMode: 'manual' };
    }
    if (p.version === BUSINESS_FEE_V4) {
        if (p.curveFeeBps !== 225 || p.postMigrationFeeBps !== 225 || p.creatorPercent !== 10 || p.treasuryPercent !== 90 || p.businessPercent !== 75 || p.marketPercent !== 15 || p.reserveMode !== 'v4-manual-payout')
            throw Error('Unknown or inconsistent registered fee policy.');
        return { ...p, version: BUSINESS_FEE_V4, treasury: p.treasury!, config: p.config!, curveFeeBps: 225, postMigrationFeeBps: 225, creatorPercent: 10, treasuryPercent: 90, businessPercent: 75, marketPercent: 15, reserveMode: 'v4-manual-payout' };
    }
    throw Error('Unknown or inconsistent registered fee policy.');
}
export function registeredBusinessAllocation(policy: RegisteredBusinessPolicy, received: bigint, receipt: bigint) {
    if (received < 0n || receipt <= 0n)
        throw RangeError('Invalid finalized receipt.');
    if (policy.version === BUSINESS_FEE_V4)
        return (received + receipt) * 75n / 90n - received * 75n / 90n;
    if (policy.version === BUSINESS_FEE_V3)
        return 0n;
    throw Error('Unknown fee policy.');
}
export function registeredFeeShares(policy: RegisteredBusinessPolicy) {
    if (policy.version === BUSINESS_FEE_V3)
        return { creator: 10, treasury: 90, business: null, market: null, businessAllocation: 'internal' as const };
    if (policy.version === BUSINESS_FEE_V4)
        return { creator: policy.creatorPercent, treasury: policy.treasuryPercent, business: policy.businessPercent, market: policy.marketPercent, businessAllocation: 'internal' as const };
    return { creator: policy.creatorPercent, treasury: policy.treasuryPercent, business: policy.businessPercent, market: policy.marketPercent };
}
export function businessClaimsEnabled(policy: RegisteredBusinessPolicy) {
    return false;
}
