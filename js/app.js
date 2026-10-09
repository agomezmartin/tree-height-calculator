import {
  calculateCrownElevation,
  calculateHorizontalDistance,
  calculateTerrainElevationDifference,
  calculateTreeHeight,
  convertPercentToDegrees,
  parseNumericInput,
  validateMeasurement,
} from './calculator.js';
import { addMeasurement, deleteMeasurementById, getMeasurements, updateMeasurementById } from './storage.js';
import { exportMeasurementsToXlsx } from './excel.js';
import { bindGpsCapture, validateCoordinates } from './coordinates.js';

const form = document.getElementById('measurementForm');
const resultValue = document.getElementById('treeHeightResult');
const resultSummary = document.getElementById('resultSummary');
const formulaExplanation = document.getElementById('formulaExplanation');
const errorBox = document.getElementById('formError');
const tableBody = document.getElementById('measurementTableBody');
const measurementDateInput = document.getElementById('measurementDate');
const saveButton = document.getElementById('saveButton');
const exportButton = document.getElementById('exportButton');
const latitudeInput = document.getElementById('latitude');
const longitudeInput = document.getElementById('longitude');

const state = {
  measurements: getMeasurements(),
  editingId: null,
  lastResult: null,
};

bindGpsCapture({
  button: document.getElementById('getLocationButton'),
  status: document.getElementById('locationStatus'),
  latitudeInput,
  longitudeInput,
  geolocation: navigator.geolocation,
});

measurementDateInput.value = new Date().toISOString().slice(0, 10);

function formatMeters(value) {
  if (!Number.isFinite(value)) return '—';
  return `${Number(value).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} m`;
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return '—';
  return `${Number(value).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} %`;
}

function formatDegrees(value) {
  if (!Number.isFinite(value)) return '—';
  return `${Number(value).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} °`;
}

function clearError() {
  errorBox.hidden = true;
  errorBox.textContent = '';
  errorBox.classList.remove('success');
  errorBox.classList.remove('error');
}

function showError(message) {
  errorBox.hidden = false;
  errorBox.textContent = message;
  errorBox.classList.remove('success');
  errorBox.classList.add('error');
}

function showSuccess(message) {
  errorBox.hidden = false;
  errorBox.textContent = message;
  errorBox.classList.remove('error');
  errorBox.classList.add('success');
}

function readFormValues() {
  const selectedMethod = document.querySelector('input[name="distanceMethod"]:checked')?.value ?? 'horizontal';

  return {
    treeId: document.getElementById('treeId').value.trim(),
    date: document.getElementById('measurementDate').value,
    notes: document.getElementById('notes').value.trim(),
    method: selectedMethod,
    distance: parseNumericInput(document.getElementById('distance').value),
    clinometerPercent: parseNumericInput(document.getElementById('clinometerPercent').value),
    terrainSlopePercent: parseNumericInput(document.getElementById('terrainSlopePercent').value),
    observerHeight: parseNumericInput(document.getElementById('observerHeight').value),
  };
}

function buildMeasurementResult() {
  const values = readFormValues();
  const validated = validateMeasurement(values);

  const horizontalDistance = calculateHorizontalDistance({
    method: validated.method,
    distance: validated.distance,
    terrainSlopePercent: validated.terrainSlopePercent,
  });

  const terrainElevationDifference = calculateTerrainElevationDifference(
    horizontalDistance,
    validated.terrainSlopePercent,
  );

  const crownElevation = calculateCrownElevation(
    horizontalDistance,
    validated.clinometerPercent,
  );

  const estimatedHeight = calculateTreeHeight(validated);

  const result = {
    ...validated,
    treeId: values.treeId,
    date: values.date || new Date().toISOString().slice(0, 10),
    notes: values.notes,
    methodLabel: validated.method === 'horizontal' ? 'Distancia horizontal' : 'Distancia sobre el terreno',
    horizontalDistance,
    terrainElevationDifference,
    crownElevation,
    estimatedHeight,
    clinometerAngle: convertPercentToDegrees(validated.clinometerPercent),
    terrainAngle: convertPercentToDegrees(validated.terrainSlopePercent),
    methodDescription: validated.method === 'horizontal'
      ? 'D_h = D; Δh_base = D_h × (P_t / 100); H = h_ojo + D_h × tan(θ_copa) - Δh_base'
      : 'D_h = D_t × cos(θ_t); Δh_base = D_h × (P_t / 100); H = h_ojo + D_h × tan(θ_copa) - Δh_base',
  };

  if (estimatedHeight > 80 || estimatedHeight < 1) {
    result.warning = 'La altura estimada parece inusualmente alta o baja para una medición de campo; revisa las lecturas introducidas.';
  }

  return result;
}

function renderResultSummary(result) {
  resultSummary.innerHTML = `
    <div><dt>Método</dt><dd>${result.methodLabel}</dd></div>
    <div><dt>Distancia introducida</dt><dd>${formatMeters(result.distance)}</dd></div>
    <div><dt>Distancia horizontal</dt><dd>${formatMeters(result.horizontalDistance)}</dd></div>
    <div><dt>Clinómetro</dt><dd>${formatPercent(result.clinometerPercent)}</dd></div>
    <div><dt>Pendiente</dt><dd>${formatPercent(result.terrainSlopePercent)}</dd></div>
    <div><dt>Desnivel</dt><dd>${formatMeters(result.terrainElevationDifference)}</dd></div>
    <div><dt>Altura instrumento</dt><dd>${formatMeters(result.observerHeight)}</dd></div>
  `;
}

function renderFormulaExplanation(result) {
  const warningText = result.warning ? ` <strong>Advertencia:</strong> ${result.warning}` : '';

  formulaExplanation.innerHTML = `
    Se parte de la distancia horizontal ${formatMeters(result.horizontalDistance)}. El terreno aporta un desnivel de ${formatMeters(result.terrainElevationDifference)} y la copa está ${formatMeters(result.crownElevation)} por encima o por debajo del plano horizontal del observador. La altura total se calcula como: ${formatMeters(result.observerHeight)} + ${formatMeters(result.crownElevation)} - ${formatMeters(result.terrainElevationDifference)} = <strong>${formatMeters(result.estimatedHeight)}</strong>.${warningText}
  `;
}

function updateDiagram(result) {
  const svg = document.getElementById('measurementDiagram');
  const observerX = 72;
  const observerY = 150;
  const groundY = 176;
  const baseX = 290;
  const baseY = groundY - result.terrainElevationDifference * 8;
  const crownY = observerY - result.crownElevation * 8;
  const eyeLineTargetX = 180;

  svg.innerHTML = `
    <line x1="30" y1="${groundY}" x2="390" y2="${groundY}" stroke="#2a5d44" stroke-width="4" />
    <line x1="${observerX}" y1="${groundY}" x2="${baseX}" y2="${baseY}" stroke="#80a78f" stroke-width="4" />
    <line x1="${observerX}" y1="${observerY - 12}" x2="${observerX}" y2="${observerY - 36}" stroke="#1f6f43" stroke-width="3" />
    <line x1="${observerX}" y1="${observerY - 36}" x2="${eyeLineTargetX}" y2="${observerY - 36}" stroke="#1f6f43" stroke-dasharray="6 6" stroke-width="2" />
    <circle cx="${observerX}" cy="${observerY}" r="10" fill="#1f6f43" />
    <line x1="${baseX}" y1="${groundY}" x2="${baseX}" y2="${baseY}" stroke="#3d4d45" stroke-width="4" />
    <line x1="${baseX}" y1="${baseY}" x2="${baseX}" y2="${crownY}" stroke="#3d4d45" stroke-width="4" />
    <line x1="${baseX}" y1="${crownY}" x2="${baseX + 18}" y2="${crownY}" stroke="#3d4d45" stroke-width="3" />
    <text x="25" y="212" font-size="12" fill="#17312a">Observador</text>
    <text x="247" y="210" font-size="12" fill="#17312a">Base</text>
    <text x="244" y="${crownY - 8}" font-size="12" fill="#17312a">Copa</text>
    <text x="120" y="95" font-size="12" fill="#17312a">Altura del ojo: ${formatMeters(result.observerHeight)}</text>
  `;
}

function renderResult(result) {
  resultValue.textContent = formatMeters(result.estimatedHeight);
  renderResultSummary(result);
  renderFormulaExplanation(result);
  updateDiagram(result);
  state.lastResult = result;
}

function calculateAndRender() {
  try {
    const result = buildMeasurementResult();
    clearError();
    renderResult(result);
  } catch (error) {
    showError(error.message);
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  calculateAndRender();
});

saveButton.addEventListener('click', () => {
  try {
    const result = buildMeasurementResult();
    const coordinates = validateCoordinates({
      latitude: latitudeInput.value,
      longitude: longitudeInput.value,
    });
    const measurement = {
      id: state.editingId ?? `tree-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      treeId: result.treeId || 'Sin nombre',
      date: result.date,
      notes: result.notes,
      method: result.method,
      methodLabel: result.methodLabel,
      distance: result.distance,
      clinometerPercent: result.clinometerPercent,
      terrainSlopePercent: result.terrainSlopePercent,
      observerHeight: result.observerHeight,
      horizontalDistance: result.horizontalDistance,
      estimatedHeight: result.estimatedHeight,
      terrainElevationDifference: result.terrainElevationDifference,
      clinometerAngle: result.clinometerAngle,
      terrainAngle: result.terrainAngle,
      methodDescription: result.methodDescription,
      ...coordinates,
    };

    if (state.editingId) {
      state.measurements = updateMeasurementById(state.editingId, measurement);
      state.editingId = null;
      saveButton.textContent = 'Guardar árbol';
      showSuccess('La medición se ha actualizado correctamente.');
    } else {
      state.measurements = addMeasurement(measurement);
      showSuccess('La medición se ha guardado correctamente.');
    }

    renderTable();
  } catch (error) {
    showError(error.message);
  }
});

exportButton.addEventListener('click', () => {
  if (!state.measurements.length) {
    showError('No hay mediciones guardadas para exportar.');
    return;
  }

  try {
    const fileName = exportMeasurementsToXlsx(state.measurements);
    showSuccess(`Archivo exportado correctamente: ${fileName}`);
  } catch (error) {
    showError(error.message);
  }
});

function renderTable() {
  if (!state.measurements.length) {
    tableBody.innerHTML = '<tr><td colspan="9" class="empty-state">Todavía no hay árboles guardados.</td></tr>';
    return;
  }

  tableBody.innerHTML = state.measurements
    .map(
      (entry) => `
        <tr>
          <td>${entry.treeId || 'Sin nombre'}</td>
          <td>${entry.date || '—'}</td>
          <td>${entry.methodLabel || '—'}</td>
          <td>${formatMeters(entry.distance)}</td>
          <td>${formatPercent(entry.clinometerPercent)}</td>
          <td>${formatPercent(entry.terrainSlopePercent)}</td>
          <td>${formatMeters(entry.observerHeight)}</td>
          <td>${formatMeters(entry.estimatedHeight)}</td>
          <td>
            <div class="action-buttons">
              <button class="icon-button" type="button" data-action="edit" data-id="${entry.id}">Editar</button>
              <button class="icon-button" type="button" data-action="delete" data-id="${entry.id}">Eliminar</button>
            </div>
          </td>
        </tr>
      `,
    )
    .join('');
}

tableBody.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const { action, id } = button.dataset;
  const target = state.measurements.find((entry) => entry.id === id);
  if (!target) return;

  if (action === 'delete') {
    state.measurements = deleteMeasurementById(id);
    renderTable();
    showSuccess('La medición ha sido eliminada.');
    return;
  }

  if (action === 'edit') {
    state.editingId = id;
    saveButton.textContent = 'Actualizar árbol';
    document.getElementById('treeId').value = target.treeId || '';
    document.getElementById('measurementDate').value = target.date || new Date().toISOString().slice(0, 10);
    document.getElementById('notes').value = target.notes || '';
    document.querySelector(`input[name="distanceMethod"][value="${target.method}"]`).checked = true;
    document.getElementById('distance').value = target.distance ?? '';
    document.getElementById('clinometerPercent').value = target.clinometerPercent ?? '';
    document.getElementById('terrainSlopePercent').value = target.terrainSlopePercent ?? '';
    document.getElementById('observerHeight').value = target.observerHeight ?? '';
    latitudeInput.value = target.latitude ?? '';
    longitudeInput.value = target.longitude ?? '';
    calculateAndRender();
  }
});

renderTable();
