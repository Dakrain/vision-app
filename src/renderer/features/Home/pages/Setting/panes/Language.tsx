import { useTranslation } from 'react-i18next';
import { useSocial } from '@/shared/social/SocialProvider';
import { LANGUAGES, type Language as Lang, setLanguage } from '@/renderer/i18n';
import { syncLanguage } from '@/renderer/i18n/sync';

const FLAGS: Record<Lang, string> = { vi: '🇻🇳', en: '🇺🇸', zh: '🇨🇳' };

/** The current language's name, for the Settings menu row. */
export function useCurrentLanguageLabel() {
  const { t, i18n } = useTranslation();
  return t(`language.${i18n.language as Lang}`);
}

/**
 * "Ngôn ngữ" (Figma 10946:60015): Vietnamese, English or Chinese. Applies at
 * once, is kept for the next launches, and is sent to the servers for the
 * pushes they write.
 */
export function Language() {
  const { t, i18n } = useTranslation();
  const { me } = useSocial();
  return (
    <div className="settings-language">
      <h2>{t('language.title')}</h2>
      <p className="settings-muted">{t('language.subtitle')}</p>
      <div className="settings-language-list">
        {LANGUAGES.map((code) => {
          const selected = code === i18n.language;
          return (
            <button
              type="button"
              key={code}
              className={`settings-language-row ${selected ? 'on' : 'off'}`}
              aria-pressed={selected}
              onClick={async () => {
                await setLanguage(code);
                syncLanguage(code, me?.backendId);
              }}
            >
              <span className="flag">{FLAGS[code]}</span>
              <span className="label">{t(`language.${code}`)}</span>
              <span className={`settings-radio ${selected ? 'on' : ''}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
