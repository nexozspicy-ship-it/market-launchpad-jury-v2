import BN from 'bn.js';
import {Keypair, PublicKey, type AccountInfo} from '@solana/web3.js';
import {NATIVE_MINT, TOKEN_PROGRAM_ID} from '@solana/spl-token';
import {
  DynamicBondingCurveClient, DYNAMIC_BONDING_CURVE_PROGRAM_ID,
  ActivationType, BaseFeeMode, CollectFeeMode, DammV2DynamicFeeMode,
  MigratedCollectFeeMode, MigrationFeeOption, MigrationOption,
  TokenAuthorityOption, TokenDecimal, TokenType, buildCurveWithMarketCap, getMigrationThresholdPrice,
  type PoolConfig,
} from '@meteora-ag/dynamic-bonding-curve-sdk';

type IdlType = string | {array?: [IdlType, number]; defined?: {name: string}; option?: IdlType};
type Field = {name: string; type: IdlType};

/** All values are generated locally from Meteora's public IDL. No production
 * config, account dump, keypair file or network response enters these tests. */
export async function syntheticSdkConfig() {
  const treasury = Keypair.generate().publicKey;
  const configAddress = Keypair.generate().publicKey;
  const accounts = new Map<string, AccountInfo<Buffer>>();
  const reads: string[] = [];
  const connection = {
    async getAccountInfo(address: PublicKey) {
      reads.push(address.toBase58());
      if (address.equals(NATIVE_MINT)) return {owner: TOKEN_PROGRAM_ID, executable: false, lamports: 0, data: Buffer.alloc(82), rentEpoch: 0};
      return accounts.get(address.toBase58()) ?? null;
    },
    async getAccountInfoAndContext(address: PublicKey) {
      return {context: {slot: 1}, value: await this.getAccountInfo(address)};
    },
    async sendRawTransaction() {throw new Error('No broadcasting is permitted by this fixture.');},
  };
  const client = new DynamicBondingCurveClient(connection as never, 'confirmed');
  const types = new Map<string, NonNullable<typeof client.state.program.idl.types>[number]>(client.state.program.idl.types!.map(type => [type.name, type]));
  function zero(type: IdlType): unknown {
    if (typeof type === 'string') {
      if (type === 'pubkey') return PublicKey.default;
      if (type === 'bool') return false;
      if (type === 'string') return '';
      if (/^[ui](64|128|256)$/.test(type)) return new BN(0);
      return 0;
    }
    if (type.array) return Array.from({length: type.array[1]}, () => zero(type.array![0]));
    if (type.option) return null;
    const definition = type.defined && types.get(type.defined.name);
    if (!definition || definition.type.kind !== 'struct') throw new Error('Unsupported public IDL fixture type.');
    return Object.fromEntries((definition.type.fields as Field[]).map(field => [field.name, zero(field.type)]));
  }
  const config = zero({defined: {name: 'poolConfig'}}) as PoolConfig;
  const curve = buildCurveWithMarketCap({
    token: {tokenType: TokenType.SPLToken, tokenBaseDecimal: TokenDecimal.SIX,
      tokenQuoteDecimal: TokenDecimal.NINE, tokenAuthorityOption: TokenAuthorityOption.Immutable,
      totalTokenSupply: 1_000_000_000, leftover: 0},
    fee: {baseFeeParams: {baseFeeMode: BaseFeeMode.FeeSchedulerLinear,
      feeSchedulerParam: {startingFeeBps: 225, endingFeeBps: 225, numberOfPeriod: 0, totalDuration: 0}},
      dynamicFeeEnabled: false, collectFeeMode: CollectFeeMode.QuoteToken,
      creatorTradingFeePercentage: 10, poolCreationFee: 0, enableFirstSwapWithMinFee: false},
    migration: {migrationOption: MigrationOption.MET_DAMM_V2, migrationFeeOption: MigrationFeeOption.Customizable,
      migrationFee: {feePercentage: 0, creatorFeePercentage: 0},
      migratedPoolFee: {collectFeeMode: MigratedCollectFeeMode.QuoteToken,
        dynamicFee: DammV2DynamicFeeMode.Disabled, poolFeeBps: 225}},
    liquidityDistribution: {partnerPermanentLockedLiquidityPercentage: 90, partnerLiquidityPercentage: 0,
      creatorPermanentLockedLiquidityPercentage: 10, creatorLiquidityPercentage: 0},
    lockedVesting: {totalLockedVestingAmount: 0, numberOfVestingPeriod: 0,
      cliffUnlockAmount: 0, totalVestingDuration: 0, cliffDurationFromMigrationTime: 0},
    activationType: ActivationType.Timestamp, initialMarketCap: 30, migrationMarketCap: 600,
  });
  Object.assign(config, {
    quoteMint: NATIVE_MINT, feeClaimer: treasury, leftoverReceiver: treasury,
    tokenType: TokenType.SPLToken, tokenDecimal: 6, quoteTokenFlag: 0,
    tokenUpdateAuthority: TokenAuthorityOption.Immutable,
    collectFeeMode: 0, migratedCollectFeeMode: 0, migratedDynamicFee: 0,
    migrationOption: 1, migrationFeeOption: 6, migratedPoolFeeBps: 225,
    creatorTradingFeePercentage: 10, poolCreationFee: new BN(0),
    migrationFeePercentage: 0, creatorMigrationFeePercentage: 0,
    partnerPermanentLockedLiquidityPercentage: 90, creatorPermanentLockedLiquidityPercentage: 10,
    activationType: ActivationType.Timestamp, sqrtStartPrice: curve.sqrtStartPrice,
    curve: curve.curve, migrationQuoteThreshold: curve.migrationQuoteThreshold,
    migrationSqrtPrice: getMigrationThresholdPrice(curve.migrationQuoteThreshold, curve.sqrtStartPrice, curve.curve),
    preMigrationTokenSupply: new BN('1000000000000000'), postMigrationTokenSupply: new BN('1000000000000000'),
  });
  config.poolFees.baseFee.cliffFeeNumerator = new BN('22500000');
  config.poolFees.baseFee.baseFeeMode = 0;
  const bytes = await client.state.program.coder.accounts.encode('poolConfig', config);
  accounts.set(configAddress.toBase58(), {
    data: bytes, owner: DYNAMIC_BONDING_CURVE_PROGRAM_ID, executable: false,
    lamports: 0, rentEpoch: 0,
  });
  return {client, config, configAddress, treasury, reads, accounts};
}
