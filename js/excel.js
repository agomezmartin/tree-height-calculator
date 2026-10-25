import { i18n } from './i18n.js';
import { getPhytosanitaryStatusLabel } from './phytosanitary.js';

export function exportMeasurementsToXlsx(measurements) {
  const { t } = i18n;

  if (!window.XLSX) {
    const error = new Error(t('export.errorLibrary'));
    error.translationKey = 'export.errorLibrary';
    throw error;
  }

  const rows = measurements.map((entry) => {
    const isManual = entry.measurementType === 'manual';
    const speciesIfnCode = entry.speciesIfnCode ?? entry.species?.ifnCode ?? '';
    const speciesScientificName = entry.speciesScientificName ?? entry.species?.scientificName ?? '';
    const speciesCommonName = entry.speciesCommonName ?? entry.species?.commonName ?? '';

    return {
      [t('export.treeId')]: entry.treeId || '',
      [t('export.speciesIfnCode')]: speciesIfnCode ?? '',
      [t('export.speciesScientificName')]: speciesScientificName ?? '',
      [t('export.speciesCommonName')]: speciesCommonName ?? '',
      [t('tree.phytosanitaryStatus')]: getPhytosanitaryStatusLabel(entry.phytosanitaryStatus, t),
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
  });

  const trunkRows = measurements.flatMap((entry) => {
    const trunkDiameters = Array.isArray(entry.trunkDiameters) ? entry.trunkDiameters : [];
    const trunkRecords = trunkDiameters.length
      ? trunkDiameters.map((diameter, index) => ({ trunkNumber: index + 1, diameter }))
      : [{ trunkNumber: '', diameter: '' }];

    return trunkRecords.map(({ trunkNumber, diameter }) => ({
      [t('export.measurementRecordId')]: entry.id ?? '',
      [t('export.treeId')]: entry.treeId || '',
      [t('export.trunkNumber')]: trunkNumber,
      [t('export.dap')]: diameter,
    }));
  });

  const worksheet = window.XLSX.utils.json_to_sheet(rows);
  const trunkWorksheet = window.XLSX.utils.json_to_sheet(trunkRows);
  const workbook = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(workbook, worksheet, t('export.sheetName'));
  window.XLSX.utils.book_append_sheet(workbook, trunkWorksheet, t('export.trunksSheetName'));

  const fileName = `${t('export.filePrefix')}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  window.XLSX.writeFile(workbook, fileName);

  return fileName;
}
