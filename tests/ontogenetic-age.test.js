import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getOntogeneticAgeLabel,
  normalizeOntogeneticAge,
  ONTOGENETIC_AGES,
} from '../js/ontogenetic-age.js';

test('ontogenetic age accepts and labels only the four supported categories', () => {
  const translate = (key) => key;
  assert.deepEqual(ONTOGENETIC_AGES, ['young', 'adult', 'mature', 'senescent']);
  assert.deepEqual(
    ONTOGENETIC_AGES.map((age) => normalizeOntogeneticAge(age)),
    ONTOGENETIC_AGES,
  );
  assert.deepEqual(
    ONTOGENETIC_AGES.map((age) => getOntogeneticAgeLabel(age, translate)),
    [
      'tree.ontogeneticAgeYoung',
      'tree.ontogeneticAgeAdult',
      'tree.ontogeneticAgeMature',
      'tree.ontogeneticAgeSenescent',
    ],
  );
  for (const invalidValue of [undefined, null, '', 'unknown', 'Joven']) {
    assert.equal(normalizeOntogeneticAge(invalidValue), null);
    assert.equal(getOntogeneticAgeLabel(invalidValue, translate), null);
  }
});
