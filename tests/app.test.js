import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

test('el formulario guarda mediciones con y sin GPS, conserva y permite actualizar coordenadas', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const dom = new JSDOM(html, { url: 'https://example.test/' });
  const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.localStorage = dom.window.localStorage;
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: dom.window.navigator,
  });

  try {
    await import(`../js/app.js?integration=${Date.now()}`);
    const { document } = dom.window;
    const setRequiredMeasurements = () => {
      document.getElementById('distance').value = '20';
      document.getElementById('clinometerPercent').value = '80';
      document.getElementById('terrainSlopePercent').value = '0';
      document.getElementById('observerHeight').value = '1.7';
    };
    const getSavedMeasurements = () => JSON.parse(localStorage.getItem('treeMeasurements'));
    const saveButton = document.getElementById('saveButton');

    setRequiredMeasurements();
    document.getElementById('treeId').value = 'Sin GPS';
    saveButton.click();
    let measurements = getSavedMeasurements();
    assert.equal(measurements.length, 1);
    assert.equal(measurements[0].latitude, null);
    assert.equal(measurements[0].longitude, null);
    assert.ok(Math.abs(measurements[0].estimatedHeight - 17.7) < 1e-9);

    setRequiredMeasurements();
    document.getElementById('treeId').value = 'Con GPS';
    document.getElementById('latitude').value = '40,123456789';
    document.getElementById('longitude').value = '-3,987654321';
    saveButton.click();
    measurements = getSavedMeasurements();
    const withGps = measurements.find((entry) => entry.treeId === 'Con GPS');
    assert.equal(withGps.latitude, 40.123456789);
    assert.equal(withGps.longitude, -3.987654321);

    document.querySelector(`[data-action="edit"][data-id="${withGps.id}"]`).click();
    document.getElementById('notes').value = 'Notas editadas';
    saveButton.click();
    measurements = getSavedMeasurements();
    const edited = measurements.find((entry) => entry.id === withGps.id);
    assert.equal(edited.latitude, 40.123456789);
    assert.equal(edited.longitude, -3.987654321);
    assert.equal(edited.notes, 'Notas editadas');

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
    document.querySelector(`[data-action="delete"][data-id="${withGps.id}"]`).click();
    assert.equal(getSavedMeasurements().some((entry) => entry.id === withGps.id), false);
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
