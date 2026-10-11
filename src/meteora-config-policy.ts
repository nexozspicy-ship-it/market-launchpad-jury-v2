type VestingInfo = {
    isInitialized: number;
    vestingPercentage: number;
    cliffDurationFromMigrationTime: number;
};
export type DbcConfigFeeView = {
    creatorTradingFeePercentage: number;
    poolFees: {
        baseFee: {
            cliffFeeNumerator: {
                toString(): string;
            };
            baseFeeMode: number;
            firstFactor?: number;
            secondFactor?: {
                toString(): string;
            };
            thirdFactor?: {
                toString(): string;
            };
        };
        dynamicFee?: {
            initialized: number;
        } | null;
    };
    migrationOption: number;
    migrationFeeOption: number;
    migratedPoolFeeBps: number;
    migratedDynamicFee: number;
    migrationFeePercentage?: number;
    creatorMigrationFeePercentage?: number;
    collectFeeMode?: number;
    migratedCollectFeeMode?: number;
    tokenUpdateAuthority?: number;
    partnerLiquidityPercentage: number;
    partnerPermanentLockedLiquidityPercentage: number;
    creatorLiquidityPercentage: number;
    creatorPermanentLockedLiquidityPercentage: number;
    partnerLiquidityVestingInfo: VestingInfo;
    creatorLiquidityVestingInfo: VestingInfo;
};
export function assertLaunchFeeConfig(config: DbcConfigFeeView, expectedCreatorFeePercent: number, expectedCurveFeeBps: number, _unusedGenesisToken: boolean): void {
    const expectedFeeNumerator = String(expectedCurveFeeBps * 1000000000 / 10000);
    if (config.creatorTradingFeePercentage !== expectedCreatorFeePercent) {
        throw new Error(`The pool creator fee share must be ${expectedCreatorFeePercent}%.`);
    }
    if (config.poolFees.baseFee.cliffFeeNumerator.toString() !== expectedFeeNumerator || config.poolFees.baseFee.baseFeeMode !== 0) {
        throw new Error(`The DBC config must use a fixed ${expectedCurveFeeBps} bps linear-scheduler curve fee.`);
    }
    if (config.poolFees.dynamicFee?.initialized === 1) {
        throw new Error('Dynamic DBC fees must be disabled for the published fixed-fee launch.');
    }
    if (config.migrationOption !== 1 || config.migrationFeeOption !== 6 || config.migratedPoolFeeBps !== expectedCurveFeeBps || config.migratedDynamicFee !== 0) {
        throw new Error(`The config must migrate to DAMM v2 with a fixed ${expectedCurveFeeBps} bps pool fee.`);
    }
}
