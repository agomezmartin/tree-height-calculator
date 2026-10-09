import { entries as spanishEntries } from '../locales/es.js';
import { entries as englishEntries } from '../locales/en.js';
import { entries as catalanEntries } from '../locales/ca.js';
import { entries as basqueEntries } from '../locales/eu.js';
import { entries as galicianEntries } from '../locales/gl.js';
import { entries as valencianEntries } from '../locales/ca-val.js';

export const LANGUAGE_STORAGE_KEY = 'treeHeightCalculator.language';
export const DEFAULT_LANGUAGE = 'es';
export const SUPPORTED_LANGUAGES = Object.freeze(['es', 'en', 'ca', 'eu', 'gl', 'ca-val']);

const localeByLanguage = Object.freeze({
  es: 'es-ES',
  en: 'en',
  ca: 'ca-ES',
  eu: 'eu-ES',
  gl: 'gl-ES',
  'ca-val': 'ca-ES-valencia',
});

function createDictionary(entries, language) {
  const dictionary = Object.create(null);
  for (const [key, value] of entries) {
    if (Object.hasOwn(dictionary, key)) {
      throw new Error(`Duplicate translation key "${key}" in ${language}.`);
    }
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`Empty or invalid translation for "${key}" in ${language}.`);
    }
    dictionary[key] = value;
  }
  return dictionary;
}

export const dictionaries = Object.freeze({
  es: Object.freeze(createDictionary(spanishEntries, 'es')),
  en: Object.freeze(createDictionary(englishEntries, 'en')),
  ca: Object.freeze(createDictionary(catalanEntries, 'ca')),
  eu: Object.freeze(createDictionary(basqueEntries, 'eu')),
  gl: Object.freeze(createDictionary(galicianEntries, 'gl')),
  'ca-val': Object.freeze(createDictionary(valencianEntries, 'ca-val')),
});

export function validateDictionaries(sourceEntries = {
  es: spanishEntries,
  en: englishEntries,
  ca: catalanEntries,
  eu: basqueEntries,
  gl: galicianEntries,
  'ca-val': valencianEntries,
}) {
  const languages = Object.keys(sourceEntries);
  if (!languages.includes('es') || !languages.includes('en')) {
    throw new Error('Spanish and English dictionaries are required.');
  }

  const validated = Object.fromEntries(
    languages.map((language) => [language, createDictionary(sourceEntries[language], language)]),
  );
  const baseKeys = Object.keys(validated.es);
  const missingTranslations = languages.flatMap((language) => {
    const missing = baseKeys.filter((key) => !Object.hasOwn(validated[language], key));
    const extra = Object.keys(validated[language]).filter((key) => !Object.hasOwn(validated.es, key));
    return [
      ...missing.map((key) => `${language}: ${key}`),
      ...extra.map((key) => `${language}: unexpected ${key}`),
    ];
  });

  if (missingTranslations.length) {
    throw new Error(`Incomplete translations: ${missingTranslations.join(', ')}.`);
  }

  return true;
}

validateDictionaries();

function normalizeLanguage(language) {
  if (typeof language !== 'string') return null;
  const parts = language.trim().toLowerCase().replace(/_/g, '-').split('-');
  if (parts[0] === 'ca' && (parts.includes('valencia') || parts.includes('val'))) return 'ca-val';
  return SUPPORTED_LANGUAGES.includes(parts[0]) ? parts[0] : null;
}

export function detectLanguage(navigatorObject) {
  const preferences = Array.isArray(navigatorObject?.languages) ? [...navigatorObject.languages] : [];
  if (navigatorObject?.language) preferences.push(navigatorObject.language);
  return preferences.map(normalizeLanguage).find(Boolean) ?? DEFAULT_LANGUAGE;
}

export function getInitialLanguage({ navigatorObject, storage }) {
  try {
    const savedLanguage = normalizeLanguage(storage?.getItem(LANGUAGE_STORAGE_KEY));
    if (savedLanguage) return savedLanguage;
  } catch {
    // Language detection still works when browser storage is unavailable.
  }
  return detectLanguage(navigatorObject);
}

function getBrowserStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function createI18n({
  navigatorObject = globalThis.navigator,
  storage = getBrowserStorage(),
  documentObject = globalThis.document,
  dictionarySet = dictionaries,
} = {}) {
  let language = getInitialLanguage({ navigatorObject, storage });

  function translate(key, parameters = {}) {
    const value = dictionarySet[language]?.[key] ?? dictionarySet.es?.[key];
    if (value === undefined) {
      if (documentObject?.documentElement?.dataset.i18nDebug === 'true') {
        console.warn(`Missing translation key: ${key}`);
      }
      return key;
    }
    return value.replace(/\{([^}]+)\}/g, (match, name) => {
      if (!Object.hasOwn(parameters, name)) return match;
      const parameter = parameters[name];
      if (parameter && typeof parameter === 'object') {
        return typeof parameter.key === 'string'
          ? translate(parameter.key)
          : String(parameter.fallback ?? '');
      }
      return String(parameter);
    });
  }

  function applyTranslations(root = documentObject) {
    if (!root) return;
    root.documentElement?.setAttribute('lang', language);
    const title = root.querySelector('title[data-i18n]');
    if (title) title.textContent = translate(title.dataset.i18n);
    const description = root.querySelector('meta[name="description"][data-i18n-content]');
    if (description) description.content = translate(description.dataset.i18nContent);

    for (const element of root.querySelectorAll('[data-i18n]')) {
      if (element !== title) element.textContent = translate(element.dataset.i18n);
    }
    for (const element of root.querySelectorAll('[data-i18n-placeholder]')) {
      element.setAttribute('placeholder', translate(element.dataset.i18nPlaceholder));
    }
    for (const attribute of ['aria-label', 'title', 'aria-description']) {
      const dataAttribute = `data-i18n-${attribute}`;
      for (const element of root.querySelectorAll(`[${dataAttribute}]`)) {
        element.setAttribute(attribute, translate(element.getAttribute(dataAttribute)));
      }
    }
    for (const element of root.querySelectorAll('[data-i18n-dynamic]')) {
      const parameters = element.dataset.i18nParameters
        ? JSON.parse(element.dataset.i18nParameters)
        : {};
      element.textContent = translate(element.dataset.i18nDynamic, parameters);
    }
    const languageSelect = root.querySelector('#languageSelect');
    if (languageSelect) languageSelect.value = language;
  }

  function setLanguage(nextLanguage, { persist = true } = {}) {
    const normalized = normalizeLanguage(nextLanguage);
    if (!normalized) return false;
    language = normalized;
    if (persist) {
      try {
        storage?.setItem(LANGUAGE_STORAGE_KEY, language);
      } catch {
        // The language remains active for this page even if it cannot be persisted.
      }
    }
    applyTranslations();
    return true;
  }

  function formatNumber(value, options = {}) {
    return new Intl.NumberFormat(localeByLanguage[language], options).format(value);
  }

  function formatDate(value, options = { dateStyle: 'medium' }) {
    const [year, month, day] = String(value).split('-').map(Number);
    const date = Number.isInteger(year) && Number.isInteger(month) && Number.isInteger(day)
      ? new Date(year, month - 1, day)
      : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value ?? '');
    return new Intl.DateTimeFormat(localeByLanguage[language], options).format(date);
  }

  return {
    t: translate,
    applyTranslations,
    setLanguage,
    getLanguage: () => language,
    formatNumber,
    formatDate,
  };
}

export const i18n = createI18n();
export const t = i18n.t;

export function setLocalizedText(element, key, parameters = {}) {
  element.dataset.i18nDynamic = key;
  element.dataset.i18nParameters = JSON.stringify(parameters);
  element.textContent = i18n.t(key, parameters);
}

const errorKeys = new Map([
    ['Selecciona un método de medición: distancia horizontal o distancia sobre el terreno.', 'validation.distanceMethod'],
    ['La distancia debe ser un número mayor que 0 y estar expresada en metros.', 'validation.distance'],
    ['La lectura del clinómetro debe ser un valor numérico válido.', 'validation.clinometer'],
    ['La pendiente del terreno debe ser un valor numérico válido.', 'validation.slope'],
    ['La altura del instrumento debe ser un número mayor o igual a 0.', 'validation.observerHeight'],
    ['La distancia horizontal debe ser un número válido.', 'validation.horizontalDistance'],
    ['La distancia debe ser un número mayor que 0 para calcular la proyección horizontal.', 'validation.horizontalDistancePositive'],
    ['La pendiente del terreno debe ser un número válido.', 'validation.slopeValid'],
    ['La lectura del clinómetro debe ser un número válido.', 'validation.clinometerValid'],
    ['Método de medición no soportado.', 'validation.methodUnsupported'],
    ['La librería Excel no está disponible.', 'export.errorLibrary'],
    ['Introduce tanto la latitud como la longitud, o deja ambos campos vacíos.', 'gps.coordinatesPairRequired'],
    ['La latitud debe ser un número entre -90 y 90 grados decimales.', 'gps.invalidLatitude'],
    ['La longitud debe ser un número entre -180 y 180 grados decimales.', 'gps.invalidLongitude'],
]);

export function getErrorTranslationKey(message) {
  return errorKeys.get(message) ?? 'message.genericError';
}

export function translateErrorMessage(message) {
  return i18n.t(getErrorTranslationKey(message));
}
