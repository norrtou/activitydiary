/**
 * App settings store — a tiny localStorage-backed external store consumed via
 * useSyncExternalStore, so any component re-renders when a setting changes.
 * (Language is handled separately by the i18n LanguageProvider.)
 */
import { useSyncExternalStore } from 'react';
import type { AppSettings } from './types';

const STORAGE_KEY = 'activity-diary.settings';

export const DEFAULT_SETTINGS: AppSettings = {
  firstDayOfWeek: 1,
  dayStartHour: 6,
  slotMinutes: 30,
};

function load(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

let current = load();
const listeners = new Set<() => void>();

export function getSettings(): AppSettings {
  return current;
}

export function updateSettings(patch: Partial<AppSettings>): void {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Storage full or blocked — settings still apply for this session.
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Reactive settings hook. */
export function useSettings(): AppSettings {
  return useSyncExternalStore(subscribe, getSettings);
}

const WELCOME_KEY = 'activity-diary.welcomed';

/** Whether the visitor has left the welcome page via "Get started". */
export function hasSeenWelcome(): boolean {
  try {
    return localStorage.getItem(WELCOME_KEY) === '1';
  } catch {
    return true; // No storage — don't trap the user on the welcome page.
  }
}

export function markWelcomeSeen(): void {
  try {
    localStorage.setItem(WELCOME_KEY, '1');
  } catch {
    // Non-fatal: the welcome page will simply show again next visit.
  }
}

