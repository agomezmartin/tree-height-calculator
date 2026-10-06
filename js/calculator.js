export const DISTANCE_METHODS = {
  HORIZONTAL: 'horizontal',
  SLOPE: 'slope',
};

export function parseNumericInput(value) {
  if (value === null || value === undefined || value === '') {
    return Number.NaN;
  }

  const raw = String(value).trim();
  if (raw === '') {
    return Number.NaN;
  }

  const normalized = raw
    .replace(/\s+/g, '')
    .replace(/\./g, (match, offset, original) => {
      const lastComma = original.lastIndexOf(',');
      const lastDot = original.lastIndexOf('.');
      if (lastComma > lastDot) {
        return '';
      }
      return match;
    })
    .replace(/,/g, '.');

  return Number(normalized);
}

export function convertPercentToRadians(percent) {
  return Math.atan(parseNumericInput(percent) / 100);
}

export function convertPercentToDegrees(percent) {
  return (Math.atan(parseNumericInput(percent) / 100) * 180) / Math.PI;
}

export function validateMeasurement({
  method,
  distance,
  clinometerPercent,
  terrainSlopePercent,
  observerHeight,
}) {
  const selectedMethod = method === DISTANCE_METHODS.HORIZONTAL || method === DISTANCE_METHODS.SLOPE
    ? method
    : null;

  if (!selectedMethod) {
    throw new Error('Selecciona un método de medición: distancia horizontal o distancia sobre el terreno.');
  }

  const numericDistance = parseNumericInput(distance);
  if (!Number.isFinite(numericDistance) || numericDistance <= 0) {
    throw new Error('La distancia debe ser un número mayor que 0 y estar expresada en metros.');
  }

  const numericClinometer = parseNumericInput(clinometerPercent);
  if (!Number.isFinite(numericClinometer)) {
    throw new Error('La lectura del clinómetro debe ser un valor numérico válido.');
  }

  const numericSlope = parseNumericInput(terrainSlopePercent);
  if (!Number.isFinite(numericSlope)) {
    throw new Error('La pendiente del terreno debe ser un valor numérico válido.');
  }

  const numericObserverHeight = parseNumericInput(observerHeight);
  if (!Number.isFinite(numericObserverHeight) || numericObserverHeight < 0) {
    throw new Error('La altura del instrumento debe ser un número mayor o igual a 0.');
  }

  return {
    method: selectedMethod,
    distance: numericDistance,
    clinometerPercent: numericClinometer,
    terrainSlopePercent: numericSlope,
    observerHeight: numericObserverHeight,
  };
}

export function calculateHorizontalDistance({ method, distance, terrainSlopePercent = 0 }) {
  const numericDistance = parseNumericInput(distance);
  if (!Number.isFinite(numericDistance) || numericDistance <= 0) {
    throw new Error('La distancia debe ser un número mayor que 0 para calcular la proyección horizontal.');
  }

  const numericSlope = parseNumericInput(terrainSlopePercent);
  if (!Number.isFinite(numericSlope)) {
    throw new Error('La pendiente del terreno debe ser un número válido.');
  }

  if (method === DISTANCE_METHODS.HORIZONTAL) {
    return numericDistance;
  }

  if (method === DISTANCE_METHODS.SLOPE) {
    return numericDistance * Math.cos(convertPercentToRadians(numericSlope));
  }

  throw new Error('Método de medición no soportado.');
}

export function calculateTerrainElevationDifference(horizontalDistance, terrainSlopePercent) {
  const numericDistance = parseNumericInput(horizontalDistance);
  const numericSlope = parseNumericInput(terrainSlopePercent);

  if (!Number.isFinite(numericDistance) || numericDistance < 0) {
    throw new Error('La distancia horizontal debe ser un número válido.');
  }

  if (!Number.isFinite(numericSlope)) {
    throw new Error('La pendiente del terreno debe ser un número válido.');
  }

  return numericDistance * (numericSlope / 100);
}

export function calculateCrownElevation(horizontalDistance, clinometerPercent) {
  const numericDistance = parseNumericInput(horizontalDistance);
  const numericClinometer = parseNumericInput(clinometerPercent);

  if (!Number.isFinite(numericDistance) || numericDistance < 0) {
    throw new Error('La distancia horizontal debe ser un número válido.');
  }

  if (!Number.isFinite(numericClinometer)) {
    throw new Error('La lectura del clinómetro debe ser un número válido.');
  }

  return numericDistance * Math.tan(convertPercentToRadians(numericClinometer));
}

export function calculateTreeHeight({
  method,
  distance,
  clinometerPercent,
  terrainSlopePercent = 0,
  observerHeight,
}) {
  const validated = validateMeasurement({
    method,
    distance,
    clinometerPercent,
    terrainSlopePercent,
    observerHeight,
  });

  const horizontalDistance = calculateHorizontalDistance({
    method: validated.method,
    distance: validated.distance,
    terrainSlopePercent: validated.terrainSlopePercent,
  });

  const elevationDifference = calculateTerrainElevationDifference(
    horizontalDistance,
    validated.terrainSlopePercent,
  );

  const crownElevation = calculateCrownElevation(
    horizontalDistance,
    validated.clinometerPercent,
  );

  return validated.observerHeight + crownElevation - elevationDifference;
}
