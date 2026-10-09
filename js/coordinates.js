import { parseNumericInput } from './calculator.js';

export const GPS_OPTIONS = Object.freeze({
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0,
});

export const DEFAULT_MAP_VIEW = Object.freeze([20, 0]);

export function validateCoordinates({ latitude, longitude }) {
  const latitudeMissing = latitude === null || latitude === undefined || String(latitude).trim() === '';
  const longitudeMissing = longitude === null || longitude === undefined || String(longitude).trim() === '';

  if (latitudeMissing && longitudeMissing) {
    return { latitude: null, longitude: null };
  }

  if (latitudeMissing || longitudeMissing) {
    throw new Error('Introduce tanto la latitud como la longitud, o deja ambos campos vacíos.');
  }

  const parsedLatitude = parseNumericInput(latitude);
  const parsedLongitude = parseNumericInput(longitude);

  if (!Number.isFinite(parsedLatitude) || parsedLatitude < -90 || parsedLatitude > 90) {
    throw new Error('La latitud debe ser un número entre -90 y 90 grados decimales.');
  }

  if (!Number.isFinite(parsedLongitude) || parsedLongitude < -180 || parsedLongitude > 180) {
    throw new Error('La longitud debe ser un número entre -180 y 180 grados decimales.');
  }

  return { latitude: parsedLatitude, longitude: parsedLongitude };
}

export function createCoordinateMap({
  element,
  leaflet,
  latitudeInput,
  longitudeInput,
  onSelect = () => {},
  onMapError = () => {},
}) {
  if (!leaflet?.map || !leaflet?.tileLayer || !leaflet?.marker || !leaflet?.control?.zoom) {
    throw new Error('No se pudo cargar el mapa. Puedes seguir usando el GPS o introducir las coordenadas manualmente.');
  }

  const map = leaflet.map(element, { scrollWheelZoom: false, zoomControl: false }).setView(DEFAULT_MAP_VIEW, 2);
  leaflet.control.zoom({
    zoomInTitle: 'Acercar mapa',
    zoomOutTitle: 'Alejar mapa',
  }).addTo(map);
  leaflet
    .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    })
    .on('tileerror', () => {
      onMapError('No se pudieron cargar algunas teselas del mapa. Comprueba la conexión o continúa con las coordenadas manuales.');
    })
    .addTo(map);

  let selectedMarker = null;

  const setCoordinates = (coordinates, { center = true } = {}) => {
    const validated = validateCoordinates(coordinates);

    if (validated.latitude === null) {
      if (selectedMarker) {
        map.removeLayer(selectedMarker);
        selectedMarker = null;
      }
      return validated;
    }

    const position = [validated.latitude, validated.longitude];
    latitudeInput.value = String(validated.latitude);
    longitudeInput.value = String(validated.longitude);

    if (selectedMarker) {
      selectedMarker.setLatLng(position);
    } else {
      selectedMarker = leaflet.marker(position, { draggable: true }).addTo(map);
      selectedMarker.on('dragend', () => {
        const markerPosition = selectedMarker.getLatLng();
        const nextCoordinates = validateCoordinates({
          latitude: markerPosition.lat,
          longitude: markerPosition.lng,
        });
        latitudeInput.value = String(nextCoordinates.latitude);
        longitudeInput.value = String(nextCoordinates.longitude);
        onSelect(nextCoordinates);
      });
    }

    if (center) {
      map.setView(position, Math.max(map.getZoom(), 15));
    }

    return validated;
  };

  map.on('click', (event) => {
    const coordinates = setCoordinates({
      latitude: event.latlng.lat,
      longitude: event.latlng.lng,
    }, { center: false });
    onSelect(coordinates);
  });

  const handleFieldChange = () => {
    try {
      const coordinates = validateCoordinates({
        latitude: latitudeInput.value,
        longitude: longitudeInput.value,
      });
      setCoordinates(coordinates, { center: coordinates.latitude !== null });
    } catch {
      return;
    }
  };

  latitudeInput.addEventListener('change', handleFieldChange);
  longitudeInput.addEventListener('change', handleFieldChange);

  return {
    map,
    setCoordinates,
  };
}

function getPositionErrorMessage(error) {
  switch (error?.code) {
    case 1:
      return 'Se denegó el permiso de ubicación. Puedes guardar la medición sin coordenadas o habilitar el permiso en el navegador.';
    case 2:
      return 'No se pudo determinar la ubicación. Comprueba la señal GPS e inténtalo de nuevo.';
    case 3:
      return 'La solicitud de ubicación superó el tiempo de espera. Inténtalo de nuevo.';
    default:
      return 'Se produjo un error al obtener la ubicación. Puedes guardar la medición sin coordenadas.';
  }
}

export function captureGpsCoordinates(geolocation) {
  if (!geolocation || typeof geolocation.getCurrentPosition !== 'function') {
    return Promise.reject(
      new Error('Este navegador no ofrece geolocalización. Puedes introducir las coordenadas manualmente o guardar sin ellas.'),
    );
  }

  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(
      (position) => {
        try {
          resolve(validateCoordinates({
            latitude: position?.coords?.latitude,
            longitude: position?.coords?.longitude,
          }));
        } catch (error) {
          reject(error);
        }
      },
      (error) => reject(new Error(getPositionErrorMessage(error))),
      GPS_OPTIONS,
    );
  });
}

export async function locateUserOnLoad({
  button,
  status,
  latitudeInput,
  longitudeInput,
  geolocation,
  onCoordinates = () => {},
  shouldApply = () => true,
}) {
  button.disabled = true;
  status.textContent = 'Buscando tu ubicación para centrar el mapa…';
  status.dataset.state = 'loading';

  try {
    const coordinates = await captureGpsCoordinates(geolocation);

    if (!shouldApply()) {
      status.textContent = 'No se aplicó la ubicación automática porque ya modificaste o guardaste la localización.';
      status.dataset.state = 'success';
      return null;
    }

    latitudeInput.value = String(coordinates.latitude);
    longitudeInput.value = String(coordinates.longitude);
    onCoordinates(coordinates);
    status.textContent = 'Mapa centrado en tu ubicación. Puedes ajustar el punto antes de guardar.';
    status.dataset.state = 'success';
    return coordinates;
  } catch (error) {
    status.textContent = `No se pudo centrar automáticamente. ${error.message} Puedes intentarlo con el botón GPS.`;
    status.dataset.state = 'error';
    return null;
  } finally {
    button.disabled = false;
  }
}

export function bindGpsCapture({
  button,
  status,
  latitudeInput,
  longitudeInput,
  geolocation,
  onCoordinates = () => {},
}) {
  const handleCapture = async () => {
    if (button.disabled) {
      return;
    }

    button.disabled = true;
    button.textContent = 'Obteniendo ubicación...';
    status.textContent = 'Solicitando la ubicación al dispositivo…';
    status.dataset.state = 'loading';

    try {
      const coordinates = await captureGpsCoordinates(geolocation);
      latitudeInput.value = String(coordinates.latitude);
      longitudeInput.value = String(coordinates.longitude);
      onCoordinates(coordinates);
      status.textContent = 'Ubicación capturada. Revisa las coordenadas antes de guardar.';
      status.dataset.state = 'success';
    } catch (error) {
      status.textContent = error.message;
      status.dataset.state = 'error';
    } finally {
      button.disabled = false;
      button.textContent = 'Obtener ubicación GPS';
    }
  };

  button.addEventListener('click', handleCapture);
  return handleCapture;
}
