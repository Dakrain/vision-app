import { useTranslation } from 'react-i18next';

/** "Điều khoản và Điều kiện" — no content or design exists yet. */
export function Terms() {
  const { t } = useTranslation();
  return (
    <div className="settings-terms">
      <h2>{t('account.tab.terms')}</h2>
      <p className="settings-muted">{t('account.terms.description')}</p>
    </div>
  );
}
