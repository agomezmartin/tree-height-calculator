const TREE_TYPE_TRANSLATION_KEYS = Object.freeze({
  broadleaf: 'tree.coverTypeBroadleaf',
  conifer: 'tree.coverTypeConifer',
  palm: 'tree.coverTypePalm',
});

export function getTreeTypeLabel(treeType, translate, emptyLabel = '') {
  if (treeType === null || treeType === undefined || treeType === '') {
    return emptyLabel;
  }

  const translationKey = Object.hasOwn(TREE_TYPE_TRANSLATION_KEYS, treeType)
    ? TREE_TYPE_TRANSLATION_KEYS[treeType]
    : null;
  return translationKey ? translate(translationKey) : String(treeType);
}
