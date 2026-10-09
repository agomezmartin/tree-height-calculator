import { parseNumericInput } from './calculator.js';
import { setLocalizedText, t } from './i18n.js';

export const GPS_OPTIONS = Object.freeze({
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0,
});

export const DEFAULT_MAP_VIEW = Object.freeze([20, 0]);

function localizedError(key) {
  return Object.assign(new Error(t(key)), { translationKey: key });
}

export function validateCoordinates({ latitude, longitude }) {
  const latitudeMissing = latitude === null || latitude === undefined || String(latitude).trim() === '';
  const longitudeMissing = longitude === null || longitude === undefined || String(longitude).trim() === '';

  if (latitudeMissing && longitudeMissing) {
    return { latitude: null, longitude: null };
  }

  if (latitudeMissing || longitudeMissing) {
    throw localizedError('gps.coordinatesPairRequired');
  }

  const parsedLatitude = parseNumericInput(latitude);
  const parsedLongitude = parseNumericInput(longitude);

  if (!Number.isFinite(parsedLatitude) || parsedLatitude < -90 || parsedLatitude > 90) {
    throw localizedError('gps.invalidLatitude');
  }

  if (!Number.isFinite(parsedLongitude) || parsedLongitude < -180 || parsedLongitude > 180) {
    throw localizedError('gps.invalidLongitude');
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
    throw localizedError('gps.mapUnavailable');
  }

  const map = leaflet.map(element, { scrollWheelZoom: false, zoomControl: false }).setView(DEFAULT_MAP_VIEW, 2);
  const zoomControl = leaflet.control.zoom({
    zoomInTitle: t('gps.zoomIn'),
    zoomOutTitle: t('gps.zoomOut'),
  }).addTo(map);
  const attribution = () => (
    `&copy; <a href="https://www.openstreetmap.org/copyright">${t('gps.osmContributors')}</a>`
  );
  const tileLayer = leaflet
    .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: attribution(),
    })
    .on('tileerror', () => {
      onMapError('gps.tileError');
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
    } catch (error) {
      onMapError(error.translationKey ?? 'message.genericError');
    }
  };

  latitudeInput.addEventListener('change', handleFieldChange);
  longitudeInput.addEventListener('change', handleFieldChange);

  return {
    map,
    setCoordinates,
    setLanguage() {
      const zoomButtons = zoomControl.getContainer();
      zoomButtons.querySelector('.leaflet-control-zoom-in').title = t('gps.zoomIn');
      zoomButtons.querySelector('.leaflet-control-zoom-out').title = t('gps.zoomOut');
      map.attributionControl.removeAttribution(tileLayer.options.attribution);
      tileLayer.options.attribution = attribution();
      map.attributionControl.addAttribution(tileLayer.options.attribution);
    },
  };
}

function getPositionErrorKey(error) {
  switch (error?.code) {
    case 1:
      return 'gps.permissionDenied';
    case 2:
      return 'gps.positionUnavailable';
    case 3:
      return 'gps.timeout';
    default:
      return 'gps.unexpectedError';
  }
}

export function captureGpsCoordinates(geolocation) {
  if (!geolocation || typeof geolocation.getCurrentPosition !== 'function') {
    return Promise.reject(localizedError('gps.unsupported'));
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
      (error) => {
        const key = getPositionErrorKey(error);
        reject(Object.assign(new Error(t(key)), { translationKey: key }));
      },
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
  setLocalizedText(status, 'gps.initialLoading');
  status.dataset.state = 'loading';

  try {
    const coordinates = await captureGpsCoordinates(geolocation);

    if (!shouldApply()) {
      setLocalizedText(status, 'gps.initialNotApplied');
      status.dataset.state = 'success';
      return null;
    }

    latitudeInput.value = String(coordinates.latitude);
    longitudeInput.value = String(coordinates.longitude);
    onCoordinates(coordinates);
    setLocalizedText(status, 'gps.initialSuccess');
    status.dataset.state = 'success';
    return coordinates;
  } catch (error) {
    setLocalizedText(status, 'gps.initialFailure', {
      error: error.translationKey
        ? { key: error.translationKey }
        : { fallback: error.message },
    });
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
    setLocalizedText(button, 'gps.loading');
    setLocalizedText(status, 'gps.requesting');
    status.dataset.state = 'loading';

    try {
      const coordinates = await captureGpsCoordinates(geolocation);
      latitudeInput.value = String(coordinates.latitude);
      longitudeInput.value = String(coordinates.longitude);
      onCoordinates(coordinates);
      setLocalizedText(status, 'gps.captured');
      status.dataset.state = 'success';
    } catch (error) {
      if (error.translationKey) {
        setLocalizedText(status, error.translationKey);
      } else {
        status.textContent = error.message;
      }
      status.dataset.state = 'error';
    } finally {
      button.disabled = false;
      setLocalizedText(button, 'gps.getLocation');
    }
  };

  button.addEventListener('click', handleCapture);
  return handleCapture;
}
