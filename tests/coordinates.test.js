import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import {
  bindGpsCapture,
  captureGpsCoordinates,
  createCoordinateMap,
  DEFAULT_MAP_VIEW,
  GPS_OPTIONS,
  locateUserOnLoad,
  validateCoordinates,
} from '../js/coordinates.js';

test('validateCoordinates acepta valores decimales y respeta los límites geográficos', () => {
  assert.deepEqual(validateCoordinates({ latitude: '40,4168123', longitude: '-3,7037901' }), {
    latitude: 40.4168123,
    longitude: -3.7037901,
  });
  assert.deepEqual(validateCoordinates({ latitude: -90, longitude: 180 }), {
    latitude: -90,
    longitude: 180,
  });
  assert.deepEqual(validateCoordinates({ latitude: 90, longitude: -180 }), {
    latitude: 90,
    longitude: -180,
  });
  assert.deepEqual(validateCoordinates({ latitude: '0', longitude: '0' }), {
    latitude: 0,
    longitude: 0,
  });
  assert.deepEqual(validateCoordinates({ latitude: '', longitude: '' }), {
    latitude: null,
    longitude: null,
  });
});

test('validateCoordinates rechaza parejas parciales y valores inválidos', () => {
  for (const coordinates of [
    { latitude: 90.0001, longitude: 0 },
    { latitude: -90.0001, longitude: 0 },
    { latitude: 0, longitude: 180.0001 },
    { latitude: 0, longitude: -180.0001 },
    { latitude: 'norte', longitude: 0 },
    { latitude: Infinity, longitude: 0 },
    { latitude: Number.NaN, longitude: 0 },
    { latitude: 1, longitude: '' },
    { latitude: '', longitude: 1 },
  ]) {
    assert.throws(() => validateCoordinates(coordinates));
  }
});

test('captureGpsCoordinates solicita una captura puntual de alta precisión', async () => {
  let receivedOptions;
  const geolocation = {
    getCurrentPosition(success, _error, options) {
      receivedOptions = options;
      success({ coords: { latitude: 40.123456789, longitude: -3.987654321 } });
    },
  };

  assert.deepEqual(await captureGpsCoordinates(geolocation), {
    latitude: 40.123456789,
    longitude: -3.987654321,
  });
  assert.deepEqual(receivedOptions, GPS_OPTIONS);
});

test('captureGpsCoordinates informa API ausente, errores de permisos, señal y timeout', async () => {
  await assert.rejects(captureGpsCoordinates(undefined), /no ofrece geolocalización/);

  for (const [code, message] of [
    [1, /Se denegó el permiso/],
    [2, /No se pudo determinar la ubicación/],
    [3, /superó el tiempo de espera/],
    [99, /error al obtener la ubicación/],
  ]) {
    const geolocation = {
      getCurrentPosition(_success, error) {
        error({ code });
      },
    };
    await assert.rejects(captureGpsCoordinates(geolocation), message);
  }
});

test('captureGpsCoordinates rechaza coordenadas GPS fuera de rango', async () => {
  await assert.rejects(
    captureGpsCoordinates({
      getCurrentPosition(success) {
        success({ coords: { latitude: 91, longitude: 0 } });
      },
    }),
    /latitud debe ser un número/,
  );
});

test('la ubicación inicial centra el mapa y respeta cambios del usuario mientras espera', async () => {
  const dom = new JSDOM(`
    <button id="capture">Obtener ubicación GPS</button>
    <p id="status"></p>
    <input id="latitude">
    <input id="longitude">
  `);
  const button = dom.window.document.getElementById('capture');
  const status = dom.window.document.getElementById('status');
  const latitudeInput = dom.window.document.getElementById('latitude');
  const longitudeInput = dom.window.document.getElementById('longitude');
  const pendingRequests = [];
  const geolocation = {
    getCurrentPosition(success, error, options) {
      pendingRequests.push({ success, error, options });
    },
  };
  const centered = [];

  const locatePromise = locateUserOnLoad({
    button,
    status,
    latitudeInput,
    longitudeInput,
    geolocation,
    onCoordinates: (coordinates) => centered.push(coordinates),
  });

  assert.equal(button.disabled, true);
  assert.equal(status.dataset.state, 'loading');
  assert.match(status.textContent, /centrar el mapa/);
  assert.deepEqual(pendingRequests[0].options, GPS_OPTIONS);
  pendingRequests[0].success({ coords: { latitude: 40.123456789, longitude: -3.987654321 } });

  assert.deepEqual(await locatePromise, { latitude: 40.123456789, longitude: -3.987654321 });
  assert.equal(button.disabled, false);
  assert.equal(latitudeInput.value, '40.123456789');
  assert.equal(longitudeInput.value, '-3.987654321');
  assert.deepEqual(centered[0], { latitude: 40.123456789, longitude: -3.987654321 });
  assert.equal(status.dataset.state, 'success');

  latitudeInput.value = '41';
  longitudeInput.value = '-2';
  const unchangedLocation = await locateUserOnLoad({
    button,
    status,
    latitudeInput,
    longitudeInput,
    geolocation: {
      getCurrentPosition(success) {
        success({ coords: { latitude: 42, longitude: -1 } });
      },
    },
    shouldApply: () => false,
  });

  assert.equal(unchangedLocation, null);
  assert.equal(latitudeInput.value, '41');
  assert.equal(longitudeInput.value, '-2');
  assert.match(status.textContent, /No se aplicó la ubicación automática/);

  const unavailable = await locateUserOnLoad({
    button,
    status,
    latitudeInput,
    longitudeInput,
    geolocation: undefined,
  });
  assert.equal(unavailable, null);
  assert.equal(button.disabled, false);
  assert.match(status.textContent, /No se pudo centrar automáticamente/);
  dom.window.close();
});

test('el mapa coloca y arrastra el marcador y sincroniza los campos manuales', () => {
  const dom = new JSDOM('<input id="latitude"><input id="longitude"><div id="map"></div>');
  const latitudeInput = dom.window.document.getElementById('latitude');
  const longitudeInput = dom.window.document.getElementById('longitude');
  const mapHandlers = new Map();
  const markerHandlers = new Map();
  const mapCalls = { views: [], removed: [] };
  let tileErrorHandler;
  let marker;
  const map = {
    zoom: 2,
    setView(position, zoom) {
      mapCalls.views.push({ position, zoom });
      if (zoom !== undefined) this.zoom = zoom;
      return this;
    },
    getZoom() {
      return this.zoom;
    },
    on(event, handler) {
      mapHandlers.set(event, handler);
      return this;
    },
    removeLayer(layer) {
      mapCalls.removed.push(layer);
    },
  };
  const leaflet = {
    map: (_element, options) => {
      assert.deepEqual(options, { scrollWheelZoom: false, zoomControl: false });
      return map;
    },
    control: {
      zoom(options) {
        assert.deepEqual(options, { zoomInTitle: 'Acercar mapa', zoomOutTitle: 'Alejar mapa' });
        return {
          addTo(target) {
            assert.equal(target, map);
          },
        };
      },
    },
    tileLayer: (url, options) => ({
      on(event, handler) {
        assert.equal(event, 'tileerror');
        tileErrorHandler = handler;
        return this;
      },
      addTo(target) {
        assert.equal(target, map);
        assert.match(url, /openstreetmap\.org/);
        assert.match(options.attribution, /OpenStreetMap/);
      },
    }),
    marker: (position, options) => {
      marker = {
        position,
        options,
        addTo(target) {
          assert.equal(target, map);
          return this;
        },
        on(event, handler) {
          markerHandlers.set(event, handler);
          return this;
        },
        setLatLng(nextPosition) {
          this.position = nextPosition;
          return this;
        },
        getLatLng() {
          return { lat: this.position[0], lng: this.position[1] };
        },
      };
      return marker;
    },
  };
  const selected = [];
  const mapErrors = [];

  const controller = createCoordinateMap({
    element: dom.window.document.getElementById('map'),
    leaflet,
    latitudeInput,
    longitudeInput,
    onSelect: (coordinates) => selected.push(coordinates),
    onMapError: (message) => mapErrors.push(message),
  });

  assert.deepEqual(mapCalls.views[0], { position: DEFAULT_MAP_VIEW, zoom: 2 });
  tileErrorHandler();
  assert.equal(mapErrors[0], 'gps.tileError');
  mapHandlers.get('click')({ latlng: { lat: 40.123456789, lng: -3.987654321 } });
  assert.equal(latitudeInput.value, '40.123456789');
  assert.equal(longitudeInput.value, '-3.987654321');
  assert.deepEqual(marker.options, { draggable: true });
  assert.deepEqual(selected[0], { latitude: 40.123456789, longitude: -3.987654321 });

  marker.position = [40.5, -3.5];
  markerHandlers.get('dragend')();
  assert.equal(latitudeInput.value, '40.5');
  assert.equal(longitudeInput.value, '-3.5');
  assert.deepEqual(selected[1], { latitude: 40.5, longitude: -3.5 });

  latitudeInput.value = '41,25';
  longitudeInput.value = '-2,5';
  latitudeInput.dispatchEvent(new dom.window.Event('change'));
  assert.deepEqual(marker.position, [41.25, -2.5]);
  assert.deepEqual(mapCalls.views.at(-1), { position: [41.25, -2.5], zoom: 15 });

  latitudeInput.value = '';
  longitudeInput.value = '';
  longitudeInput.dispatchEvent(new dom.window.Event('change'));
  assert.deepEqual(mapCalls.removed, [marker]);
  assert.deepEqual(controller.setCoordinates({ latitude: null, longitude: null }), {
    latitude: null,
    longitude: null,
  });
  dom.window.close();
});

test('el mapa informa si Leaflet no está disponible', () => {
  assert.throws(
    () => createCoordinateMap({ leaflet: null }),
    /No se pudo cargar el mapa/,
  );
});

test('el botón GPS muestra carga, evita duplicados y restablece el estado tras éxito o error', async () => {
  const dom = new JSDOM(`
    <button id="capture">Obtener ubicación GPS</button>
    <p id="status"></p>
    <input id="latitude">
    <input id="longitude">
  `);
  const button = dom.window.document.getElementById('capture');
  const status = dom.window.document.getElementById('status');
  const latitudeInput = dom.window.document.getElementById('latitude');
  const longitudeInput = dom.window.document.getElementById('longitude');
  const pendingRequests = [];
  let requests = 0;
  const geolocation = {
    getCurrentPosition(success, error) {
      requests += 1;
      pendingRequests.push({ success, error });
    },
  };

  const handleCapture = bindGpsCapture({
    button,
    status,
    latitudeInput,
    longitudeInput,
    geolocation,
  });

  button.click();
  assert.equal(button.disabled, true);
  assert.equal(status.dataset.state, 'loading');
  assert.equal(requests, 1);
  await handleCapture();
  assert.equal(requests, 1);

  pendingRequests[0].success({ coords: { latitude: 0, longitude: 0 } });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(latitudeInput.value, '0');
  assert.equal(longitudeInput.value, '0');
  assert.equal(status.dataset.state, 'success');
  assert.equal(button.disabled, false);
  assert.equal(button.textContent, 'Obtener ubicación GPS');

  button.click();
  pendingRequests[1].error({ code: 1 });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(status.dataset.state, 'error');
  assert.match(status.textContent, /Se denegó el permiso/);
  assert.equal(button.disabled, false);
});
