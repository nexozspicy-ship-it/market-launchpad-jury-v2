import test from 'node:test';
import assert from 'node:assert/strict';
import { failedPlaceFeeRead, mergePlaceFeeResponse, placeFeeLiveReadState, placeFeeMintBatches, placeFeeLiveSourceMessage, type PlaceFeeClientSnapshot } from '../src/place-fees-reader.ts';
const mint = '1'.repeat(31) + '2', other = '1'.repeat(32);
const checkedAt = '2026-10-10T16:00:00.000Z';
const row: PlaceFeeClientSnapshot = { ...failedPlaceFeeRead(mint), phase: 'curve', status: 'live', checkedAt, sourceSlot: 1, totalAllocatedAtomic: '7500000000', collectedAllocatedAtomic: '1000000000', uncollectedAllocatedAtomic: '6500000000', remainingAllocatedAtomic: '7500000000', paidAtomic: '0', dbcAllocatedAtomic: '7500000000', lifetimeNetFeeAtomic: '10000000000', refreshStatus: undefined };
test('fee batches are deduplicated and bounded; arbitrary strings never reach the endpoint', () => {
    assert.deepEqual(placeFeeMintBatches([mint, mint, '../../private', 'not a token', other].join(',')), [[mint, other]]);
    const addresses = Array.from({ length: 31 }, (_, i) => '1'.repeat(31) + '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'[i]);
    const batches = placeFeeMintBatches(addresses.join(','));
    assert.equal(batches.length, 3);
    assert.ok(batches.every(v => v.length <= 12));
    assert.equal(batches.flat().length, 31);
});
test('first failure and missing rows leave an unavailable state rather than a forever spinner or fake zero', () => {
    const failed = failedPlaceFeeRead(mint);
    assert.equal(placeFeeLiveReadState(failed), 'unavailable');
    assert.equal(failed.totalAllocatedAtomic, null);
    assert.equal(failed.paidAtomic, null);
    assert.equal(placeFeeLiveReadState(mergePlaceFeeResponse({}, [mint], [])[mint]), 'unavailable');
});
test('failed reads preserve the exact prior fee and source time with an explicit stale label', () => {
    const failed = failedPlaceFeeRead(mint, row);
    assert.equal(failed.totalAllocatedAtomic, row.totalAllocatedAtomic);
    assert.equal(failed.checkedAt, checkedAt);
    assert.equal(placeFeeLiveReadState(failed), 'stale');
    assert.equal(row.refreshStatus, undefined);
});
test('batch responses cannot refresh unrelated, missing or malformed tokens', () => {
    const rows = mergePlaceFeeResponse({ [mint]: row }, [mint], [{ ...row, mint: other }, { ...row, totalAllocatedAtomic: 'NaN' }]);
    assert.equal(rows[other], undefined);
    assert.equal(rows[mint].totalAllocatedAtomic, row.totalAllocatedAtomic);
    assert.equal(rows[mint].refreshStatus, 'unavailable');
    const current = mergePlaceFeeResponse(rows, [mint], [{ ...row, totalAllocatedAtomic: '7500000001' }]);
    assert.equal(current[mint].refreshStatus, undefined);
    assert.equal(current[mint].totalAllocatedAtomic, '7500000001');
});
test('successful server unavailability does not turn the last verified value into zero or a fresh snapshot', () => {
    const next = mergePlaceFeeResponse({ [mint]: row }, [mint], [{ ...failedPlaceFeeRead(mint), paidAtomic: '0' }]);
    assert.equal(next[mint].checkedAt, checkedAt);
    assert.equal(next[mint].totalAllocatedAtomic, row.totalAllocatedAtomic);
    assert.equal(next[mint].refreshStatus, 'unavailable');
});
test('source age and migrated coverage remain explicit without inferring a full trading history', () => {
    assert.equal(placeFeeLiveReadState(row, Date.parse(checkedAt) + 44999), 'ready');
    assert.equal(placeFeeLiveReadState(row, Date.parse(checkedAt) + 45001), 'stale');
    assert.match(placeFeeLiveSourceMessage({ ...row, phase: 'migrated', totalAllocatedAtomic: null, status: 'partial' }), /including fees after migration has not been verified/);
});
