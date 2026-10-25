import test from 'node:test';
import assert from 'node:assert/strict';

import { getPhytosanitaryStatusLabel } from '../js/phytosanitary.js';
import { i18n } from '../js/i18n.js';

test('phytosanitary status labels handle every status and unevaluated legacy values', () => {
  const translate = (key) => i18n.t(key);

  assert.equal(getPhytosanitaryStatusLabel('good', translate), 'Bueno');
  assert.equal(getPhytosanitaryStatusLabel('acceptable', translate), 'Aceptable');
  assert.equal(getPhytosanitaryStatusLabel('deficient', translate), 'Deficiente');
  assert.equal(getPhytosanitaryStatusLabel('critical', translate), 'Crítico');
  assert.equal(
    getPhytosanitaryStatusLabel(undefined, translate, translate('tree.phytosanitaryNotEvaluated')),
    'Sin evaluar',
  );
  assert.equal(
    getPhytosanitaryStatusLabel(null, translate, translate('tree.phytosanitaryNotEvaluated')),
    'Sin evaluar',
  );
  assert.equal(
    getPhytosanitaryStatusLabel('', translate, translate('tree.phytosanitaryNotEvaluated')),
    'Sin evaluar',
  );
  assert.equal(getPhytosanitaryStatusLabel(null, translate), '');
});
