import { i18n } from './i18n.js';
import { getPhytosanitaryStatusLabel } from './phytosanitary.js';
import { validateStoredTrunkDiameter } from './diameters.js';

const MIN_COLUMN_WIDTH = 12;
const MAX_COLUMN_WIDTH = 60;
const HEADER_PADDING = 2;
const TABLE_NAME = 'TablaMedicionesArbolado';

function getUniqueHeaders(headers) {
  const usedHeaders = new Set();

  return headers.map((header, index) => {
    const baseHeader = String(header).trim() || `Columna ${index + 1}`;
    let uniqueHeader = baseHeader;
    let suffix = 2;

    while (usedHeaders.has(uniqueHeader)) {
      uniqueHeader = `${baseHeader} (${suffix})`;
      suffix += 1;
    }

    usedHeaders.add(uniqueHeader);
    return uniqueHeader;
  });
}

function getColumnWidth(header, values) {
  const headerWidth = header.length + HEADER_PADDING;
  const contentWidth = Math.max(
    MIN_COLUMN_WIDTH,
    ...values.map((value) => String(value ?? '').length + HEADER_PADDING),
  );

  return Math.max(
    MIN_COLUMN_WIDTH,
    headerWidth,
    Math.min(MAX_COLUMN_WIDTH, contentWidth),
  );
}

function downloadWorkbookBuffer(buffer, fileName) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  link.style.display = 'none';
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 0);
}

export async function exportMeasurementsToXlsx(measurements) {
  const { t } = i18n;

  if (!window.ExcelJS) {
    const error = new Error(t('export.errorLibrary'));
    error.translationKey = 'export.errorLibrary';
    throw error;
  }

  const trunkCount = measurements.reduce((maximum, entry) => {
    const diameters = Array.isArray(entry.trunkDiameters) ? entry.trunkDiameters : [];
    const ids = Array.isArray(entry.trunkIds) ? entry.trunkIds : [];
    return Math.max(maximum, diameters.length, ids.length);
  }, 0);

  const headers = getUniqueHeaders([
    t('export.treeId'),
    t('export.speciesIfnCode'),
    t('export.speciesScientificName'),
    t('export.speciesCommonName'),
    t('tree.phytosanitaryStatus'),
    t('export.measurementType'),
    t('export.date'),
    t('export.notes'),
    t('export.method'),
    t('export.distance'),
    t('export.distanceUnit'),
    t('export.horizontalDistance'),
    t('export.clinometer'),
    t('export.clinometerAngle'),
    t('export.slope'),
    t('export.terrainAngle'),
    t('export.elevationDifference'),
    t('export.observerHeight'),
    t('export.estimatedHeight'),
    t('export.formula'),
    ...Array.from(
      { length: trunkCount },
      (_unused, index) => `Tronco ${index + 1} (diámetro en cm)`,
    ),
    t('export.latitude'),
    t('export.longitude'),
  ]);
  const rows = measurements.map((entry) => {
    const isManual = entry.measurementType === 'manual';
    const speciesIfnCode = entry.speciesIfnCode ?? entry.species?.ifnCode ?? '';
    const speciesScientificName = entry.speciesScientificName ?? entry.species?.scientificName ?? '';
    const speciesCommonName = entry.speciesCommonName ?? entry.species?.commonName ?? '';
    const diameters = Array.isArray(entry.trunkDiameters) ? entry.trunkDiameters : [];

    return [
      entry.treeId || '',
      speciesIfnCode,
      speciesScientificName,
      speciesCommonName,
      getPhytosanitaryStatusLabel(entry.phytosanitaryStatus, t),
      t(isManual ? 'measurement.typeManual' : 'measurement.typeClinometer'),
      entry.date || '',
      entry.notes || '',
      isManual
        ? ''
        : entry.method === 'horizontal'
          ? t('distance.horizontal')
          : entry.method === 'slope' ? t('distance.slope') : t('export.methodUnspecified'),
      isManual ? '' : entry.distance ?? '',
      isManual ? '' : 'm',
      isManual ? '' : entry.horizontalDistance ?? '',
      isManual ? '' : entry.clinometerPercent ?? '',
      isManual ? '' : entry.clinometerAngle ?? '',
      isManual ? '' : entry.terrainSlopePercent ?? '',
      isManual ? '' : entry.terrainAngle ?? '',
      isManual ? '' : entry.terrainElevationDifference ?? '',
      isManual ? '' : entry.observerHeight ?? '',
      entry.estimatedHeight ?? '',
      isManual
        ? ''
        : entry.method === 'horizontal'
          ? t('export.formulaHorizontal')
          : entry.method === 'slope'
            ? t('export.formulaSlope')
            : entry.methodDescription || '',
      ...Array.from(
        { length: trunkCount },
        (_unused, index) => validateStoredTrunkDiameter(diameters[index]) ?? '',
      ),
      entry.latitude ?? '',
      entry.longitude ?? '',
    ];
  });

  const workbook = new window.ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Mediciones');
  worksheet.views = [{ state: 'normal', showGridLines: false }];
  worksheet.columns = headers.map((header, columnIndex) => ({
    width: getColumnWidth(header, rows.map((row) => row[columnIndex])),
  }));
  worksheet.addTable({
    name: TABLE_NAME,
    ref: 'A1',
    headerRow: true,
    totalsRow: false,
    style: { theme: 'TableStyleLight11' },
    columns: headers.map((name) => ({ name, filterButton: true })),
    rows,
  });
  worksheet.eachRow({ includeEmpty: true }, (row) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.alignment = { ...cell.alignment, wrapText: true };
    });
  });

  const fileName = `${t('export.filePrefix')}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();
  downloadWorkbookBuffer(buffer, fileName);
  return fileName;
}
