import { assertLaunchFeeConfig, type DbcConfigFeeView } from './meteora-config-policy.ts';
import { NATIVE_MINT } from '@solana/spl-token';
export function assertBusinessLaunchConfig(config: DbcConfigFeeView & {
    poolCreationFee: {
        toString(): string;
    };
    quoteMint: {
        toBase58(): string;
    };
    feeClaimer: {
        toBase58(): string;
    };
    leftoverReceiver: {
        toBase58(): string;
    };
}, treasury?: string) {
    assertLaunchFeeConfig(config, 10, 225, false);
    if (config.poolCreationFee.toString() !== '0' || config.migrationFeePercentage !== 0 || config.creatorMigrationFeePercentage !== 0 || config.poolFees.dynamicFee?.initialized !== 0 || config.poolFees.baseFee.firstFactor !== 0 || config.poolFees.baseFee.secondFactor?.toString() !== '0' || config.poolFees.baseFee.thirdFactor?.toString() !== '0' || config.collectFeeMode !== 0 || config.migratedCollectFeeMode !== 0)
        throw Error('The live business config differs from the fixed 2.25% fee policy. Nothing was signed or sent.');
    if (treasury && (config.quoteMint.toBase58() !== NATIVE_MINT.toBase58() || config.feeClaimer.toBase58() !== treasury || config.leftoverReceiver.toBase58() !== treasury))
        throw Error('The live business config does not route SOL fees and pool leftovers to the registered treasury. Nothing was signed or sent.');
}
