const STATUS_TRANSLATION_KEYS = Object.freeze({
  good: 'tree.phytosanitaryGood',
  acceptable: 'tree.phytosanitaryAcceptable',
  deficient: 'tree.phytosanitaryDeficient',
  critical: 'tree.phytosanitaryCritical',
});

export function getPhytosanitaryStatusLabel(status, translate, emptyLabel = '') {
  if (status === null || status === undefined || status === '') {
    return emptyLabel;
  }

  const translationKey = Object.hasOwn(STATUS_TRANSLATION_KEYS, status)
    ? STATUS_TRANSLATION_KEYS[status]
    : null;
  return translationKey ? translate(translationKey) : String(status);
}
