export const DISTANCE_METHODS = {
  HORIZONTAL: 'horizontal',
  SLOPE: 'slope',
};

function createValidationError(translationKey) {
  const error = new Error(translationKey);
  error.translationKey = translationKey;
  return error;
}

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

export function validateManualHeight(value) {
  const height = parseNumericInput(value);
  if (!Number.isFinite(height)) {
    throw createValidationError('validation.manualHeight');
  }
  if (height <= 0) {
    throw createValidationError('validation.manualHeightPositive');
  }
  return height;
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
    throw createValidationError('validation.distanceMethod');
  }

  const numericDistance = parseNumericInput(distance);
  if (!Number.isFinite(numericDistance) || numericDistance <= 0) {
    throw createValidationError('validation.distance');
  }

  const numericClinometer = parseNumericInput(clinometerPercent);
  if (!Number.isFinite(numericClinometer)) {
    throw createValidationError('validation.clinometer');
  }

  const numericSlope = parseNumericInput(terrainSlopePercent);
  if (!Number.isFinite(numericSlope)) {
    throw createValidationError('validation.slope');
  }

  const numericObserverHeight = parseNumericInput(observerHeight);
  if (!Number.isFinite(numericObserverHeight) || numericObserverHeight < 0) {
    throw createValidationError('validation.observerHeight');
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
    throw createValidationError('validation.horizontalDistancePositive');
  }

  const numericSlope = parseNumericInput(terrainSlopePercent);
  if (!Number.isFinite(numericSlope)) {
    throw createValidationError('validation.slopeValid');
  }

  if (method === DISTANCE_METHODS.HORIZONTAL) {
    return numericDistance;
  }

  if (method === DISTANCE_METHODS.SLOPE) {
    return numericDistance * Math.cos(convertPercentToRadians(numericSlope));
  }

  throw createValidationError('validation.methodUnsupported');
}

export function calculateTerrainElevationDifference(horizontalDistance, terrainSlopePercent) {
  const numericDistance = parseNumericInput(horizontalDistance);
  const numericSlope = parseNumericInput(terrainSlopePercent);

  if (!Number.isFinite(numericDistance) || numericDistance < 0) {
    throw createValidationError('validation.horizontalDistance');
  }

  if (!Number.isFinite(numericSlope)) {
    throw createValidationError('validation.slopeValid');
  }

  return numericDistance * (numericSlope / 100);
}

export function calculateCrownElevation(horizontalDistance, clinometerPercent) {
  const numericDistance = parseNumericInput(horizontalDistance);
  const numericClinometer = parseNumericInput(clinometerPercent);

  if (!Number.isFinite(numericDistance) || numericDistance < 0) {
    throw createValidationError('validation.horizontalDistance');
  }

  if (!Number.isFinite(numericClinometer)) {
    throw createValidationError('validation.clinometerValid');
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
