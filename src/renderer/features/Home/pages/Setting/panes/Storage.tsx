import UserService, {
  type DriveStatistics,
} from '@/shared/services/User/UserService';
import { Spin } from 'antd';
import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import i18n from '@/renderer/i18n';

/** Bytes → "1,01 GB" (the language's decimal mark; a comma in Vietnamese). */
const NUMBER_LOCALE: Record<string, string> = {
  vi: 'vi-VN',
  en: 'en-US',
  zh: 'zh-CN',
};
export const formatGb = (bytes: number) =>
  `${(bytes / 1024 ** 3).toLocaleString(
    NUMBER_LOCALE[i18n.language] ?? 'vi-VN',
    {
      maximumFractionDigits: 2,
    },
  )} GB`;

// System folders (named in English on the server) and their colours.
type CategoryKey =
  | 'account.storage.music'
  | 'account.storage.video'
  | 'account.storage.documents'
  | 'account.storage.devotional'
  | 'account.storage.vision_tv'
  | 'account.storage.other';
const CATEGORIES: { match: RegExp; label: CategoryKey; color: string }[] = [
  { match: /music/i, label: 'account.storage.music', color: '#ff5a5a' },
  { match: /video/i, label: 'account.storage.video', color: '#0064ff' },
  { match: /doc/i, label: 'account.storage.documents', color: '#ffc800' },
  {
    match: /nurtur|devot|dưỡng|spirit/i,
    label: 'account.storage.devotional',
    color: '#1ec88c',
  },
  { match: /tv/i, label: 'account.storage.vision_tv', color: '#7850dc' },
];
const OTHER: { label: CategoryKey; color: string } = {
  label: 'account.storage.other',
  color: '#cccccc',
};

interface Props {
  onUpgrade: () => void;
}

/** "Bộ nhớ" (Figma 10946:59878). */
export function Storage({ onUpgrade }: Props) {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DriveStatistics>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    UserService.fetchDriveStatistics()
      .then(setStats)
      .catch(() => setFailed(true));
  }, []);

  if (failed) {
    return (
      <div className="settings-empty">{t('account.storage.load_failed')}</div>
    );
  }
  if (!stats) {
    return (
      <div className="settings-empty">
        <Spin />
      </div>
    );
  }

  const { storageLimit, storageUsed } = stats.storage;
  // The server names plans in lower case ("standard").
  const packageName =
    stats.storage.packageName.charAt(0).toUpperCase() +
    stats.storage.packageName.slice(1);
  const percent = storageLimit
    ? Math.round((storageUsed / storageLimit) * 100)
    : 0;
  // Group folders into the design's categories; user folders count as "Khác".
  const groups = [
    ...CATEGORIES.map((c) => ({ ...c, used: 0 })),
    { ...OTHER, used: 0 },
  ];
  stats.folders.forEach((f) => {
    const g = groups.find((c) => 'match' in c && (c as any).match.test(f.name));
    (g ?? groups[groups.length - 1]).used += Math.max(0, f.storageUsed);
  });

  return (
    <div className="settings-storage">
      <section>
        <h2>{t('account.storage.current_title')}</h2>
        <p className="settings-muted">{t('account.storage.current_usage')}</p>
        <p className="settings-storage-total">
          {formatGb(storageUsed)} / {formatGb(storageLimit)} ({percent}%)
        </p>
        <div className="settings-storage-bar">
          {groups.map(
            (g) =>
              g.used > 0 && (
                <span
                  key={g.label}
                  style={{
                    width: `${(g.used / storageLimit) * 100}%`,
                    background: g.color,
                  }}
                />
              ),
          )}
        </div>
        <div className="settings-storage-legend">
          {groups.map((g) => (
            <span key={g.label}>
              <i style={{ background: g.color }} />
              {t(g.label)} <b>{formatGb(g.used)}</b>
            </span>
          ))}
        </div>
      </section>
      <section>
        <h2>{t('account.packages.current')}</h2>
        <p className="settings-muted">
          <Trans
            i18nKey="account.storage.current_plan_description"
            values={{ name: packageName, limit: formatGb(storageLimit) }}
            components={{ b: <b /> }}
          />
        </p>
        <div className="settings-plan-card">
          <span>{packageName}</span>
          <b>{formatGb(storageLimit)}</b>
        </div>
      </section>
      <section>
        <h2>{t('account.storage.upgrade_title')}</h2>
        <p className="settings-muted">{t('account.packages.title')}</p>
        <button
          type="button"
          className="settings-btn green block"
          onClick={onUpgrade}
        >
          {t('account.storage.upgrade')}
        </button>
      </section>
    </div>
  );
}
