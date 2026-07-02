/**
 * Reactive category hooks backed by Dexie live queries.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { activeCategories, allCategories } from '../lib/db';
import type { Category } from '../lib/types';

/** Non-archived categories in display order (undefined while loading). */
export function useActiveCategories(): Category[] | undefined {
  return useLiveQuery(activeCategories, []);
}

/** Every category, including archived ones. */
export function useAllCategories(): Category[] | undefined {
  return useLiveQuery(allCategories, []);
}

/** Fast id → category lookup map. */
export function useCategoryMap(): Map<number, Category> {
  const cats = useAllCategories();
  return new Map((cats ?? []).map((c) => [c.id!, c]));
}
