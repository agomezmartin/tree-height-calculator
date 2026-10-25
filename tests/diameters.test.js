import test from 'node:test';
import assert from 'node:assert/strict';

import { validateTrunkDiameters } from '../js/diameters.js';

test('validateTrunkDiameters parses positive values and ignores unmeasured inputs', () => {
  assert.deepEqual(validateTrunkDiameters(['25', '', '12,5', '   ']), [25, 12.5]);
  assert.deepEqual(validateTrunkDiameters([null, undefined, '']), []);
  assert.deepEqual(validateTrunkDiameters([]), []);
});

test('validateTrunkDiameters rejects invalid and non-positive values independently', () => {
  for (const value of ['abc', '0', '-1']) {
    assert.throws(
      () => validateTrunkDiameters(['25', value]),
      (error) => error.translationKey === (value === 'abc' ? 'validation.dap' : 'validation.dapPositive'),
    );
  }
});

test('validateTrunkDiameters supports any number of measured trunks', () => {
  const values = Array.from({ length: 100 }, (_, index) => String(index + 1));
  assert.equal(validateTrunkDiameters(values).length, 100);
});
