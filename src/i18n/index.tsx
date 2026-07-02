/**
 * Lightweight typed i18n.
 *
 * - Language auto-detected from the browser on first visit, then persisted.
 * - `useT()` returns a translate function with compile-time-checked keys.
 * - <html lang> is kept in sync for accessibility and SEO.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { en, type MessageKey } from './en';
import { sv } from './sv';

export type Language = 'en' | 'sv';

const STORAGE_KEY = 'activity-diary.lang';
const dictionaries: Record<Language, Record<MessageKey, string>> = { en, sv };

/** Translate function: t('week.title', { num: 27 }). */
export type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

interface I18nContextValue {
  lang: Language;
  /** BCP 47 locale for Intl formatting. */
  locale: string;
  setLang: (lang: Language) => void;
  t: Translate;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function detectLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'sv') return saved;
  } catch {
    // localStorage unavailable — fall through to browser detection.
  }
  return navigator.language?.toLowerCase().startsWith('sv') ? 'sv' : 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(detectLanguage);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Non-fatal: language just won't persist across visits.
    }
  }, []);

  const t = useCallback<Translate>(
    (key, vars) => {
      let text = dictionaries[lang][key] ?? en[key] ?? key;
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          text = text.replaceAll(`{${name}}`, String(value));
        }
      }
      return text;
    },
    [lang],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ lang, locale: lang === 'sv' ? 'sv-SE' : 'en-GB', setLang, t }),
    [lang, setLang, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Access the full i18n context (language, locale, setter, translate). */
export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <LanguageProvider>');
  return ctx;
}

/** Shorthand when only the translate function is needed. */
export function useT(): Translate {
  return useI18n().t;
}

export type { MessageKey };
