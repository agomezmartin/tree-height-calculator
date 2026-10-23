import test from 'node:test';
import assert from 'node:assert/strict';

import { exportMeasurementsToCsv } from '../js/csv.js';
import { i18n } from '../js/i18n.js';

function parseCsv(csv) {
  const records = [];
  let record = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    if (inQuotes) {
      if (character === '"' && csv[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        inQuotes = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      inQuotes = true;
    } else if (character === ';') {
      record.push(field);
      field = '';
    } else if (character === '\r' && csv[index + 1] === '\n') {
      record.push(field);
      records.push(record);
      record = [];
      field = '';
      index += 1;
    } else {
      field += character;
    }
  }

  record.push(field);
  records.push(record);
  assert.equal(inQuotes, false, 'CSV ends outside a quoted field');
  return records;
}

async function withDownloadMocks(run) {
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const originalCreateObjectURL = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
  const originalRevokeObjectURL = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
  const originalSetTimeout = Object.getOwnPropertyDescriptor(globalThis, 'setTimeout');
  let capturedBlob;
  let capturedLink;
  const revokedUrls = [];

  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      body: {
        append(link) {
          link.isAttached = true;
        },
      },
      createElement(tagName) {
        assert.equal(tagName, 'a');
        capturedLink = {
          remove() {
            this.isAttached = false;
          },
          click() {
            this.wasClicked = true;
          },
        };
        return capturedLink;
      },
    },
  });
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value(blob) {
      capturedBlob = blob;
      return 'blob:test-csv';
    },
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value(url) {
      revokedUrls.push(url);
    },
  });
  Object.defineProperty(globalThis, 'setTimeout', {
    configurable: true,
    value(callback, delay) {
      assert.equal(delay, 1000);
      callback();
      return 1;
    },
  });

  try {
    await run({
      get blob() {
        return capturedBlob;
      },
      get link() {
        return capturedLink;
      },
      revokedUrls,
    });
  } finally {
    for (const [object, key, descriptor] of [
      [globalThis, 'document', originalDocument],
      [URL, 'createObjectURL', originalCreateObjectURL],
      [URL, 'revokeObjectURL', originalRevokeObjectURL],
      [globalThis, 'setTimeout', originalSetTimeout],
    ]) {
      if (descriptor) Object.defineProperty(object, key, descriptor);
      else delete object[key];
    }
  }
}

test('CSV export keeps localized column order and all measurement data across multiple records', async () => {
  await withDownloadMocks(async (download) => {
    i18n.setLanguage('es');
    const fileName = exportMeasurementsToCsv([
      {
        treeId: 'Pino con GPS',
        speciesIfnCode: 45,
        speciesScientificName: 'Quercus ilex',
        speciesCommonName: 'Encina',
        distance: 20,
        estimatedHeight: 17.7,
        latitude: 40.416812345,
        longitude: -3.703790123,
      },
      { treeId: 'Roble sin GPS', distance: 10, estimatedHeight: 8.2 },
    ]);
    const bytes = new Uint8Array(await download.blob.arrayBuffer());
    const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes);
    const csv = text.slice(1);
    const records = parseCsv(csv);
    const headers = records[0];
    const firstRow = Object.fromEntries(headers.map((header, index) => [header, records[1][index]]));
    const secondRow = Object.fromEntries(headers.map((header, index) => [header, records[2][index]]));

    assert.match(fileName, /^mediciones-arboles-\d{4}-\d{2}-\d{2}\.csv$/);
    assert.equal(download.link.download, fileName);
    assert.equal(download.link.href, 'blob:test-csv');
    assert.equal(download.link.wasClicked, true);
    assert.equal(download.link.isAttached, false);
    assert.equal(download.blob.type, 'text/csv;charset=utf-8');
    assert.equal(text.charCodeAt(0), 0xFEFF);
    assert.equal(csv.includes('\n'), true);
    assert.equal(csv.replaceAll('\r\n', '').includes('\n'), false);
    assert.equal(csv.includes(','), false);
    assert.deepEqual(headers, [
      'ID del árbol',
      'Código IFN de la especie',
      'Nombre científico',
      'Nombre común',
      'Origen de la altura',
      'Fecha',
      'Observaciones',
      'Método de medición',
      'Distancia introducida (m)',
      'Unidad de distancia',
      'Distancia horizontal calculada (m)',
      'Clinómetro (%)',
      'Ángulo del clinómetro (°)',
      'Pendiente del terreno (%)',
      'Ángulo del terreno (°)',
      'Desnivel calculado (m)',
      'Altura del instrumento (m)',
      'Altura estimada del árbol (m)',
      'Fórmula / método utilizado',
      'Latitud',
      'Longitud',
    ]);
    assert.deepEqual(Object.keys(firstRow), headers);
    assert.equal(firstRow['ID del árbol'], 'Pino con GPS');
    assert.equal(firstRow['Código IFN de la especie'], '45');
    assert.equal(firstRow['Nombre científico'], 'Quercus ilex');
    assert.equal(firstRow['Nombre común'], 'Encina');
    assert.equal(firstRow['Distancia introducida (m)'], '20');
    assert.equal(firstRow['Altura estimada del árbol (m)'], '17.7');
    assert.equal(firstRow.Latitud, '40.416812345');
    assert.equal(firstRow.Longitud, '-3.703790123');
    assert.equal(secondRow['ID del árbol'], 'Roble sin GPS');
    assert.equal(secondRow['Código IFN de la especie'], '');
    assert.equal(secondRow['Nombre científico'], '');
    assert.equal(secondRow.Latitud, '');
    assert.equal(secondRow.Longitud, '');
    assert.equal(records.length, 3);
    assert.deepEqual(download.revokedUrls, ['blob:test-csv']);
  });
});

test('CSV quotes delimiters, quotation marks and line breaks while preserving Unicode', async () => {
  await withDownloadMocks(async (download) => {
    i18n.setLanguage('es');
    exportMeasurementsToCsv([{
      treeId: 'Roble; grande',
      speciesScientificName: 'Quercus "robur"',
      speciesCommonName: 'Roble\ncomún',
      notes: 'Árbol; con "corteza"\r\nobservada: ñandú',
      distance: 12.5,
      latitude: null,
      longitude: undefined,
    }]);
    const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(await download.blob.arrayBuffer());
    const records = parseCsv(text.slice(1));
    const headers = records[0];
    const row = Object.fromEntries(headers.map((header, index) => [header, records[1][index]]));

    assert.equal(row['ID del árbol'], 'Roble; grande');
    assert.equal(row['Nombre científico'], 'Quercus "robur"');
    assert.equal(row['Nombre común'], 'Roble\ncomún');
    assert.equal(row.Observaciones, 'Árbol; con "corteza"\r\nobservada: ñandú');
    assert.equal(row['Distancia introducida (m)'], '12.5');
    assert.equal(row.Latitud, '');
    assert.equal(row.Longitud, '');
    assert.equal(records.length, 2);
  });
});

test('CSV supports empty exports and reports download failures', async () => {
  await withDownloadMocks(async (download) => {
    i18n.setLanguage('en');
    const fileName = exportMeasurementsToCsv([]);
    const records = parseCsv(new TextDecoder('utf-8', { ignoreBOM: true })
      .decode(await download.blob.arrayBuffer()).slice(1));

    assert.match(fileName, /^tree-measurements-\d{4}-\d{2}-\d{2}\.csv$/);
    assert.equal(records.length, 1);
    assert.equal(records[0][0], 'Tree ID');
    assert.equal(download.link.wasClicked, true);
  });

  await withDownloadMocks(async () => {
    globalThis.document.body.append = () => {
      throw new Error('download blocked');
    };

    assert.throws(
      () => exportMeasurementsToCsv([{ treeId: 'Tree' }]),
      (error) => error.translationKey === 'export.errorDownload',
    );
  });

  i18n.setLanguage('es');
});

test('manual height rows keep numeric values and blank inapplicable measurements', async () => {
  await withDownloadMocks(async (download) => {
    i18n.setLanguage('en');
    exportMeasurementsToCsv([{
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
    const records = parseCsv(new TextDecoder('utf-8', { ignoreBOM: true })
      .decode(await download.blob.arrayBuffer()).slice(1));
    const row = Object.fromEntries(records[0].map((header, index) => [header, records[1][index]]));

    assert.equal(row['Species IFN code'], '21');
    assert.equal(row['Scientific name'], 'Pinus sylvestris');
    assert.equal(row['Common name'], 'Pino silvestre');
    assert.equal(row['Height source'], 'Enter a known height');
    assert.equal(row['Estimated tree height (m)'], '12.5');
    assert.equal(row['Entered distance (m)'], '');
    assert.equal(row['Clinometer (%)'], '');
    assert.equal(row['Terrain slope (%)'], '');
    assert.equal(row['Instrument height (m)'], '');
    assert.equal(row.Latitude, '40.1');
    assert.equal(row.Longitude, '-3.2');
  });

  i18n.setLanguage('es');
});
