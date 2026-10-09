import { i18n } from './i18n.js';

export function exportMeasurementsToXlsx(measurements) {
  const { t } = i18n;

  if (!window.XLSX) {
    const error = new Error(t('export.errorLibrary'));
    error.translationKey = 'export.errorLibrary';
    throw error;
  }

  const rows = measurements.map((entry) => ({
    [t('export.treeId')]: entry.treeId || '',
    [t('export.date')]: entry.date || '',
    [t('export.notes')]: entry.notes || '',
    [t('export.method')]: entry.method === 'horizontal'
      ? t('distance.horizontal')
      : entry.method === 'slope' ? t('distance.slope') : t('export.methodUnspecified'),
    [t('export.distance')]: entry.distance ?? '',
    [t('export.distanceUnit')]: 'm',
    [t('export.horizontalDistance')]: entry.horizontalDistance ?? '',
    [t('export.clinometer')]: entry.clinometerPercent ?? '',
    [t('export.clinometerAngle')]: entry.clinometerAngle ?? '',
    [t('export.slope')]: entry.terrainSlopePercent ?? '',
    [t('export.terrainAngle')]: entry.terrainAngle ?? '',
    [t('export.elevationDifference')]: entry.terrainElevationDifference ?? '',
    [t('export.observerHeight')]: entry.observerHeight ?? '',
    [t('export.estimatedHeight')]: entry.estimatedHeight ?? '',
    [t('export.formula')]: entry.method === 'horizontal'
      ? t('export.formulaHorizontal')
      : entry.method === 'slope'
        ? t('export.formulaSlope')
        : entry.methodDescription || '',
    [t('export.latitude')]: entry.latitude ?? '',
    [t('export.longitude')]: entry.longitude ?? '',
  }));

  const worksheet = window.XLSX.utils.json_to_sheet(rows);
  const workbook = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(workbook, worksheet, t('export.sheetName'));

  const fileName = `${t('export.filePrefix')}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  window.XLSX.writeFile(workbook, fileName);

  return fileName;
}
