import test from 'node:test';
import assert from 'node:assert/strict';

import {
  convertPercentToRadians,
  calculateHorizontalDistance,
  calculateTerrainElevationDifference,
  calculateCrownElevation,
  calculateTreeHeight,
  validateManualHeight,
  validateMeasurement,
} from '../js/calculator.js';

const approx = (actual, expected, tolerance = 1e-9) =>
  Math.abs(actual - expected) <= tolerance;

test('convertPercentToRadians interpreta correctamente el porcentaje del clinómetro', () => {
  assert.ok(approx(convertPercentToRadians(50), Math.atan(0.5)));
  assert.ok(approx(convertPercentToRadians(100), Math.atan(1)));
  assert.ok(approx(convertPercentToRadians(0), 0));
});

test('calculateHorizontalDistance devuelve la misma distancia para método horizontal', () => {
  assert.equal(calculateHorizontalDistance({ method: 'horizontal', distance: 20, terrainSlopePercent: 0 }), 20);
});

test('calculateHorizontalDistance corrige la distancia sobre terreno con la pendiente', () => {
  const result = calculateHorizontalDistance({ method: 'slope', distance: 20, terrainSlopePercent: 10 });
  assert.ok(approx(result, 20 * Math.cos(Math.atan(0.10))));
});

test('calculateTerrainElevationDifference aplica correctamente el signo', () => {
  assert.ok(approx(calculateTerrainElevationDifference(20, 10), 2));
  assert.ok(approx(calculateTerrainElevationDifference(20, -10), -2));
  assert.ok(approx(calculateTerrainElevationDifference(20, 0), 0));
});

test('calculateCrownElevation calcula la diferencia vertical respecto a la línea del ojo', () => {
  assert.ok(approx(calculateCrownElevation(20, 80), 16));
  assert.ok(approx(calculateCrownElevation(20, -20), -4));
});

test('calculateTreeHeight devuelve el caso plano esperado', () => {
  const height = calculateTreeHeight({
    method: 'horizontal',
    distance: 20,
    clinometerPercent: 80,
    terrainSlopePercent: 0,
    observerHeight: 1.7,
  });

  assert.ok(approx(height, 17.7));
});

test('calculateTreeHeight incorpora el desnivel del terreno con signo', () => {
  const ascending = calculateTreeHeight({
    method: 'horizontal',
    distance: 20,
    clinometerPercent: 80,
    terrainSlopePercent: 10,
    observerHeight: 1.7,
  });

  const descending = calculateTreeHeight({
    method: 'horizontal',
    distance: 20,
    clinometerPercent: 80,
    terrainSlopePercent: -10,
    observerHeight: 1.7,
  });

  assert.ok(ascending < 17.7);
  assert.ok(descending > 17.7);
});

test('calculateTreeHeight calcula correctamente cuando la distancia se mide sobre el terreno', () => {
  const result = calculateTreeHeight({
    method: 'slope',
    distance: 20,
    clinometerPercent: 80,
    terrainSlopePercent: 10,
    observerHeight: 1.7,
  });

  assert.ok(approx(result, 1.7 + 20 * Math.cos(Math.atan(0.1)) * 0.8 - 20 * Math.cos(Math.atan(0.1)) * 0.1));
});

test('validateMeasurement acepta valores con coma decimal y rechaza datos inválidos', () => {
  const parsed = validateMeasurement({
    method: 'horizontal',
    distance: '20,5',
    clinometerPercent: '80,00',
    terrainSlopePercent: '0,00',
    observerHeight: '1,70',
  });

  assert.ok(approx(parsed.distance, 20.5));
  assert.ok(approx(parsed.clinometerPercent, 80));
  assert.ok(approx(parsed.observerHeight, 1.7));

  assert.throws(() => validateMeasurement({ distance: 0, clinometerPercent: 80, terrainSlopePercent: 0, observerHeight: 1.7 }));
  assert.throws(() => validateMeasurement({ distance: 20, clinometerPercent: 'abc', terrainSlopePercent: 0, observerHeight: 1.7 }));
  assert.throws(() => validateMeasurement({ distance: 20, clinometerPercent: 80, terrainSlopePercent: 0, observerHeight: -1 }));
});

test('validateManualHeight accepts positive decimal heights and rejects invalid values', () => {
  assert.equal(validateManualHeight('12,5'), 12.5);
  assert.equal(validateManualHeight('12.5'), 12.5);

  for (const value of ['', '   ', 'abc', Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    assert.throws(
      () => validateManualHeight(value),
      (error) => error.translationKey === 'validation.manualHeight',
    );
  }
  for (const value of [-1, '-0.1', 0]) {
    assert.throws(
      () => validateManualHeight(value),
      (error) => error.translationKey === 'validation.manualHeightPositive',
    );
  }
});
