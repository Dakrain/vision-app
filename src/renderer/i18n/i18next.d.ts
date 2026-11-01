import 'i18next';
import type vi from '../locales/vi.json';

// Keys checked at compile time: t('meeting.room.title') must exist in
// vi.json (the reference language).
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof vi };
  }
}
