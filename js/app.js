import {
  calculateCrownElevation,
  calculateHorizontalDistance,
  calculateTerrainElevationDifference,
  calculateTreeHeight,
  convertPercentToDegrees,
  parseNumericInput,
  validateManualHeight,
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
import { getPhytosanitaryStatusLabel } from './phytosanitary.js';
import { validateTrunkDiameters } from './diameters.js';
import {
  findSpeciesByDisplayName,
  findSpeciesByIfnCode,
  getSpeciesCatalog,
  getSpeciesDisplayName,
} from './species.js';

const form = document.getElementById('measurementForm');
const resultValue = document.getElementById('treeHeightResult');
const resultSummary = document.getElementById('resultSummary');
const formulaExplanation = document.getElementById('formulaExplanation');
const errorBox = document.getElementById('formError');
const tableBody = document.getElementById('measurementTableBody');
const trunkDiameterList = document.getElementById('trunkDiameterList');
const trunkDiameterSection = document.getElementById('trunkDiameterSection');
const includeTrunkDiameters = document.getElementById('includeTrunkDiameters');
const measurementDateInput = document.getElementById('measurementDate');
const saveButton = document.getElementById('saveButton');
const addTrunkButton = document.getElementById('addTrunkButton');
const calculateButton = document.getElementById('calculateButton');
const calculateManualButton = document.getElementById('calculateManualButton');
const exportButton = document.getElementById('exportButton');
const latitudeInput = document.getElementById('latitude');
const longitudeInput = document.getElementById('longitude');
const speciesSelect = document.getElementById('speciesSelect');
const phytosanitaryStatusSelect = document.getElementById('phytosanitaryStatus');
const mapStatus = document.getElementById('mapStatus');
const languageSelect = document.getElementById('languageSelect');
const manualHeightInput = document.getElementById('manualHeight');
const manualMeasurementFields = document.getElementById('manualMeasurementFields');
const clinometerMeasurementFields = document.getElementById('clinometerMeasurementFields');
const distanceMethodFields = document.getElementById('distanceMethodFields');
const measurementDiagram = document.querySelector('.diagram-wrap');
const { t } = i18n;

const state = {
  measurements: getMeasurements(),
  editingId: null,
  lastResult: null,
  lastManualHeight: null,
};

function getMeasurementType() {
  return document.querySelector('input[name="measurementType"]:checked')?.value ?? 'clinometer';
}

function updateMeasurementType() {
  const manual = getMeasurementType() === 'manual';
  manualMeasurementFields.hidden = !manual;
  clinometerMeasurementFields.hidden = manual;
  distanceMethodFields.hidden = manual;
  calculateButton.hidden = manual;
  calculateManualButton.hidden = !manual;
}

document.querySelectorAll('input[name="measurementType"]').forEach((input) => {
  input.addEventListener('change', () => {
    updateMeasurementType();
    clearError();
  });
});

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

function populateSpeciesOptions() {
  if (!speciesSelect) {
    return;
  }

  const previousSelection = speciesSelect.value || '';
  const datalist = document.getElementById('speciesSuggestions');
  if (!datalist) {
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const species of getSpeciesCatalog()) {
    const option = document.createElement('option');
    option.value = getSpeciesDisplayName(species);
    fragment.append(option);
  }

  datalist.replaceChildren(fragment);
  if (previousSelection) {
    const matchingSpecies = findSpeciesByDisplayName(previousSelection)
      ?? findSpeciesByIfnCode(previousSelection);
    speciesSelect.value = matchingSpecies ? getSpeciesDisplayName(matchingSpecies) : previousSelection;
  } else {
    speciesSelect.value = '';
  }
}

populateSpeciesOptions();

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

function getTrunkDiameterInputValues() {
  if (!includeTrunkDiameters.checked) {
    return [];
  }

  return [...trunkDiameterList.querySelectorAll('.trunk-diameter-input')]
    .map((input) => input.value);
}

function renderTrunkDiameterInputs(values = ['']) {
  const fragment = document.createDocumentFragment();

  values.forEach((value, index) => {
    const row = document.createElement('div');
    row.className = 'trunk-diameter-row';

    const label = document.createElement('label');
    label.className = 'field';
    const labelText = document.createElement('span');
    labelText.dataset.i18n = 'tree.trunkNumber';
    labelText.textContent = t('tree.trunkNumber', { number: index + 1 });

    const input = document.createElement('input');
    input.className = 'trunk-diameter-input';
    input.name = 'trunkDiameters[]';
    input.type = 'text';
    input.inputMode = 'decimal';
    input.autocomplete = 'off';
    input.value = value;
    label.append(labelText, input);

    const removeButton = document.createElement('button');
    removeButton.className = 'icon-button';
    removeButton.type = 'button';
    removeButton.dataset.action = 'remove-trunk';
    removeButton.dataset.i18n = 'tree.removeTrunk';
    removeButton.dataset.i18nAriaLabel = 'tree.removeTrunk';
    removeButton.textContent = t('tree.removeTrunk');

    row.append(label, removeButton);
    fragment.append(row);
  });

  trunkDiameterList.replaceChildren(fragment);
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

addTrunkButton.addEventListener('click', () => {
  const values = getTrunkDiameterInputValues();
  values.push('');
  renderTrunkDiameterInputs(values);
  trunkDiameterList.lastElementChild?.querySelector('.trunk-diameter-input')?.focus();
});

includeTrunkDiameters.addEventListener('change', () => {
  trunkDiameterSection.hidden = !includeTrunkDiameters.checked;
  if (includeTrunkDiameters.checked && trunkDiameterList.children.length === 0) {
    renderTrunkDiameterInputs();
  }
});

trunkDiameterList.addEventListener('click', (event) => {
  const removeButton = event.target.closest('button[data-action="remove-trunk"]');
  if (!removeButton) return;

  const values = getTrunkDiameterInputValues();
  const rowIndex = [...trunkDiameterList.children].indexOf(removeButton.closest('.trunk-diameter-row'));
  if (rowIndex >= 0) values.splice(rowIndex, 1);
  renderTrunkDiameterInputs(values);
});

function getSelectedSpecies() {
  const selectedSpeciesName = speciesSelect?.value?.trim();
  if (!selectedSpeciesName) {
    return null;
  }

  return findSpeciesByDisplayName(selectedSpeciesName)
    ?? findSpeciesByIfnCode(selectedSpeciesName);
}

function getSpeciesFields() {
  const selectedSpecies = getSelectedSpecies();
  const enteredName = speciesSelect?.value?.trim() ?? '';

  return {
    speciesIfnCode: selectedSpecies?.ifnCode ?? null,
    speciesScientificName: selectedSpecies?.scientificName ?? (enteredName || null),
    speciesCommonName: selectedSpecies?.commonName ?? null,
  };
}

function readFormValues() {
  const selectedMethod = document.querySelector('input[name="distanceMethod"]:checked')?.value ?? 'horizontal';

  return {
    treeId: document.getElementById('treeId').value.trim(),
    date: document.getElementById('measurementDate').value,
    notes: document.getElementById('notes').value.trim(),
    ...getSpeciesFields(),
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
  state.lastManualHeight = null;
  measurementDiagram.hidden = false;
  resultValue.textContent = formatMeters(result.estimatedHeight);
  renderResultSummary(result);
  renderFormulaExplanation(result);
  updateDiagram(result);
  state.lastResult = result;
}

function renderManualResult(height) {
  state.lastResult = null;
  state.lastManualHeight = height;
  measurementDiagram.hidden = true;
  resultValue.textContent = formatMeters(height);

  const row = document.createElement('div');
  const label = document.createElement('dt');
  label.textContent = t('result.estimatedHeight');
  const definition = document.createElement('dd');
  definition.textContent = formatMeters(height);
  row.append(label, definition);
  resultSummary.replaceChildren(row);
  formulaExplanation.textContent = t('result.manualExplanation');
}

function calculateAndRender() {
  try {
    if (getMeasurementType() === 'manual') {
      renderManualResult(validateManualHeight(manualHeightInput.value));
      clearError();
      return;
    }
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

calculateManualButton.addEventListener('click', calculateAndRender);

saveButton.addEventListener('click', () => {
  try {
    locationWasAdjusted = true;
    const coordinates = validateCoordinates({
      latitude: latitudeInput.value,
      longitude: longitudeInput.value,
    });
    const common = {
      id: state.editingId ?? `tree-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      treeId: document.getElementById('treeId').value.trim(),
      date: measurementDateInput.value || new Date().toISOString().slice(0, 10),
      notes: document.getElementById('notes').value.trim(),
      phytosanitaryStatus: phytosanitaryStatusSelect.value || null,
      trunkDiameters: validateTrunkDiameters(getTrunkDiameterInputValues()),
      ...getSpeciesFields(),
      ...coordinates,
    };
    let measurement;
    let result;

    if (getMeasurementType() === 'manual') {
      const estimatedHeight = validateManualHeight(manualHeightInput.value);
      measurement = {
        ...common,
        measurementType: 'manual',
        method: null,
        distance: null,
        clinometerPercent: null,
        terrainSlopePercent: null,
        observerHeight: null,
        horizontalDistance: null,
        estimatedHeight,
        terrainElevationDifference: null,
        clinometerAngle: null,
        terrainAngle: null,
        methodDescription: '',
      };
      renderManualResult(estimatedHeight);
    } else {
      result = buildMeasurementResult();
      measurement = {
        ...common,
        measurementType: 'clinometer',
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
      };
      renderResult(result);
    }

    if (state.editingId) {
      state.measurements = updateMeasurementById(state.editingId, measurement);
      state.editingId = null;
      setLocalizedText(saveButton, 'action.save');
      showSuccess('message.measurementUpdated');
    } else {
      state.measurements = addMeasurement(measurement);
      includeTrunkDiameters.checked = false;
      trunkDiameterSection.hidden = true;
      renderTrunkDiameterInputs();
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
    cell.colSpan = 15;
    cell.className = 'empty-state';
    cell.textContent = t('table.empty');
    row.append(cell);
    tableBody.replaceChildren(row);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const entry of state.measurements) {
    const row = document.createElement('tr');
    const measurementType = entry.measurementType === 'manual' ? 'manual' : 'clinometer';
    const treeLabel = entry.treeId || t('table.unnamedTree');
    const scientificName = entry.speciesScientificName
      || findSpeciesByIfnCode(entry.speciesIfnCode)?.scientificName
      || '';
    const values = [
      treeLabel,
      scientificName,
      t(`measurement.type${measurementType === 'manual' ? 'Manual' : 'Clinometer'}`),
      entry.date ? i18n.formatDate(entry.date) : t('common.notAvailable'),
      measurementType === 'manual'
        ? t('common.notAvailable')
        : entry.method === 'horizontal' ? t('distance.horizontal') : t('distance.slope'),
      formatMeters(entry.distance),
      formatPercent(entry.clinometerPercent),
      formatPercent(entry.terrainSlopePercent),
      formatMeters(entry.observerHeight),
      formatMeters(entry.estimatedHeight),
      formatCoordinate(entry.latitude),
      formatCoordinate(entry.longitude),
      getPhytosanitaryStatusLabel(
        entry.phytosanitaryStatus,
        t,
        t('tree.phytosanitaryNotEvaluated'),
      ),
      formatTrunkDiameters(entry.trunkDiameters),
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

function formatTrunkDiameters(diameters) {
  if (!Array.isArray(diameters) || diameters.length === 0) {
    return t('common.notAvailable');
  }

  return diameters
    .map((diameter, index) => `${index + 1}: ${i18n.formatNumber(diameter, { maximumFractionDigits: 3 })} cm`)
    .join('; ');
}

tableBody.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const { action, id } = button.dataset;
  const target = state.measurements.find((entry) => entry.id === id);
  if (!target) return;

  if (action === 'delete') {
    const treeName = target.treeId || t('table.unnamedTree');
    if (!window.confirm(t('message.confirmDelete', { treeName }))) return;
    state.measurements = deleteMeasurementById(id);
    if (state.editingId === id) {
      state.editingId = null;
      setLocalizedText(saveButton, 'action.save');
    }
    renderTable();
    showSuccess('message.measurementDeleted');
    return;
  }

  if (action === 'edit') {
    locationWasAdjusted = true;
    state.editingId = id;
    const measurementType = target.measurementType === 'manual' ? 'manual' : 'clinometer';
    document.querySelector(`input[name="measurementType"][value="${measurementType}"]`).checked = true;
    updateMeasurementType();
    setLocalizedText(saveButton, 'action.update');
    document.getElementById('treeId').value = target.treeId || '';
    const targetSpecies = target.speciesIfnCode != null && target.speciesIfnCode !== ''
      ? findSpeciesByIfnCode(target.speciesIfnCode)
      : null;
    speciesSelect.value = targetSpecies
      ? getSpeciesDisplayName(targetSpecies)
      : target.speciesScientificName || '';
    phytosanitaryStatusSelect.value = target.phytosanitaryStatus || '';
    const trunkDiameters = Array.isArray(target.trunkDiameters) ? target.trunkDiameters : [];
    includeTrunkDiameters.checked = trunkDiameters.length > 0;
    trunkDiameterSection.hidden = !includeTrunkDiameters.checked;
    renderTrunkDiameterInputs(trunkDiameters.length ? trunkDiameters.map(String) : ['']);
    document.getElementById('measurementDate').value = target.date || new Date().toISOString().slice(0, 10);
    document.getElementById('notes').value = target.notes || '';
    if (measurementType === 'clinometer') {
      document.querySelector(`input[name="distanceMethod"][value="${target.method ?? 'horizontal'}"]`).checked = true;
    }
    document.getElementById('distance').value = target.distance ?? '';
    document.getElementById('clinometerPercent').value = target.clinometerPercent ?? '';
    document.getElementById('terrainSlopePercent').value = target.terrainSlopePercent ?? '';
    document.getElementById('observerHeight').value = target.observerHeight ?? '';
    manualHeightInput.value = measurementType === 'manual' ? String(target.estimatedHeight) : '';
    if (measurementType === 'manual') {
      document.getElementById('distance').value = '';
      document.getElementById('clinometerPercent').value = '';
      document.getElementById('terrainSlopePercent').value = '';
      document.getElementById('observerHeight').value = '';
    }
    latitudeInput.value = target.latitude ?? '';
    longitudeInput.value = target.longitude ?? '';
    locationMap?.setCoordinates({
      latitude: target.latitude ?? null,
      longitude: target.longitude ?? null,
    });
    if (measurementType === 'manual') renderManualResult(target.estimatedHeight);
    else calculateAndRender();
  }
});

languageSelect.addEventListener('change', () => {
  i18n.setLanguage(languageSelect.value);
  populateSpeciesOptions();
  renderTrunkDiameterInputs(getTrunkDiameterInputValues());
  locationMap?.setLanguage();
  renderTable();
  if (state.lastResult) renderResult(state.lastResult);
  else if (state.lastManualHeight !== null) renderManualResult(state.lastManualHeight);
  if (state.editingId) {
    setLocalizedText(saveButton, 'action.update');
  } else {
    setLocalizedText(saveButton, 'action.save');
  }
});

renderTrunkDiameterInputs();
renderTable();
resultValue.textContent = formatMeters(0);
updateMeasurementType();
