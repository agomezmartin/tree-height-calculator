import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addMeasurement,
  deleteMeasurementById,
  getMeasurements,
  saveMeasurements,
  updateMeasurementById,
} from '../js/storage.js';

test('storage conserva coordenadas opcionales, edita registros existentes y lee datos anteriores', () => {
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };

  try {
    const legacy = { id: 'old', treeId: 'Pino antiguo', estimatedHeight: 12.5 };
    saveMeasurements([legacy]);
    assert.deepEqual(getMeasurements(), [legacy]);

    addMeasurement({
      id: 'gps',
      treeId: 'Roble',
      latitude: 40.123456789,
      longitude: -3.987654321,
    });
    addMeasurement({ id: 'no-gps', treeId: 'Abedul', latitude: null, longitude: null });

    const edited = updateMeasurementById('gps', { treeId: 'Roble editado' });
    assert.equal(edited.find((entry) => entry.id === 'gps').latitude, 40.123456789);
    assert.equal(edited.find((entry) => entry.id === 'gps').longitude, -3.987654321);
    assert.equal(edited.find((entry) => entry.id === 'gps').treeId, 'Roble editado');

    const updatedCoordinates = updateMeasurementById('gps', { latitude: 0, longitude: 0 });
    assert.equal(updatedCoordinates.find((entry) => entry.id === 'gps').latitude, 0);
    assert.equal(updatedCoordinates.find((entry) => entry.id === 'gps').longitude, 0);

    const remaining = deleteMeasurementById('gps');
    assert.equal(remaining.some((entry) => entry.id === 'gps'), false);
    assert.deepEqual(getMeasurements(), remaining);
    assert.equal(remaining.find((entry) => entry.id === 'old').estimatedHeight, 12.5);
    assert.equal(remaining.find((entry) => entry.id === 'no-gps').latitude, null);
  } finally {
    delete globalThis.localStorage;
  }
});
