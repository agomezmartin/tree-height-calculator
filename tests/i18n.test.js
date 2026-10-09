import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

import {
  createI18n,
  detectLanguage,
  dictionaries,
  getInitialLanguage,
  LANGUAGE_STORAGE_KEY,
  validateDictionaries,
} from '../js/i18n.js';
import { entries as spanishEntries } from '../locales/es.js';
import { entries as englishEntries } from '../locales/en.js';

test('all language dictionaries are complete, unique, and non-empty', () => {
  assert.equal(validateDictionaries(), true);
  assert.throws(() => validateDictionaries({
    es: [['example.key', 'Texto'], ['example.key', 'Duplicada']],
    en: [['example.key', 'Text']],
  }), /Duplicate translation key/);
  assert.throws(() => validateDictionaries({
    es: [['example.key', '']],
    en: [['example.key', 'Text']],
  }), /Empty or invalid translation/);
  assert.throws(() => validateDictionaries({
    es: [['example.key', 'Texto']],
    en: [['another.key', 'Text']],
  }), /Incomplete translations/);
  assert.equal(spanishEntries.length, englishEntries.length);
  assert.deepEqual(Object.keys(dictionaries).sort(), ['ca', 'ca-val', 'en', 'es', 'eu', 'gl']);
  for (const [language, dictionary] of Object.entries(dictionaries)) {
    assert.equal(Object.keys(dictionary).length, spanishEntries.length, `Unexpected key count for ${language}`);
  }
});

test('all translation keys used by the HTML exist in every dictionary', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const document = new JSDOM(html).window.document;
  const translationAttributes = [
    'data-i18n',
    'data-i18n-content',
    'data-i18n-placeholder',
    'data-i18n-aria-label',
  ];

  for (const attribute of translationAttributes) {
    for (const element of document.querySelectorAll(`[${attribute}]`)) {
      const key = element.getAttribute(attribute);
      for (const [language, dictionary] of Object.entries(dictionaries)) {
        assert.ok(Object.hasOwn(dictionary, key), `Missing ${language} HTML translation: ${key}`);
      }
    }
  }

  const textWalker = document.createTreeWalker(document, document.defaultView.NodeFilter.SHOW_TEXT);
  while (textWalker.nextNode()) {
    const textNode = textWalker.currentNode;
    if (textNode.textContent.trim() === '') continue;
    assert.ok(
      textNode.parentElement.hasAttribute('data-i18n'),
      `Hardcoded HTML text: "${textNode.textContent.trim()}"`,
    );
  }

  for (const [attribute, translationAttribute] of [
    ['placeholder', 'data-i18n-placeholder'],
    ['aria-label', 'data-i18n-aria-label'],
    ['title', 'data-i18n-title'],
  ]) {
    for (const element of document.querySelectorAll(`[${attribute}]`)) {
      assert.ok(
        element.hasAttribute(translationAttribute),
        `Hardcoded ${attribute}: "${element.getAttribute(attribute)}"`,
      );
    }
  }

  for (const element of document.querySelectorAll('meta[name="description"][content]')) {
    assert.ok(element.hasAttribute('data-i18n-content'), 'Hardcoded metadata content');
  }
});

test('language detection normalizes regional tags and stored preference takes precedence', () => {
  assert.equal(detectLanguage({ languages: ['fr-CA', 'en-US'] }), 'en');
  assert.equal(detectLanguage({ language: 'es-MX' }), 'es');
  assert.equal(detectLanguage({ language: 'ca-ES' }), 'ca');
  assert.equal(detectLanguage({ language: 'eu-ES' }), 'eu');
  assert.equal(detectLanguage({ language: 'gl-ES' }), 'gl');
  assert.equal(detectLanguage({ language: 'ca-ES-valencia' }), 'ca-val');
  assert.equal(detectLanguage({ language: 'fr-FR' }), 'es');
  assert.equal(getInitialLanguage({
    navigatorObject: { language: 'en-US' },
    storage: { getItem: () => 'ca-val' },
  }), 'ca-val');
  assert.equal(getInitialLanguage({
    navigatorObject: { language: 'en-US' },
    storage: { getItem: () => 'fr-FR' },
  }), 'en');
  assert.equal(getInitialLanguage({
    navigatorObject: { language: 'en-US' },
    storage: { getItem: () => { throw new Error('storage unavailable'); } },
  }), 'en');
});

test('language changes update document content, attributes, placeholders and formatters', () => {
  const dom = new JSDOM(`<!doctype html><html lang="es"><head>
    <title data-i18n="app.title"></title>
    <meta name="description" data-i18n-content="app.description">
  </head><body>
    <label data-i18n="language.label"></label>
    <input data-i18n-placeholder="tree.idPlaceholder" data-i18n-aria-label="tree.id">
    <p id="status" data-i18n-dynamic="gps.initialFailure"
      data-i18n-parameters='{"error":"permission denied"}'></p>
    <select id="languageSelect"><option value="es"></option><option value="en"></option></select>
  </body></html>`, { url: 'https://example.test/' });
  const i18n = createI18n({
    navigatorObject: { language: 'es' },
    storage: dom.window.localStorage,
    documentObject: dom.window.document,
  });

  assert.equal(i18n.getLanguage(), 'es');
  assert.equal(i18n.setLanguage('en'), true);
  assert.equal(dom.window.document.documentElement.lang, 'en');
  assert.equal(dom.window.document.title, 'Tree Height Calculator');
  assert.equal(dom.window.document.querySelector('meta[name="description"]').content,
    'Calculate tree height from clinometer measurements.');
  assert.equal(dom.window.document.querySelector('label').textContent, 'Language');
  assert.equal(dom.window.document.querySelector('input').placeholder, 'E.g. Pine 3');
  assert.equal(dom.window.document.querySelector('input').getAttribute('aria-label'), 'ID / name');
  assert.match(dom.window.document.getElementById('status').textContent, /Could not center automatically/);
  assert.equal(dom.window.document.getElementById('languageSelect').value, 'en');
  assert.equal(dom.window.localStorage.getItem(LANGUAGE_STORAGE_KEY), 'en');
  assert.equal(i18n.formatNumber(1234.5), '1,234.5');
  assert.equal(i18n.formatDate('2024-03-05'), 'Mar 5, 2024');
  assert.equal(i18n.setLanguage('fr'), false);

  dom.window.close();
});

test('all six language selections return localized interface strings', () => {
  const expectedTitles = {
    es: 'Calculadora de altura de árboles',
    en: 'Tree Height Calculator',
    ca: 'Calculadora d’alçària dels arbres',
    eu: 'Zuhaitzen altuera kalkulagailua',
    gl: 'Calculadora da altura das árbores',
    'ca-val': 'Calculadora de l’altura dels arbres',
  };
  const i18n = createI18n({
    navigatorObject: { language: 'es' },
    storage: undefined,
    documentObject: undefined,
  });

  for (const [language, title] of Object.entries(expectedTitles)) {
    assert.equal(i18n.setLanguage(language, { persist: false }), true);
    assert.equal(i18n.t('app.title'), title);
    if (language !== 'es') {
      assert.notEqual(i18n.t('gps.permissionDenied'), dictionaries.es['gps.permissionDenied']);
    }
  }
});
