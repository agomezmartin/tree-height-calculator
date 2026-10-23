import { i18n } from './i18n.js';

function escapeCsvField(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[;"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function createExportRow(entry, t) {
  const isManual = entry.measurementType === 'manual';
  const speciesIfnCode = entry.speciesIfnCode ?? entry.species?.ifnCode ?? '';
  const speciesScientificName = entry.speciesScientificName ?? entry.species?.scientificName ?? '';
  const speciesCommonName = entry.speciesCommonName ?? entry.species?.commonName ?? '';

  return {
    [t('export.treeId')]: entry.treeId || '',
    [t('export.speciesIfnCode')]: speciesIfnCode ?? '',
    [t('export.speciesScientificName')]: speciesScientificName ?? '',
    [t('export.speciesCommonName')]: speciesCommonName ?? '',
    [t('export.measurementType')]: t(isManual ? 'measurement.typeManual' : 'measurement.typeClinometer'),
    [t('export.date')]: entry.date || '',
    [t('export.notes')]: entry.notes || '',
    [t('export.method')]: isManual
      ? ''
      : entry.method === 'horizontal'
        ? t('distance.horizontal')
        : entry.method === 'slope' ? t('distance.slope') : t('export.methodUnspecified'),
    [t('export.distance')]: isManual ? '' : entry.distance ?? '',
    [t('export.distanceUnit')]: isManual ? '' : 'm',
    [t('export.horizontalDistance')]: isManual ? '' : entry.horizontalDistance ?? '',
    [t('export.clinometer')]: isManual ? '' : entry.clinometerPercent ?? '',
    [t('export.clinometerAngle')]: isManual ? '' : entry.clinometerAngle ?? '',
    [t('export.slope')]: isManual ? '' : entry.terrainSlopePercent ?? '',
    [t('export.terrainAngle')]: isManual ? '' : entry.terrainAngle ?? '',
    [t('export.elevationDifference')]: isManual ? '' : entry.terrainElevationDifference ?? '',
    [t('export.observerHeight')]: isManual ? '' : entry.observerHeight ?? '',
    [t('export.estimatedHeight')]: entry.estimatedHeight ?? '',
    [t('export.formula')]: isManual
      ? ''
      : entry.method === 'horizontal'
        ? t('export.formulaHorizontal')
        : entry.method === 'slope'
          ? t('export.formulaSlope')
          : entry.methodDescription || '',
    [t('export.latitude')]: entry.latitude ?? '',
    [t('export.longitude')]: entry.longitude ?? '',
  };
}

export function exportMeasurementsToCsv(measurements) {
  const { t } = i18n;
  const rows = measurements.map((entry) => createExportRow(entry, t));
  const headers = Object.keys(createExportRow({}, t));
  const csvRows = [
    headers,
    ...rows.map((row) => headers.map((header) => row[header])),
  ];
  const csv = csvRows.map((row) => row.map(escapeCsvField).join(';')).join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const fileName = `${t('export.filePrefix')}-${new Date().toISOString().slice(0, 10)}.csv`;
  let link;
  let objectUrl;

  try {
    link = document.createElement('a');
    objectUrl = URL.createObjectURL(blob);
    link.href = objectUrl;
    link.download = fileName;
    link.hidden = true;
    document.body.append(link);
    link.click();
  } catch (cause) {
    const error = new Error(t('export.errorDownload'), { cause });
    error.translationKey = 'export.errorDownload';
    throw error;
  } finally {
    try {
      link?.remove();
    } finally {
      if (objectUrl) {
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      }
    }
  }

  return fileName;
}
