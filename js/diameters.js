function createValidationError(translationKey) {
  const error = new Error(translationKey);
  error.translationKey = translationKey;
  return error;
}

export function isPartialTrunkDiameter(value) {
  return /^\d*(?:[.,]\d*)?$/.test(String(value));
}

function parseTrunkDiameter(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const raw = String(value);
  if (!/^-?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(raw)) {
    throw createValidationError('validation.dap');
  }

  const diameter = Number(raw.replace(',', '.'));
  if (!Number.isFinite(diameter)) {
    throw createValidationError('validation.dap');
  }
  if (diameter <= 0) {
    throw createValidationError('validation.dapPositive');
  }

  return diameter;
}

export function validateTrunkDiameters(values) {
  const diameters = [];

  for (const value of values) {
    if (value === null || value === undefined || value === '') {
      continue;
    }

    diameters.push(parseTrunkDiameter(value));
  }

  return diameters;
}

export function validateStoredTrunkDiameter(value) {
  return parseTrunkDiameter(value);
}
