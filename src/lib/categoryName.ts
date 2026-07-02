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
