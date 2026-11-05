import UserService, {
  type StoragePackage,
} from '@/shared/services/User/UserService';
import { Spin } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LoadFailed } from '@/shared/components/LoadFailed/LoadFailed';
import { formatGb } from './Storage';

interface Props {
  currentPackageId?: number;
  onBack: () => void;
}

/** "Nâng cấp tài khoản…" plan list (Figma 10946:59965). */
export function Packages({ currentPackageId, onBack }: Props) {
  const { t } = useTranslation();
  const [packages, setPackages] = useState<StoragePackage[]>();
  const [current, setCurrent] = useState(currentPackageId);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    UserService.fetchStoragePackages()
      .then(setPackages)
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    load();
    if (current === undefined) {
      UserService.fetchDriveStatistics()
        .then((s) => setCurrent(s.storage.packageId))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="settings-packages">
      <button type="button" className="settings-back" onClick={onBack}>
        {t('account.packages.back')}
      </button>
      <h2>{t('account.packages.title')}</h2>
      <p className="settings-muted">{t('account.packages.description')}</p>
      {failed && (
        <LoadFailed
          message={t('account.packages.load_failed')}
          onRetry={load}
        />
      )}
      {!failed && !packages && (
        <div className="settings-empty">
          <Spin />
        </div>
      )}
      {packages && (
        <div className="settings-packages-grid">
          {packages.map((p) => {
            const isCurrent = p.id === current;
            return (
              <div key={p.id} className="settings-package">
                <b>{formatGb(p.storage)}</b>
                <span>
                  {p.price > 0
                    ? `${p.currency}${p.price}`
                    : t('account.packages.free')}
                </span>
                {isCurrent ? (
                  <button type="button" className="settings-btn" disabled>
                    {t('account.packages.current')}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="settings-btn green"
                    disabled
                    title={t('account.packages.coming_soon_hint')}
                  >
                    {t('account.packages.coming_soon')}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      <p className="settings-muted small">{t('account.packages.terms')}</p>
    </div>
  );
}
