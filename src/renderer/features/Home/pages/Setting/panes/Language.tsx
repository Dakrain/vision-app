const LANGUAGES = [
  { code: 'vi', flag: '🇻🇳', label: 'Tiếng Việt' },
  { code: 'en', flag: '🇺🇸', label: 'English (United States)' },
  { code: 'zh', flag: '🇨🇳', label: '中文(简体)' },
  { code: 'hi', flag: '🇮🇳', label: 'Hindi (India)' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
  { code: 'my', flag: '🇲🇲', label: 'Burmese' },
  { code: 'id', flag: '🇮🇩', label: 'Bahasa (Indonesia)' },
  { code: 'km', flag: '🇰🇭', label: 'Khmer' },
  { code: 'ko', flag: '🇰🇷', label: '한국어' },
  { code: 'pt', flag: '🇵🇹', label: 'Português (Portugal)' },
];

/** The app is in Vietnamese only for now. */
export const currentLanguageLabel = 'Tiếng Việt';

/** "Ngôn ngữ" (Figma 10946:60015). Only Vietnamese exists so far. */
export function Language() {
  return (
    <div className="settings-language">
      <h2>Ngôn ngữ</h2>
      <p className="settings-muted">
        Thay đổi ngôn ngữ hiển thị trên Vision 20. Các ngôn ngữ khác sẽ có ở
        những bản cập nhật sau.
      </p>
      <div className="settings-language-list">
        {LANGUAGES.map((l) => {
          const selected = l.code === 'vi';
          return (
            <div
              key={l.code}
              className={`settings-language-row ${selected ? 'on' : 'off'}`}
              aria-disabled={!selected}
            >
              <span className="flag">{l.flag}</span>
              <span className="label">{l.label}</span>
              <span className={`settings-radio ${selected ? 'on' : ''}`} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
