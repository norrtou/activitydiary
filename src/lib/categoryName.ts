/**
 * Resolve a category's display name: built-in categories are translated,
 * custom categories use their user-given name.
 */
import type { Translate } from '../i18n';
import type { Category } from './types';

export function categoryName(cat: Category, t: Translate): string {
  if (cat.builtinKey) return t(`cat.${cat.builtinKey}`);
  return cat.name ?? '';
}

/**
 * Resolve a category's quick-pick labels: a user-edited list wins (an empty
 * array means "removed them all"); built-ins otherwise fall back to the
 * translated '|'-separated defaults in the dictionaries.
 */
export function categoryQuickLabels(cat: Category, t: Translate): string[] {
  if (cat.quickLabels) return cat.quickLabels;
  if (cat.builtinKey) return t(`quick.${cat.builtinKey}`).split('|');
  return [];
}
