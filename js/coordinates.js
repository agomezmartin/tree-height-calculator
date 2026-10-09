import { parseNumericInput } from './calculator.js';

export const GPS_OPTIONS = Object.freeze({
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0,
});

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

export function bindGpsCapture({ button, status, latitudeInput, longitudeInput, geolocation }) {
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
