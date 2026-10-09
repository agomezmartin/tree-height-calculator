import test from 'node:test';
import assert from 'node:assert/strict';

import { exportMeasurementsToXlsx } from '../js/excel.js';

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
