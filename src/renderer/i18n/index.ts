import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import 'dayjs/locale/en';
import 'dayjs/locale/zh-cn';
import vi from '../locales/vi.json';
import en from '../locales/en.json';
import zh from '../locales/zh.json';

/** The app's languages; Vietnamese is the default and the fallback. */
export const LANGUAGES = ['vi', 'en', 'zh'] as const;
export type Language = (typeof LANGUAGES)[number];

const STORAGE_KEY = 'vision.language';

const stored = (): Language => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value && (LANGUAGES as readonly string[]).includes(value)) {
      return value as Language;
    }
  } catch (_) {
    // Storage unavailable: the default.
  }
  return 'vi';
};

const DAYJS: Record<Language, string> = { vi: 'vi', en: 'en', zh: 'zh-cn' };

i18n.use(initReactI18next).init({
  resources: {
    vi: { translation: vi },
    en: { translation: en },
    zh: { translation: zh },
  },
  lng: stored(),
  fallbackLng: 'vi',
  // Same placeholders as mobile: "Cuộc họp của {name}".
  interpolation: { escapeValue: false, prefix: '{', suffix: '}' },
  returnNull: false,
});
dayjs.locale(DAYJS[i18n.language as Language] ?? 'vi');

/** Switches the language (kept for the next launches). */
export async function setLanguage(language: Language) {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch (_) {
    // Not kept; still switched for this session.
  }
  dayjs.locale(DAYJS[language]);
  await i18n.changeLanguage(language);
}

export default i18n;
