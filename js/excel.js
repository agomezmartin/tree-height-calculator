export function exportMeasurementsToXlsx(measurements) {
  if (!window.XLSX) {
    throw new Error('La librería Excel no está disponible.');
  }

  const rows = measurements.map((entry) => ({
    'ID del árbol': entry.treeId || '',
    Fecha: entry.date || '',
    Observaciones: entry.notes || '',
    'Método de medición': entry.methodLabel || 'No especificado',
    'Distancia introducida (m)': entry.distance ?? '',
    'Unidad de distancia': 'm',
    'Distancia horizontal calculada (m)': entry.horizontalDistance ?? '',
    'Clinómetro (%)': entry.clinometerPercent ?? '',
    'Ángulo del clinómetro (°)': entry.clinometerAngle ?? '',
    'Pendiente del terreno (%)': entry.terrainSlopePercent ?? '',
    'Ángulo del terreno (°)': entry.terrainAngle ?? '',
    'Desnivel calculado (m)': entry.terrainElevationDifference ?? '',
    'Altura del instrumento (m)': entry.observerHeight ?? '',
    'Altura estimada del árbol (m)': entry.estimatedHeight ?? '',
    'Fórmula / método utilizado': entry.methodDescription || '',
  }));

  const worksheet = window.XLSX.utils.json_to_sheet(rows);
  const workbook = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(workbook, worksheet, 'Mediciones');

  const fileName = `mediciones-arboles-${new Date().toISOString().slice(0, 10)}.xlsx`;
  window.XLSX.writeFile(workbook, fileName);

  return fileName;
}
