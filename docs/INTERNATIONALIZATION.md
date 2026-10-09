# Internationalization

The browser UI supports Spanish (`es`), English (`en`), Catalan (`ca`), Basque (`eu`), Galician (`gl`), and Valencian (`ca-val`) without a server or build step. Translation strings live in `locales/<language>.js` as arrays of key/value pairs. Keep the key sets identical, use stable semantic keys, and provide a non-empty value for every key. `validateDictionaries()` checks duplicate keys, empty values, and missing translations; the i18n tests exercise those checks.

`js/i18n.js` detects the browser language when there is no saved preference (including Valencian browser tags), persists an explicit selection in local storage, applies `data-i18n` and related attributes, and formats numbers and dates with `Intl`. Dynamic UI messages should use `setLocalizedText(element, key, parameters)` so they can be refreshed when the language changes. Errors that originate in calculation code are mapped to stable translation keys in the same module.

Keep calculation method values (`horizontal` and `slope`), saved numeric values, ISO dates, and GPS coordinates language-independent. Translate their labels only when displaying them, including in the Excel export. When adding a visible UI string, add it to every supported locale dictionary and mark its HTML element with the appropriate `data-i18n`, `data-i18n-placeholder`, `data-i18n-aria-label`, or `data-i18n-content` attribute.

Run `npm test` to check dictionary integrity and UI, GPS, storage, and export behavior.
