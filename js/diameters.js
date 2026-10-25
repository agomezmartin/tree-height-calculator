import { parseNumericInput } from './calculator.js';

function createValidationError(translationKey) {
  const error = new Error(translationKey);
  error.translationKey = translationKey;
  return error;
}

export function validateTrunkDiameters(values) {
  const diameters = [];

  for (const value of values) {
    if (value === null || value === undefined || String(value).trim() === '') {
      continue;
    }

    const diameter = parseNumericInput(value);
    if (!Number.isFinite(diameter)) {
      throw createValidationError('validation.dap');
    }
    if (diameter <= 0) {
      throw createValidationError('validation.dapPositive');
    }
    diameters.push(diameter);
  }

  return diameters;
}
