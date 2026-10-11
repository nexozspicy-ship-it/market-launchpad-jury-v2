import test from 'node:test';
import assert from 'node:assert/strict';
import {PublicKey} from '@solana/web3.js';
import {NATIVE_MINT} from '@solana/spl-token';
import {summarizePlaceFeeAllocation} from '../src/fee-accounting.ts';
import {BUSINESS_FEE_V3, BUSINESS_FEE_V4, currentRegisteredBusinessPolicy, registeredBusinessAllocation, businessClaimsEnabled, type RegisteredBusinessPolicy} from '../src/registered-fee-policy.ts';

const policy = currentRegisteredBusinessPolicy(PublicKey.default.toBase58(), NATIVE_MINT.toBase58());

test('75% of eligible net fees equals 75/90 of a 90% treasury receipt', () => {
  assert.equal(policy.version, BUSINESS_FEE_V4);
  assert.equal(policy.creatorPercent, 10);
  assert.equal(policy.treasuryPercent, 90);
  assert.equal(registeredBusinessAllocation(policy, 0n, 900_000_000n), 750_000_000n);
  assert.equal(businessClaimsEnabled(policy), false);
});

test('fragmented receipts conserve exact atomic amounts above floating-point precision', () => {
  const start = BigInt(Number.MAX_SAFE_INTEGER) * 10_000n;
  let received = start, allocated = 0n, retained = 0n;
  for (let i = 0; i < 2048; i++) {
    const receipt = BigInt(i % 37 + 1);
    const part = registeredBusinessAllocation(policy, received, receipt);
    assert.ok(part >= 0n && part <= receipt);
    received += receipt; allocated += part; retained += receipt - part;
  }
  assert.equal(allocated, received * 75n / 90n - start * 75n / 90n);
  assert.equal(allocated + retained, received - start);
});

test('current-policy display never rewrites an older immutable ledger or enables payouts', () => {
  const historical: RegisteredBusinessPolicy = {...policy, version: BUSINESS_FEE_V3, reserveMode: 'manual', businessPercent: null, marketPercent: null};
  const ledger = [{businessShareAtomic: '0', treasuryReceiptAtomic: '900000000'}], before = structuredClone(ledger);
  const summary = summarizePlaceFeeAllocation(historical, ledger, [{amountAtomic: '100000000'}]);
  assert.equal(summary.allocatedAtomic, '750000000');
  assert.equal(summary.remainingAtomic, '650000000');
  assert.equal(summary.claimable, false);
  assert.equal(summary.status, 'calculated_from_receipts');
  assert.deepEqual(ledger, before);
  assert.equal(registeredBusinessAllocation(historical, 0n, 900000000n), 0n);
});

test('missing receipt data is unknown, never a false zero reserve', () => {
  const empty = summarizePlaceFeeAllocation(policy, [], []);
  assert.equal(empty.allocatedAtomic, null);
  assert.equal(empty.remainingAtomic, null);
  assert.equal(empty.status, 'not_reconciled');
});

test('excess payments are a reconciliation mismatch rather than a clamped balance', () => {
  const summary = summarizePlaceFeeAllocation(policy, [{businessShareAtomic: '750', treasuryReceiptAtomic: '900'}], [{amountAtomic: '751'}]);
  assert.equal(summary.status, 'ledger_mismatch');
  assert.equal(summary.remainingAtomic, null);
  assert.equal(summary.allocatedAtomic, '750');
});
