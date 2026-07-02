/**
 * Core domain types for Activity Diary.
 *
 * All diary data lives on the user's device (IndexedDB via Dexie).
 * Times inside a day are stored as minutes from midnight (0–1440) so that
 * arithmetic (durations, overlaps, slot snapping) never touches Date math.
 */

/** How the activity affected the person's energy: −2 (very draining) … +2 (very energising). */
export type EnergyRating = -2 | -1 | 0 | 1 | 2;

/** Simple wellbeing rating during the activity: 1 (low) … 5 (high). */
export type MoodRating = 1 | 2 | 3 | 4 | 5;

/** A calendar date key in local time, formatted YYYY-MM-DD. */
export type DateKey = string;

/**
 * One registered activity block.
 * An entry never crosses midnight — entries that would are split on save,
 * so every entry satisfies 0 <= startMin < endMin <= 1440.
 */
export interface Entry {
  /** Auto-incremented by Dexie. */
  id?: number;
  date: DateKey;
  /** Minutes from midnight, inclusive start. */
  startMin: number;
  /** Minutes from midnight, exclusive end (1440 = midnight at end of day). */
  endMin: number;
  categoryId: number;
  /** Optional short user label, e.g. "Lunch with Anna". */
  label?: string;
  energy?: EnergyRating;
  mood?: MoodRating;
  note?: string;
}

/**
 * An activity category. The eight built-in categories carry a `builtinKey`
 * that is resolved through i18n so their names follow the app language;
 * user-created categories carry a fixed `name` instead.
 */
export interface Category {
  id?: number;
  /** i18n key suffix for built-in categories (e.g. "sleep" -> cat.sleep). */
  builtinKey?: BuiltinCategoryKey;
  /** User-given name for custom categories. */
  name?: string;
  /** References a validated color swatch in lib/palette.ts. */
  swatchId: string;
  /** Emoji shown next to the category name. */
  icon: string;
  sortOrder: number;
  /** 1 = hidden from pickers but kept so old entries still resolve. */
  archived?: 0 | 1;
}

export type BuiltinCategoryKey =
  | 'sleep'
  | 'personal'
  | 'work'
  | 'chores'
  | 'social'
  | 'physical'
  | 'leisure'
  | 'other';

/** App-wide preferences, persisted in localStorage (see lib/settings.ts). */
export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  /** 0 = Sunday, 1 = Monday. */
  firstDayOfWeek: 0 | 1;
  /** Hour the Today timeline scrolls to / visually starts at. */
  dayStartHour: number;
  /** Snap grid for the timeline, in minutes. */
  slotMinutes: 15 | 30 | 60;
}
