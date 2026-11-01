/**
 * Translations for the main process (dialogs, the share bar…). It cannot use
 * the renderer's i18next, so it reads the same merged JSON files; the
 * renderer tells the current language over IPC (`set-language`) at startup
 * and whenever it changes. Vietnamese until told.
 */
import { ipcMain } from 'electron';
import vi from '../renderer/locales/vi.json';
import en from '../renderer/locales/en.json';
import zh from '../renderer/locales/zh.json';

type Language = 'vi' | 'en' | 'zh';

const RESOURCES: Record<Language, unknown> = { vi, en, zh };

let current: Language = 'vi';
const listeners = new Set<(language: Language) => void>();

const lookup = (language: Language, key: string): string | undefined => {
  const value = key
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === 'object'
          ? (node as Record<string, unknown>)[part]
          : undefined,
      RESOURCES[language],
    );
  return typeof value === 'string' ? value : undefined;
};

/** `key` in the current language (falls back to Vietnamese, then the key). */
export const tMain = (
  key: string,
  vars: Record<string, string | number> = {},
): string => {
  const text = lookup(current, key) ?? lookup('vi', key) ?? key;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
};

export const mainLanguage = () => current;

/** Called when the renderer switches the language. */
export const onMainLanguageChange = (fn: (language: Language) => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

ipcMain.on('set-language', (_event, language: unknown) => {
  if (language !== 'vi' && language !== 'en' && language !== 'zh') return;
  if (language === current) return;
  current = language;
  listeners.forEach((fn) => fn(language));
});
