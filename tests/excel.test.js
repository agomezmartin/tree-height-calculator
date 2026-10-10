import test from 'node:test';
import assert from 'node:assert/strict';

import { exportMeasurementsToXlsx } from '../js/excel.js';
import { i18n } from '../js/i18n.js';

test('exportMeasurementsToXlsx agrega latitud y longitud numéricas o vacías sin alterar columnas previas', () => {
  let exportedRows;
  let writtenFile;
  const worksheet = {};
  const workbook = {};
  globalThis.window = {
    XLSX: {
      utils: {
        json_to_sheet(rows) {
          exportedRows = rows;
          return worksheet;
        },
        book_new: () => workbook,
        book_append_sheet(receivedWorkbook, receivedWorksheet, name) {
          assert.equal(receivedWorkbook, workbook);
          assert.equal(receivedWorksheet, worksheet);
          assert.equal(name, 'Mediciones');
        },
      },
      writeFile(receivedWorkbook, fileName) {
        assert.equal(receivedWorkbook, workbook);
        writtenFile = fileName;
      },
    },
  };

  try {
    const filename = exportMeasurementsToXlsx([
      {
        treeId: 'Pino con GPS',
        distance: 20,
        estimatedHeight: 17.7,
        latitude: 40.416812345,
        longitude: -3.703790123,
      },
      { treeId: 'Roble sin GPS', distance: 10, estimatedHeight: 8.2 },
    ]);

    assert.equal(filename, writtenFile);
    assert.equal(exportedRows.length, 2);
    assert.equal(exportedRows[0]['ID del árbol'], 'Pino con GPS');
    assert.equal(exportedRows[0]['Distancia introducida (m)'], 20);
    assert.equal(exportedRows[0]['Altura estimada del árbol (m)'], 17.7);
    assert.equal(exportedRows[0].Latitud, 40.416812345);
    assert.equal(exportedRows[0].Longitud, -3.703790123);
    assert.equal(exportedRows[1].Latitud, '');
    assert.equal(exportedRows[1].Longitud, '');
    assert.deepEqual(Object.keys(exportedRows[0]).slice(-2), ['Latitud', 'Longitud']);
  } finally {
    delete globalThis.window;
  }
});

test('exportMeasurementsToXlsx conserva la exportación sin coordenadas y reporta la librería ausente', () => {
  let exportedRows;
  globalThis.window = {
    XLSX: {
      utils: {
        json_to_sheet(rows) {
          exportedRows = rows;
          return {};
        },
        book_new: () => ({}),
        book_append_sheet() {},
      },
      writeFile() {},
    },
  };

  try {
    exportMeasurementsToXlsx([{ treeId: 'Sin ubicación' }]);
    assert.equal(exportedRows[0].Latitud, '');
    assert.equal(exportedRows[0].Longitud, '');

    globalThis.window = {};
    assert.throws(() => exportMeasurementsToXlsx([]), /librería Excel no está disponible/);
  } finally {
    delete globalThis.window;
  }
});

test('exportMeasurementsToXlsx localiza encabezados, hoja y nombre sin convertir coordenadas numéricas', () => {
  let exportedRows;
  let sheetName;
  let writtenFile;
  globalThis.window = {
    XLSX: {
      utils: {
        json_to_sheet(rows) {
          exportedRows = rows;
          return {};
        },
        book_new: () => ({}),
        book_append_sheet(_workbook, _worksheet, name) {
          sheetName = name;
        },
      },
      writeFile(_workbook, fileName) {
        writtenFile = fileName;
      },
    },
  };

  try {
    i18n.setLanguage('en');
    exportMeasurementsToXlsx([{
      method: 'slope',
      measurementType: 'clinometer',
      distance: 12,
      latitude: 40.123,
      longitude: -3.456,
    }]);
    assert.equal(sheetName, 'Measurements');
    assert.equal(exportedRows[0]['Measurement method'], 'Distance along the ground');
    assert.equal(exportedRows[0]['Height source'], 'Calculate with clinometer');
    assert.match(exportedRows[0]['Formula / method used'], /h_eye/);
    assert.equal(exportedRows[0].Latitude, 40.123);
    assert.equal(exportedRows[0].Longitude, -3.456);
    assert.match(writtenFile, /^tree-measurements-\d{4}-\d{2}-\d{2}\.xlsx$/);
  } finally {
    i18n.setLanguage('es');
    delete globalThis.window;
  }
});

test('manual height rows export the numeric height and leave clinometer measurements blank', () => {
  let exportedRows;
  globalThis.window = {
    XLSX: {
      utils: {
        json_to_sheet(rows) {
          exportedRows = rows;
          return {};
        },
        book_new: () => ({}),
        book_append_sheet() {},
      },
      writeFile() {},
    },
  };

  try {
    i18n.setLanguage('en');
    exportMeasurementsToXlsx([{
      treeId: 'Manual tree',
      measurementType: 'manual',
      estimatedHeight: 12.5,
      distance: null,
      clinometerPercent: null,
      terrainSlopePercent: null,
      observerHeight: null,
      latitude: 40.1,
      longitude: -3.2,
    }]);

    const [row] = exportedRows;
    assert.equal(row['Height source'], 'Enter a known height');
    assert.equal(row['Estimated tree height (m)'], 12.5);
    assert.equal(row['Entered distance (m)'], '');
    assert.equal(row['Clinometer (%)'], '');
    assert.equal(row['Terrain slope (%)'], '');
    assert.equal(row['Instrument height (m)'], '');
    assert.equal(row.Latitude, 40.1);
    assert.equal(row.Longitude, -3.2);
  } finally {
    i18n.setLanguage('es');
    delete globalThis.window;
  }
});
