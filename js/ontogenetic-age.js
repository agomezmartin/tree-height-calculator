export const ONTOGENETIC_AGES = Object.freeze([
  'young',
  'adult',
  'mature',
  'senescent',
]);

const translationKeys = Object.freeze({
  young: 'tree.ontogeneticAgeYoung',
  adult: 'tree.ontogeneticAgeAdult',
  mature: 'tree.ontogeneticAgeMature',
  senescent: 'tree.ontogeneticAgeSenescent',
});

export function normalizeOntogeneticAge(value) {
  return ONTOGENETIC_AGES.includes(value) ? value : null;
}

export function getOntogeneticAgeLabel(value, translate) {
  const age = normalizeOntogeneticAge(value);
  return age ? translate(translationKeys[age]) : null;
}
