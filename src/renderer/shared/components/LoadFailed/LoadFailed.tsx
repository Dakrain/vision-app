import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import './LoadFailed.scss';

/** A list/pane that failed to load: what failed + "Thử lại" (desktop has
 * no reload, so every load needs its own way back). */
export function LoadFailed({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="load-failed">
      <span>{message}</span>
      <Button onClick={onRetry}>{t('common.retry')}</Button>
    </div>
  );
}
