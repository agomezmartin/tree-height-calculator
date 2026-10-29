import test from 'node:test';
import assert from 'node:assert/strict';

import { isPartialTrunkDiameter, validateTrunkDiameters } from '../js/diameters.js';

test('validateTrunkDiameters parses positive values and ignores unmeasured inputs', () => {
  assert.deepEqual(validateTrunkDiameters(['25', '', '12,5']), [25, 12.5]);
  assert.deepEqual(validateTrunkDiameters([null, undefined, '']), []);
  assert.deepEqual(validateTrunkDiameters([]), []);
});

test('validateTrunkDiameters rejects invalid and non-positive values independently', () => {
  for (const value of ['0', '-1']) {
    assert.throws(
      () => validateTrunkDiameters(['25', value]),
      (error) => error.translationKey === 'validation.dapPositive',
    );
  }
  for (const value of ['abc', '+2', '1e3', '1.2.3', '1 2', '12cm', '   ', '1,2.3']) {
    assert.throws(
      () => validateTrunkDiameters(['25', value]),
      (error) => error.translationKey === 'validation.dap',
    );
  }
});

test('validateTrunkDiameters accepts decimal precision and rejects non-finite numbers', () => {
  assert.deepEqual(validateTrunkDiameters(['12.5', '0.75', '123.456', '.25']), [12.5, 0.75, 123.456, 0.25]);
  assert.throws(
    () => validateTrunkDiameters(['1'.repeat(400)]),
    (error) => error.translationKey === 'validation.dap',
  );
  assert.throws(
    () => validateTrunkDiameters(['12.']),
    (error) => error.translationKey === 'validation.dap',
  );
});

test('isPartialTrunkDiameter allows intermediate decimal input but rejects extra characters', () => {
  for (const value of ['', '12', '12.', '12,', '.5', ',5']) {
    assert.equal(isPartialTrunkDiameter(value), true);
  }
  for (const value of ['-', '+1', '1e3', '1.2.3', '1 2', '12cm']) {
    assert.equal(isPartialTrunkDiameter(value), false);
  }
});

test('validateTrunkDiameters supports any number of measured trunks', () => {
  const values = Array.from({ length: 100 }, (_, index) => String(index + 1));
  assert.equal(validateTrunkDiameters(values).length, 100);
});
