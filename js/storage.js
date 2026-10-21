const STORAGE_KEY = 'treeMeasurements';

function normalizeMeasurementEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return entry;
  }

  const nestedSpecies = entry.species && typeof entry.species === 'object' ? entry.species : {};
  const hasSpeciesMetadata = [
    'speciesIfnCode',
    'speciesScientificName',
    'speciesCommonName',
    'ifnCode',
    'species',
  ].some((key) => Object.prototype.hasOwnProperty.call(entry, key));

  const hasNestedSpeciesMetadata = Object.keys(nestedSpecies).length > 0;
  if (!hasSpeciesMetadata && !hasNestedSpeciesMetadata) {
    const { species, ...rest } = entry;
    return rest;
  }

  const ifnCodeValue = entry.speciesIfnCode ?? nestedSpecies.ifnCode ?? entry.ifnCode ?? null;
  const numericIfnCode = ifnCodeValue === null || ifnCodeValue === undefined || ifnCodeValue === ''
    ? null
    : Number(ifnCodeValue);

  const normalized = {
    ...entry,
    speciesIfnCode: Number.isFinite(numericIfnCode) ? numericIfnCode : null,
    speciesScientificName: entry.speciesScientificName ?? nestedSpecies.scientificName ?? null,
    speciesCommonName: entry.speciesCommonName ?? nestedSpecies.commonName ?? null,
  };

  delete normalized.species;
  return normalized;
}

export function getMeasurements() {
  try {
    const rawValue = localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed.map(normalizeMeasurementEntry) : [];
  } catch (error) {
    console.warn('No se pudieron recuperar las mediciones guardadas:', error);
    return [];
  }
}

export function saveMeasurements(measurements) {
  const normalized = Array.isArray(measurements) ? measurements.map(normalizeMeasurementEntry) : [];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
}

export function addMeasurement(measurement) {
  const current = getMeasurements();
  const next = [...current, normalizeMeasurementEntry(measurement)];
  saveMeasurements(next);
  return next;
}

export function updateMeasurementById(id, measurement) {
  const current = getMeasurements();
  const next = current.map((entry) => (entry.id === id ? normalizeMeasurementEntry({ ...entry, ...measurement }) : entry));
  saveMeasurements(next);
  return next;
}

export function deleteMeasurementById(id) {
  const current = getMeasurements();
  const next = current.filter((entry) => entry.id !== id);
  saveMeasurements(next);
  return next;
}
