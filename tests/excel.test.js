import test from 'node:test';
import assert from 'node:assert/strict';

import { exportMeasurementsToXlsx } from '../js/excel.js';
import { i18n } from '../js/i18n.js';

test('exportMeasurementsToXlsx agrega latitud y longitud numéricas o vacías sin alterar columnas previas', () => {
  let exportedRows;
  let exportedTrunkRows;
  let writtenFile;
  const worksheet = {};
  const trunkWorksheet = {};
  const workbook = {};
  const appendedSheets = [];
  globalThis.window = {
    XLSX: {
      utils: {
        json_to_sheet(rows) {
          if (!exportedRows) {
            exportedRows = rows;
            return worksheet;
          }
          exportedTrunkRows = rows;
          return trunkWorksheet;
        },
        book_new: () => workbook,
        book_append_sheet(receivedWorkbook, receivedWorksheet, name) {
          assert.equal(receivedWorkbook, workbook);
          appendedSheets.push({ receivedWorksheet, name });
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
        id: 'record-1',
        treeId: 'Pino con GPS',
        speciesIfnCode: 45,
        speciesScientificName: 'Quercus ilex',
        speciesCommonName: 'Encina',
        phytosanitaryStatus: 'acceptable',
        trunkDiameters: [30, 24],
        distance: 20,
        estimatedHeight: 17.7,
        latitude: 40.416812345,
        longitude: -3.703790123,
      },
      { id: 'record-2', treeId: 'Roble sin GPS', distance: 10, estimatedHeight: 8.2 },
      { id: 'record-3', treeId: 'Fresno sin evaluar', phytosanitaryStatus: null },
      { id: 'record-4', treeId: 'Abedul sin evaluar', phytosanitaryStatus: '' },
    ]);

    assert.equal(filename, writtenFile);
    assert.equal(exportedRows.length, 4);
    assert.equal(exportedRows[0]['ID del árbol'], 'Pino con GPS');
    assert.equal(exportedRows[0]['Código IFN de la especie'], 45);
    assert.equal(exportedRows[0]['Nombre científico'], 'Quercus ilex');
    assert.equal(exportedRows[0]['Nombre común'], 'Encina');
    assert.equal(exportedRows[0]['Estado fitosanitario'], 'Aceptable');
    assert.equal(exportedRows[0]['Distancia introducida (m)'], 20);
    assert.equal(exportedRows[0]['Altura estimada del árbol (m)'], 17.7);
    assert.equal(exportedRows[0].Latitud, 40.416812345);
    assert.equal(exportedRows[0].Longitud, -3.703790123);
    assert.equal(exportedRows[1].Latitud, '');
    assert.equal(exportedRows[1].Longitud, '');
    assert.equal(exportedRows[1]['Estado fitosanitario'], '');
    assert.equal(exportedRows[2]['Estado fitosanitario'], '');
    assert.equal(exportedRows[3]['Estado fitosanitario'], '');
    assert.deepEqual(Object.keys(exportedRows[0]).slice(-2), ['Latitud', 'Longitud']);
    assert.deepEqual(appendedSheets, [
      { receivedWorksheet: worksheet, name: 'Mediciones' },
      { receivedWorksheet: trunkWorksheet, name: 'Troncos' },
    ]);
    assert.equal(exportedTrunkRows.length, 5);
    assert.deepEqual(exportedTrunkRows.slice(0, 2), [
      {
        'ID del registro': 'record-1',
        'ID del árbol': 'Pino con GPS',
        'Número de tronco': 1,
        'DAP a 1,30 m (cm)': 30,
      },
      {
        'ID del registro': 'record-1',
        'ID del árbol': 'Pino con GPS',
        'Número de tronco': 2,
        'DAP a 1,30 m (cm)': 24,
      },
    ]);
    assert.deepEqual(exportedTrunkRows.slice(2), [
      { 'ID del registro': 'record-2', 'ID del árbol': 'Roble sin GPS', 'Número de tronco': '', 'DAP a 1,30 m (cm)': '' },
      { 'ID del registro': 'record-3', 'ID del árbol': 'Fresno sin evaluar', 'Número de tronco': '', 'DAP a 1,30 m (cm)': '' },
      { 'ID del registro': 'record-4', 'ID del árbol': 'Abedul sin evaluar', 'Número de tronco': '', 'DAP a 1,30 m (cm)': '' },
    ]);
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
          if (!exportedRows) exportedRows = rows;
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
    assert.equal(exportedRows[0]['Código IFN de la especie'], '');
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
  const exportedSheets = [];
  let writtenFile;
  globalThis.window = {
    XLSX: {
      utils: {
        json_to_sheet(rows) {
          exportedSheets.push(rows);
          if (!exportedRows) exportedRows = rows;
          return {};
        },
        book_new: () => ({}),
        book_append_sheet(_workbook, _worksheet, name) {
          exportedSheets.push(name);
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
    assert.equal(exportedSheets[2], 'Measurements');
    assert.equal(exportedSheets[3], 'Trunks');
    assert.equal(exportedRows[0]['Species IFN code'], 31);
    assert.equal(exportedRows[0]['Scientific name'], 'Abies alba');
    assert.equal(exportedRows[0]['Common name'], 'Pinabete');
    assert.equal(exportedRows[0]['Measurement method'], 'Distance along the ground');
    assert.equal(exportedRows[0]['Height source'], 'Calculate with clinometer');
    assert.match(exportedRows[0]['Formula / method used'], /h_eye/);
    assert.equal(exportedRows[0].Latitude, 40.123);
    assert.equal(exportedRows[0].Longitude, -3.456);
    assert.deepEqual(exportedSheets[1], [
      {
        'Measurement record ID': 'record-1',
        'Tree ID': 'Oak',
        'Trunk number': 1,
        'DBH at 1.30 m (cm)': 31,
      },
      {
        'Measurement record ID': 'record-1',
        'Tree ID': 'Oak',
        'Trunk number': 2,
        'DBH at 1.30 m (cm)': 20,
      },
    ]);
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
          if (!exportedRows) exportedRows = rows;
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

    const [row] = exportedRows;
    assert.equal(row['Species IFN code'], 21);
    assert.equal(row['Scientific name'], 'Pinus sylvestris');
    assert.equal(row['Common name'], 'Pino silvestre');
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
