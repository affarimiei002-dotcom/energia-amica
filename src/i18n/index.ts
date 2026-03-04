import { it } from './it';
import { en } from './en';

const translations = { it, en } as const;
type Locale = keyof typeof translations;

let currentLocale: Locale = 'it';

export function setLocale(locale: Locale) {
  currentLocale = locale;
}

export function t(path: string): string {
  const keys = path.split('.');
  let result: any = translations[currentLocale];
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = result[key];
    } else {
      // Fallback to Italian
      result = translations.it;
      for (const k of keys) {
        if (result && typeof result === 'object' && k in result) {
          result = result[k];
        } else {
          return path;
        }
      }
      return typeof result === 'string' ? result : path;
    }
  }
  return typeof result === 'string' ? result : path;
}

export function useTranslation() {
  return { t };
}
