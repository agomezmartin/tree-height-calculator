import speciesCatalogData from '../assets/species.json' with { type: 'json' };

function normalizeSpecies(species) {
  if (!species || typeof species !== 'object') {
    return null;
  }

  const ifnCode = Number(species.ifnCode);
  const scientificName = typeof species.scientificName === 'string'
    ? species.scientificName.trim()
    : '';
  const commonName = typeof species.commonName === 'string'
    ? species.commonName.trim()
    : '';

  if (!Number.isFinite(ifnCode) || scientificName === '') {
    return null;
  }

  return {
    ifnCode,
    scientificName,
    commonName: commonName || null,
    source: typeof species.source === 'string' ? species.source : null,
  };
}

export const SPECIES_CATALOG = Object.freeze(
  (Array.isArray(speciesCatalogData?.species) ? speciesCatalogData.species : [])
    .map(normalizeSpecies)
    .filter(Boolean),
);

export function getSpeciesCatalog() {
  return SPECIES_CATALOG;
}

export function findSpeciesByIfnCode(ifnCode) {
  const normalizedCode = Number(ifnCode);
  if (!Number.isFinite(normalizedCode)) {
    return null;
  }

  return SPECIES_CATALOG.find((species) => species.ifnCode === normalizedCode) ?? null;
}

export function getSpeciesDisplayName(species) {
  const normalized = normalizeSpecies(species);
  if (!normalized) {
    return '';
  }

  return normalized.commonName
    ? `${normalized.scientificName} — ${normalized.commonName}`
    : normalized.scientificName;
}

export function findSpeciesByDisplayName(displayName) {
  const normalizedValue = String(displayName ?? '').trim();
  if (!normalizedValue) {
    return null;
  }

  const normalizedComparison = normalizedValue.toLowerCase();
  return SPECIES_CATALOG.find((species) => {
    const display = getSpeciesDisplayName(species).toLowerCase();
    const scientific = species.scientificName.toLowerCase();
    const common = species.commonName ? species.commonName.toLowerCase() : '';
    return display === normalizedComparison
      || scientific === normalizedComparison
      || common === normalizedComparison;
  }) ?? null;
}

export function getSpeciesFromMeasurement(entry = {}) {
  const nestedSpecies = entry?.species && typeof entry.species === 'object' ? entry.species : {};
  const ifnCode = entry.speciesIfnCode ?? nestedSpecies.ifnCode ?? entry.ifnCode ?? null;

  if (ifnCode === null || ifnCode === undefined || ifnCode === '') {
    return null;
  }

  const species = findSpeciesByIfnCode(ifnCode);
  return species ? { ...species } : null;
}

const seenSpeciesCodes = new Set();
for (const species of SPECIES_CATALOG) {
  if (seenSpeciesCodes.has(species.ifnCode)) {
    throw new Error(`Duplicate IFN code in species catalog: ${species.ifnCode}`);
  }
  seenSpeciesCodes.add(species.ifnCode);
}
