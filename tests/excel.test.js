import test from 'node:test';
import assert from 'node:assert/strict';

import { exportMeasurementsToXlsx } from '../js/excel.js';
import { i18n } from '../js/i18n.js';

function captureExport(measurements) {
  const workbook = { SheetNames: [], Sheets: {} };
  let exportedRows;
  let writtenFile;
  globalThis.window = {
    XLSX: {
      utils: {
        json_to_sheet(rows) {
          exportedRows = rows;
          return rows;
        },
        book_new: () => workbook,
        book_append_sheet(receivedWorkbook, worksheet, name) {
          receivedWorkbook.SheetNames.push(name);
          receivedWorkbook.Sheets[name] = worksheet;
        },
      },
      writeFile(receivedWorkbook, fileName) {
        assert.equal(receivedWorkbook, workbook);
        writtenFile = fileName;
      },
    },
  };

  try {
    exportMeasurementsToXlsx(measurements);
    return { rows: exportedRows, workbook, writtenFile };
  } finally {
    delete globalThis.window;
  }
}

test('exportMeasurementsToXlsx creates one fixed-named sheet and one row per tree', () => {
  const { rows, workbook, writtenFile } = captureExport([
    {
      id: 'tree-a',
      treeId: 'Oak A',
      speciesScientificName: 'Quercus robur',
      trunkDiameters: [24.5, 18.2],
      trunkIds: ['trunk-a1', 'trunk-a2'],
      latitude: 40.123456789,
      longitude: -3.987654321,
    },
    {
      id: 'tree-b',
      treeId: 'Oak B',
      trunkDiameters: [35],
      trunkIds: ['trunk-b1'],
    },
    {
      id: 'tree-c',
      treeId: 'Oak C',
      trunkDiameters: [12, 15.5, 9],
      trunkIds: ['trunk-c1', 'trunk-c2', 'trunk-c3'],
    },
    { id: 'legacy', treeId: 'Legacy tree' },
    { id: 'empty', treeId: 'Unmeasured tree', trunkDiameters: [] },
  ]);

  assert.deepEqual(workbook.SheetNames, ['Mediciones']);
  assert.deepEqual(Object.keys(workbook.Sheets), ['Mediciones']);
  assert.equal(rows.length, 5);
  assert.equal(rows[0][i18n.t('export.speciesScientificName')], 'Quercus robur');
  assert.equal(rows[0][i18n.t('export.latitude')], 40.123456789);
  assert.equal(rows[0][i18n.t('export.longitude')], -3.987654321);
  assert.deepEqual(
    rows.map((row) => [
      row['Tronco 1 (diámetro en cm)'] ?? '',
      row['Tronco 2 (diámetro en cm)'] ?? '',
      row['Tronco 3 (diámetro en cm)'] ?? '',
    ]),
    [
      [24.5, 18.2, ''],
      [35, '', ''],
      [12, 15.5, 9],
      ['', '', ''],
      ['', '', ''],
    ],
  );
  const headers = Object.keys(rows[0]);
  const latitudeIndex = headers.indexOf(i18n.t('export.latitude'));
  assert.deepEqual(headers.slice(latitudeIndex - 3, latitudeIndex), [
    'Tronco 1 (diámetro en cm)',
    'Tronco 2 (diámetro en cm)',
    'Tronco 3 (diámetro en cm)',
  ]);
  assert.deepEqual(headers.slice(latitudeIndex), [
    i18n.t('export.latitude'),
    i18n.t('export.longitude'),
  ]);
  assert.match(writtenFile, /^mediciones-arboles-\d{4}-\d{2}-\d{2}\.xlsx$/);
});

test('trunk columns are dynamic for one, three, and five trunks', () => {
  for (const trunkCount of [1, 3, 5]) {
    const measurements = [{
      id: `tree-${trunkCount}`,
      treeId: 'Variable tree',
      trunkDiameters: Array.from({ length: trunkCount }, (_unused, index) => index + 1.25),
      trunkIds: Array.from({ length: trunkCount }, (_unused, index) => `persistent-${index + 1}`),
    }];
    const { rows, workbook } = captureExport(measurements);
    const trunkColumns = Object.keys(rows[0]).filter((key) => /^Tronco \d+ \(diámetro en cm\)$/.test(key));

    assert.deepEqual(workbook.SheetNames, ['Mediciones']);
    assert.deepEqual(trunkColumns, Array.from(
      { length: trunkCount },
      (_unused, index) => `Tronco ${index + 1} (diámetro en cm)`,
    ));
    assert.deepEqual(
      trunkColumns.map((column) => rows[0][column]),
      measurements[0].trunkDiameters,
    );
    assert.deepEqual(measurements[0].trunkIds, Array.from(
      { length: trunkCount },
      (_unused, index) => `persistent-${index + 1}`,
    ));
  }
});

test('export keeps translated measurement fields while structural sheet and trunk names stay fixed', () => {
  i18n.setLanguage('en');
  try {
    const { rows, workbook } = captureExport([{
      id: 'record-1',
      treeId: 'Oak',
      trunkDiameters: [31, 20],
      method: 'slope',
      measurementType: 'clinometer',
      speciesIfnCode: 31,
      speciesScientificName: 'Abies alba',
      speciesCommonName: 'Pinabete',
      distance: 12,
      latitude: 40.123,
      longitude: -3.456,
    }]);

    assert.deepEqual(workbook.SheetNames, ['Mediciones']);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]['Species IFN code'], 31);
    assert.equal(rows[0]['Scientific name'], 'Abies alba');
    assert.equal(rows[0]['Common name'], 'Pinabete');
    assert.equal(rows[0]['Measurement method'], 'Distance along the ground');
    assert.equal(rows[0]['Height source'], 'Calculate with clinometer');
    assert.match(rows[0]['Formula / method used'], /h_eye/);
    assert.equal(rows[0][i18n.t('export.latitude')], 40.123);
    assert.equal(rows[0][i18n.t('export.longitude')], -3.456);
    assert.equal(rows[0]['Tronco 1 (diámetro en cm)'], 31);
    assert.equal(rows[0]['Tronco 2 (diámetro en cm)'], 20);
  } finally {
    i18n.setLanguage('es');
  }
});

test('export rejects invalid stored diameters rather than exporting them', () => {
  globalThis.window = {
    XLSX: {
      utils: {
        json_to_sheet: () => ({}),
        book_new: () => ({}),
        book_append_sheet() {},
      },
      writeFile() {},
    },
  };

  try {
    assert.throws(
      () => exportMeasurementsToXlsx([{ id: 'invalid-record', trunkDiameters: ['1e3'] }]),
      (error) => error.translationKey === 'validation.dap',
    );
  } finally {
    delete globalThis.window;
  }
});

test('exportMeasurementsToXlsx reports the Excel library as unavailable', () => {
  globalThis.window = {};
  try {
    assert.throws(() => exportMeasurementsToXlsx([]), /librería Excel no está disponible/);
  } finally {
    delete globalThis.window;
  }
});

test('manual height rows export the numeric height and leave clinometer measurements blank', () => {
  i18n.setLanguage('es');
  const { rows } = captureExport([{
    treeId: 'Manual tree',
    measurementType: 'manual',
    speciesIfnCode: 21,
    speciesScientificName: 'Pinus sylvestris',
    speciesCommonName: 'Pino silvestre',
    estimatedHeight: 12.5,
    distance: null,
    clinometerPercent: null,
    terrainSlopePercent: null,
    observerHeight: null,
    latitude: 40.1,
    longitude: -3.2,
  }]);

  const [row] = rows;
  assert.equal(row[i18n.t('export.speciesIfnCode')], 21);
  assert.equal(row[i18n.t('export.speciesScientificName')], 'Pinus sylvestris');
  assert.equal(row[i18n.t('export.speciesCommonName')], 'Pino silvestre');
  assert.equal(row[i18n.t('export.measurementType')], i18n.t('measurement.typeManual'));
  assert.equal(row[i18n.t('export.estimatedHeight')], 12.5);
  assert.equal(row[i18n.t('export.distance')], '');
  assert.equal(row[i18n.t('export.clinometer')], '');
  assert.equal(row[i18n.t('export.slope')], '');
  assert.equal(row[i18n.t('export.observerHeight')], '');
  assert.equal(row[i18n.t('export.latitude')], 40.1);
  assert.equal(row[i18n.t('export.longitude')], -3.2);
});
