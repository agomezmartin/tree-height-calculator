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
import {
  bindGpsCapture,
  createCoordinateMap,
  locateUserOnLoad,
  validateCoordinates,
} from './coordinates.js';
import { getErrorTranslationKey, i18n, setLocalizedText } from './i18n.js';

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
const mapStatus = document.getElementById('mapStatus');
const languageSelect = document.getElementById('languageSelect');
const { t } = i18n;

const state = {
  measurements: getMeasurements(),
  editingId: null,
  lastResult: null,
};

let locationWasAdjusted = false;
latitudeInput.addEventListener('input', () => {
  locationWasAdjusted = true;
});
longitudeInput.addEventListener('input', () => {
  locationWasAdjusted = true;
});

let locationMap;
try {
  locationMap = createCoordinateMap({
    element: document.getElementById('locationMap'),
    leaflet: window.L,
    mapStyleSelect: document.getElementById('mapStyleSelect'),
    latitudeInput,
    longitudeInput,
    onSelect: () => {
      locationWasAdjusted = true;
      setLocalizedText(mapStatus, 'gps.mapSelected');
      mapStatus.dataset.state = 'success';
    },
    onMapError: (key) => {
      setLocalizedText(mapStatus, key);
      mapStatus.dataset.state = 'error';
    },
  });
} catch (error) {
  setLocalizedText(mapStatus, 'gps.mapUnavailable');
  mapStatus.dataset.state = 'error';
}

const getLocationButton = document.getElementById('getLocationButton');
const locationStatus = document.getElementById('locationStatus');
const updateMapLocation = (coordinates) => locationMap?.setCoordinates(coordinates);

bindGpsCapture({
  button: getLocationButton,
  status: locationStatus,
  latitudeInput,
  longitudeInput,
  geolocation: navigator.geolocation,
  onCoordinates: updateMapLocation,
});

void locateUserOnLoad({
  button: getLocationButton,
  status: locationStatus,
  latitudeInput,
  longitudeInput,
  geolocation: navigator.geolocation,
  onCoordinates: updateMapLocation,
  shouldApply: () => !locationWasAdjusted,
});

measurementDateInput.value = new Date().toISOString().slice(0, 10);
i18n.applyTranslations();

function formatMeters(value) {
  if (!Number.isFinite(value)) return t('common.notAvailable');
  return `${i18n.formatNumber(value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} m`;
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return t('common.notAvailable');
  return `${i18n.formatNumber(value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} %`;
}

function formatCoordinate(value) {
  if (value === null || value === undefined || value === '') return t('common.notAvailable');
  const coordinate = Number(value);
  if (!Number.isFinite(coordinate)) return t('common.notAvailable');
  return i18n.formatNumber(coordinate, {
    useGrouping: false,
    maximumFractionDigits: 15,
  });
}

function clearError() {
  errorBox.hidden = true;
  errorBox.textContent = '';
  errorBox.classList.remove('success');
  errorBox.classList.remove('error');
}

function showError(error) {
  errorBox.hidden = false;
  const message = typeof error === 'string' ? error : error?.message;
  const isTranslationKey = typeof error === 'string' && t(error) !== error;
  const key = error?.translationKey ?? (isTranslationKey ? error : getErrorTranslationKey(message));
  setLocalizedText(errorBox, key);
  errorBox.classList.remove('success');
  errorBox.classList.add('error');
}

function showSuccess(key, parameters = {}) {
  errorBox.hidden = false;
  setLocalizedText(errorBox, key, parameters);
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
    result.warning = true;
  }

  return result;
}

function renderResultSummary(result) {
  const rows = [
    ['result.method', result.method === 'horizontal' ? t('distance.horizontal') : t('distance.slope')],
    ['result.inputDistance', formatMeters(result.distance)],
    ['result.horizontalDistance', formatMeters(result.horizontalDistance)],
    ['result.clinometer', formatPercent(result.clinometerPercent)],
    ['result.slope', formatPercent(result.terrainSlopePercent)],
    ['result.elevationDifference', formatMeters(result.terrainElevationDifference)],
    ['result.instrumentHeight', formatMeters(result.observerHeight)],
  ];
  const fragment = document.createDocumentFragment();
  for (const [labelKey, value] of rows) {
    const row = document.createElement('div');
    const label = document.createElement('dt');
    label.textContent = t(labelKey);
    const definition = document.createElement('dd');
    definition.textContent = value;
    row.append(label, definition);
    fragment.append(row);
  }
  resultSummary.replaceChildren(fragment);
}

function renderFormulaExplanation(result) {
  const narrative = t('result.formulaNarrative', {
    horizontalDistance: formatMeters(result.horizontalDistance),
    terrainDifference: formatMeters(result.terrainElevationDifference),
    crownElevation: formatMeters(result.crownElevation),
    observerHeight: formatMeters(result.observerHeight),
    estimatedHeight: formatMeters(result.estimatedHeight),
  });
  formulaExplanation.replaceChildren(document.createTextNode(narrative));
  if (result.warning) {
    const warning = document.createElement('strong');
    warning.textContent = ` ${t('result.warningLabel')} ${t('result.unusualHeight')}`;
    formulaExplanation.append(warning);
  }
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
  `;
  const labels = [
    [25, 212, t('result.observer')],
    [247, 210, t('result.base')],
    [244, crownY - 8, t('result.crown')],
    [120, 95, t('result.eyeHeight', { height: formatMeters(result.observerHeight) })],
  ];
  for (const [x, y, value] of labels) {
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', x);
    label.setAttribute('y', y);
    label.setAttribute('font-size', '12');
    label.setAttribute('fill', '#17312a');
    label.textContent = value;
    svg.append(label);
  }
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
    showError(error);
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  calculateAndRender();
});

saveButton.addEventListener('click', () => {
  try {
    locationWasAdjusted = true;
    const result = buildMeasurementResult();
    const coordinates = validateCoordinates({
      latitude: latitudeInput.value,
      longitude: longitudeInput.value,
    });
    const measurement = {
      id: state.editingId ?? `tree-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      treeId: result.treeId,
      date: result.date,
      notes: result.notes,
      method: result.method,
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
      setLocalizedText(saveButton, 'action.save');
      showSuccess('message.measurementUpdated');
    } else {
      state.measurements = addMeasurement(measurement);
      showSuccess('message.measurementSaved');
    }

    renderTable();
  } catch (error) {
    showError(error);
  }
});

exportButton.addEventListener('click', () => {
  if (!state.measurements.length) {
    showError('message.noMeasurementsToExport');
    return;
  }

  try {
    const fileName = exportMeasurementsToXlsx(state.measurements);
    showSuccess('message.exportSuccess', { fileName });
  } catch (error) {
    showError(error);
  }
});

function renderTable() {
  if (!state.measurements.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 11;
    cell.className = 'empty-state';
    cell.textContent = t('table.empty');
    row.append(cell);
    tableBody.replaceChildren(row);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const entry of state.measurements) {
    const row = document.createElement('tr');
    const values = [
      entry.treeId || t('table.unnamedTree'),
      entry.date ? i18n.formatDate(entry.date) : t('common.notAvailable'),
      entry.method === 'horizontal' ? t('distance.horizontal') : t('distance.slope'),
      formatMeters(entry.distance),
      formatPercent(entry.clinometerPercent),
      formatPercent(entry.terrainSlopePercent),
      formatMeters(entry.observerHeight),
      formatMeters(entry.estimatedHeight),
      formatCoordinate(entry.latitude),
      formatCoordinate(entry.longitude),
    ];
    for (const value of values) {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.append(cell);
    }

    const actionsCell = document.createElement('td');
    const actions = document.createElement('div');
    actions.className = 'action-buttons';
    for (const [action, key] of [['edit', 'action.edit'], ['delete', 'action.delete']]) {
      const button = document.createElement('button');
      button.className = 'icon-button';
      button.type = 'button';
      button.dataset.action = action;
      button.dataset.id = entry.id;
      button.dataset.i18n = key;
      button.textContent = t(key);
      actions.append(button);
    }
    actionsCell.append(actions);
    row.append(actionsCell);
    fragment.append(row);
  }
  tableBody.replaceChildren(fragment);
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
    showSuccess('message.measurementDeleted');
    return;
  }

  if (action === 'edit') {
    locationWasAdjusted = true;
    state.editingId = id;
    setLocalizedText(saveButton, 'action.update');
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
    locationMap?.setCoordinates({
      latitude: target.latitude ?? null,
      longitude: target.longitude ?? null,
    });
    calculateAndRender();
  }
});

languageSelect.addEventListener('change', () => {
  i18n.setLanguage(languageSelect.value);
  locationMap?.setLanguage();
  renderTable();
  if (state.lastResult) renderResult(state.lastResult);
  if (state.editingId) {
    setLocalizedText(saveButton, 'action.update');
  } else {
    setLocalizedText(saveButton, 'action.save');
  }
});

renderTable();
resultValue.textContent = formatMeters(0);
