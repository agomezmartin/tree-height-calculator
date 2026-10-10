import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

test('el formulario guarda mediciones con y sin GPS, conserva y permite actualizar coordenadas', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const dom = new JSDOM(html, { url: 'https://example.test/' });
  const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  let initialGpsRequest;
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.localStorage = dom.window.localStorage;
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      geolocation: {
        getCurrentPosition(_success, error, options) {
          initialGpsRequest = options;
          error({ code: 1 });
        },
      },
    },
  });

  try {
    await import(`../js/app.js?integration=${Date.now()}`);
    const { document } = dom.window;
    assert.deepEqual(initialGpsRequest, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
    const setRequiredMeasurements = () => {
      document.getElementById('distance').value = '20';
      document.getElementById('clinometerPercent').value = '80';
      document.getElementById('terrainSlopePercent').value = '0';
      document.getElementById('observerHeight').value = '1.7';
    };
    const getSavedMeasurements = () => JSON.parse(localStorage.getItem('treeMeasurements'));
    const saveButton = document.getElementById('saveButton');
    const calculateButton = document.getElementById('calculateButton');
    const calculateManualButton = document.getElementById('calculateManualButton');
    const measurementTypeFieldset = document.querySelector('input[name="measurementType"]').closest('fieldset');
    const treeFieldset = document.querySelector('fieldset > legend[data-i18n="tree.section"]').parentElement;
    assert.equal(measurementTypeFieldset.nextElementSibling, treeFieldset);
    assert.equal(treeFieldset.hidden, false);
    assert.equal(calculateButton.hidden, false);
    assert.equal(calculateManualButton.hidden, true);

    setRequiredMeasurements();
    document.getElementById('treeId').value = 'Sin GPS';
    saveButton.click();
    let measurements = getSavedMeasurements();
    assert.equal(measurements.length, 1);
    assert.equal(measurements[0].latitude, null);
    assert.equal(measurements[0].longitude, null);
    assert.ok(Math.abs(measurements[0].estimatedHeight - 17.7) < 1e-9);
    const noGpsCells = [...document.querySelector('#measurementTableBody tr').cells];
    assert.equal(noGpsCells[9].textContent, '—');
    assert.equal(noGpsCells[10].textContent, '—');

    setRequiredMeasurements();
    document.getElementById('treeId').value = 'Con GPS';
    document.getElementById('latitude').value = '40,123456789';
    document.getElementById('longitude').value = '-3,987654321';
    saveButton.click();
    measurements = getSavedMeasurements();
    const withGps = measurements.find((entry) => entry.treeId === 'Con GPS');
    assert.equal(withGps.latitude, 40.123456789);
    assert.equal(withGps.longitude, -3.987654321);
    const gpsRow = [...document.querySelectorAll('#measurementTableBody tr')]
      .find((row) => row.cells[0].textContent === 'Con GPS');
    assert.equal(gpsRow.cells[1].textContent, 'Calcular con clinómetro');
    assert.equal(gpsRow.cells[9].textContent, '40,123456789');
    assert.equal(gpsRow.cells[10].textContent, '-3,987654321');

    document.querySelector(`[data-action="edit"][data-id="${withGps.id}"]`).click();
    document.getElementById('notes').value = 'Notas editadas';
    saveButton.click();
    measurements = getSavedMeasurements();
    const edited = measurements.find((entry) => entry.id === withGps.id);
    assert.equal(edited.latitude, 40.123456789);
    assert.equal(edited.longitude, -3.987654321);
    assert.equal(edited.notes, 'Notas editadas');
    const editedRow = [...document.querySelectorAll('#measurementTableBody tr')]
      .find((row) => row.cells[0].textContent === 'Con GPS');
    assert.equal(editedRow.cells[9].textContent, '40,123456789');
    assert.equal(editedRow.cells[10].textContent, '-3,987654321');

    document.querySelector(`[data-action="edit"][data-id="${withGps.id}"]`).click();
    document.getElementById('latitude').value = '0';
    document.getElementById('longitude').value = '0';
    saveButton.click();
    measurements = getSavedMeasurements();
    assert.equal(measurements.find((entry) => entry.id === withGps.id).latitude, 0);
    assert.equal(measurements.find((entry) => entry.id === withGps.id).longitude, 0);

    document.querySelector(`[data-action="edit"][data-id="${withGps.id}"]`).click();
    document.getElementById('longitude').value = '';
    const countBeforeInvalidSave = getSavedMeasurements().length;
    saveButton.click();
    assert.equal(getSavedMeasurements().length, countBeforeInvalidSave);
    assert.match(document.getElementById('formError').textContent, /tanto la latitud como la longitud/);
    document.getElementById('measurementForm').dispatchEvent(
      new dom.window.Event('submit', { bubbles: true, cancelable: true }),
    );
    assert.equal(document.getElementById('treeHeightResult').textContent, '17,70 m');

    document.querySelector(`[data-action="edit"][data-id="${withGps.id}"]`).click();
    document.getElementById('latitude').value = '';
    document.getElementById('longitude').value = '';
    saveButton.click();
    const cleared = getSavedMeasurements().find((entry) => entry.id === withGps.id);
    assert.equal(cleared.latitude, null);
    assert.equal(cleared.longitude, null);

    document.querySelector(`[data-action="edit"][data-id="${withGps.id}"]`).click();
    const confirmationMessages = [];
    dom.window.confirm = (message) => {
      confirmationMessages.push(message);
      return false;
    };
    document.querySelector(`[data-action="delete"][data-id="${withGps.id}"]`).click();
    assert.equal(getSavedMeasurements().some((entry) => entry.id === withGps.id), true);
    assert.match(confirmationMessages[0], /Con GPS/);

    dom.window.confirm = (message) => {
      confirmationMessages.push(message);
      return true;
    };
    document.querySelector(`[data-action="delete"][data-id="${withGps.id}"]`).click();
    assert.equal(getSavedMeasurements().some((entry) => entry.id === withGps.id), false);
    assert.equal(confirmationMessages.length, 2);

    const languageSelect = document.getElementById('languageSelect');
    languageSelect.value = 'en';
    languageSelect.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    assert.equal(document.documentElement.lang, 'en');
    assert.equal(document.querySelector('h1').textContent, 'Tree Height Calculator');
    assert.equal(document.querySelector('#treeHeightResult').textContent, '17.70 m');
    assert.equal(document.querySelector('#measurementTableBody tr').cells[3].textContent, 'Horizontal distance');
    assert.match(document.getElementById('locationStatus').textContent, /Location permission was denied/);
    assert.equal(document.getElementById('treeId').value, 'Con GPS');

    languageSelect.value = 'es';
    languageSelect.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    document.querySelector('input[name="measurementType"][value="manual"]').click();
    assert.equal(treeFieldset.hidden, false);
    assert.equal(calculateButton.hidden, true);
    assert.equal(calculateManualButton.hidden, false);
    assert.equal(calculateManualButton.textContent, 'Mostrar altura introducida');
    document.getElementById('manualHeight').value = '12,5';
    document.getElementById('treeId').value = 'Manual';
    calculateManualButton.click();
    assert.equal(document.getElementById('treeHeightResult').textContent, '12,50 m');
    assert.equal(document.querySelector('#resultSummary dd').textContent, '12,50 m');
    assert.equal(
      document.getElementById('formulaExplanation').textContent,
      'Altura introducida directamente por el usuario; no se han realizado mediciones con clinómetro.',
    );

    languageSelect.value = 'en';
    languageSelect.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    assert.equal(calculateManualButton.textContent, 'Show entered height');
    calculateManualButton.click();
    assert.equal(document.getElementById('treeHeightResult').textContent, '12.50 m');
    assert.equal(document.querySelector('#resultSummary dd').textContent, '12.50 m');
    languageSelect.value = 'es';
    languageSelect.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    saveButton.click();
    const manual = getSavedMeasurements().find((entry) => entry.treeId === 'Manual');
    assert.equal(manual.measurementType, 'manual');
    assert.equal(manual.estimatedHeight, 12.5);
    assert.equal(manual.method, null);
    assert.equal(manual.distance, null);
    assert.equal(manual.clinometerPercent, null);
    assert.equal(manual.terrainSlopePercent, null);
    assert.equal(manual.observerHeight, null);

    const manualRow = [...document.querySelectorAll('#measurementTableBody tr')]
      .find((row) => row.cells[0].textContent === 'Manual');
    assert.equal(manualRow.cells[1].textContent, 'Introducir altura conocida');
    assert.equal(manualRow.cells[3].textContent, '—');
    assert.equal(manualRow.cells[4].textContent, '—');
    assert.equal(manualRow.cells[5].textContent, '—');
    assert.equal(manualRow.cells[8].textContent, '12,50 m');

    document.querySelector(`[data-action="edit"][data-id="${manual.id}"]`).click();
    assert.equal(document.querySelector('input[name="measurementType"][value="manual"]').checked, true);
    assert.equal(document.getElementById('manualHeight').value, '12.5');
    document.getElementById('manualHeight').value = '-1';
    saveButton.click();
    assert.equal(getSavedMeasurements().find((entry) => entry.id === manual.id).estimatedHeight, 12.5);
    assert.match(document.getElementById('formError').textContent, /mayor que 0/);

    document.getElementById('manualHeight').value = '';
    saveButton.click();
    assert.equal(getSavedMeasurements().find((entry) => entry.id === manual.id).estimatedHeight, 12.5);
    assert.match(document.getElementById('formError').textContent, /altura válida/);

    document.getElementById('manualHeight').value = '13';
    saveButton.click();
    assert.equal(getSavedMeasurements().find((entry) => entry.id === manual.id).estimatedHeight, 13);

    const restoredRows = JSON.parse(localStorage.getItem('treeMeasurements'));
    assert.equal(restoredRows.find((entry) => entry.id === manual.id).measurementType, 'manual');
  } finally {
    dom.window.close();
    delete globalThis.window;
    delete globalThis.document;
    delete globalThis.localStorage;
    if (previousNavigator) {
      Object.defineProperty(globalThis, 'navigator', previousNavigator);
    } else {
      delete globalThis.navigator;
    }
  }
});
