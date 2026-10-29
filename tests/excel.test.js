import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';

import { exportMeasurementsToXlsx } from '../js/excel.js';
import { i18n } from '../js/i18n.js';

async function captureExport(measurements) {
  let downloadedBlob;
  let writtenFile;
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  globalThis.window = {
    ExcelJS,
    URL: {
      createObjectURL(blob) {
        downloadedBlob = blob;
        return 'blob:export';
      },
      revokeObjectURL() {},
    },
    setTimeout(callback) {
      callback();
    },
  };
  globalThis.document = {
    body: { append() {} },
    createElement() {
      return {
        style: {},
        click() {
          writtenFile = this.download;
        },
        remove() {},
      };
    },
  };

  try {
    await exportMeasurementsToXlsx(measurements);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await downloadedBlob.arrayBuffer());
    const worksheet = workbook.getWorksheet('Mediciones');
    const headers = worksheet.getRow(1).values.slice(1);
    const rows = [];

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
      const row = worksheet.getRow(rowNumber);
      rows.push(Object.fromEntries(headers.map((header, index) => [
        header,
        row.getCell(index + 1).value ?? '',
      ])));
    }

    return { rows, workbook, worksheet, headers, writtenFile };
  } finally {
    if (previousWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = previousWindow;
    }
    if (previousDocument === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = previousDocument;
    }
  }
}

test('exportMeasurementsToXlsx creates one fixed-named sheet and one row per tree', async () => {
  const { rows, workbook, headers, writtenFile } = await captureExport([
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

  assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), ['Mediciones']);
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

test('trunk columns are dynamic for one, three, and five trunks', async () => {
  for (const trunkCount of [1, 3, 5]) {
    const measurements = [{
      id: `tree-${trunkCount}`,
      treeId: 'Variable tree',
      trunkDiameters: Array.from({ length: trunkCount }, (_unused, index) => index + 1.25),
      trunkIds: Array.from({ length: trunkCount }, (_unused, index) => `persistent-${index + 1}`),
    }];
    const { rows, headers, workbook } = await captureExport(measurements);
    const trunkColumns = headers.filter((key) => /^Tronco \d+ \(diámetro en cm\)$/.test(key));

    assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), ['Mediciones']);
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

test('export keeps translated measurement fields while structural sheet and trunk names stay fixed', async () => {
  i18n.setLanguage('en');
  try {
    const { rows, workbook } = await captureExport([{
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

    assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), ['Mediciones']);
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

test('export rejects invalid stored diameters rather than exporting them', async () => {
  globalThis.window = {
    ExcelJS,
  };

  try {
    await assert.rejects(
      exportMeasurementsToXlsx([{ id: 'invalid-record', trunkDiameters: ['1e3'] }]),
      (error) => error.translationKey === 'validation.dap',
    );
  } finally {
    delete globalThis.window;
  }
});

test('exportMeasurementsToXlsx reports the Excel library as unavailable', async () => {
  globalThis.window = {};
  try {
    await assert.rejects(
      exportMeasurementsToXlsx([]),
      /librería Excel no está disponible/,
    );
  } finally {
    delete globalThis.window;
  }
});

test('manual height rows export the numeric height and leave clinometer measurements blank', async () => {
  i18n.setLanguage('es');
  const { rows } = await captureExport([{
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

test('the exported workbook has hidden gridlines, readable wrapped cells, and a filtered native table', async () => {
  const { worksheet, headers, rows } = await captureExport([{
    treeId: 'Oak A',
    speciesScientificName: 'Quercus robur',
    estimatedHeight: 18.25,
    trunkDiameters: [24.5, 18.2],
    trunkIds: ['trunk-a1', 'trunk-a2'],
    latitude: 40.123456789,
    longitude: -3.987654321,
  }]);

  assert.equal(worksheet.views[0].showGridLines, false);
  assert.equal(worksheet.rowCount, rows.length + 1);
  assert.equal(worksheet.columnCount, headers.length);
  headers.forEach((header, index) => {
    assert.ok(worksheet.getColumn(index + 1).width >= header.length + 2);
  });
  for (let rowNumber = 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    for (let columnNumber = 1; columnNumber <= worksheet.columnCount; columnNumber += 1) {
      assert.equal(worksheet.getRow(rowNumber).getCell(columnNumber).alignment.wrapText, true);
    }
  }

  const table = worksheet.getTable('TablaMedicionesArbolado').table;
  assert.equal(table.headerRow, true);
  assert.equal(table.totalsRow, false);
  assert.equal(table.tableRef, `A1:${worksheet.getColumn(worksheet.columnCount).letter}${worksheet.rowCount}`);
  assert.equal(table.autoFilterRef, table.tableRef);
  assert.equal(table.style.theme, 'TableStyleLight11');
  assert.deepEqual(table.columns.map((column) => column.name), headers);
  assert.ok(table.columns.every((column) => column.filterButton));
  assert.ok(table.columns.some((column) => column.name === 'Tronco 1 (diámetro en cm)'));
  assert.ok(table.columns.some((column) => column.name === 'Tronco 2 (diámetro en cm)'));
  assert.deepEqual(
    rows.map((row) => [
      row['Tronco 1 (diámetro en cm)'],
      row['Tronco 2 (diámetro en cm)'],
      row[i18n.t('export.latitude')],
      row[i18n.t('export.longitude')],
    ]),
    [[24.5, 18.2, 40.123456789, -3.987654321]],
  );
});

test('duplicate translated headers are made unique without dropping their column values', async () => {
  const originalTranslate = i18n.t;
  i18n.t = (key, parameters) => {
    if (key === 'export.treeId' || key === 'export.speciesIfnCode') return 'Campo';
    return originalTranslate(key, parameters);
  };

  try {
    const { rows, headers } = await captureExport([{
      treeId: 'Oak A',
      speciesIfnCode: 31,
    }]);

    assert.deepEqual(headers.slice(0, 3), ['Campo', 'Campo (2)', originalTranslate('export.speciesScientificName')]);
    assert.equal(rows[0].Campo, 'Oak A');
    assert.equal(rows[0]['Campo (2)'], 31);
  } finally {
    i18n.t = originalTranslate;
  }
});
