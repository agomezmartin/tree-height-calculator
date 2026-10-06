const STORAGE_KEY = 'treeMeasurements';

export function getMeasurements() {
  try {
    const rawValue = localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('No se pudieron recuperar las mediciones guardadas:', error);
    return [];
  }
}

export function saveMeasurements(measurements) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(measurements));
}

export function addMeasurement(measurement) {
  const current = getMeasurements();
  const next = [...current, measurement];
  saveMeasurements(next);
  return next;
}

export function updateMeasurementById(id, measurement) {
  const current = getMeasurements();
  const next = current.map((entry) => (entry.id === id ? { ...entry, ...measurement } : entry));
  saveMeasurements(next);
  return next;
}

export function deleteMeasurementById(id) {
  const current = getMeasurements();
  const next = current.filter((entry) => entry.id !== id);
  saveMeasurements(next);
  return next;
}
