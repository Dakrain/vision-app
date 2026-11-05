import type { SocialStatus } from '@/shared/social/connect';
import { Button, Spin } from 'antd';
import { useTranslation } from 'react-i18next';

/** Chat page before the Firebase session is up: progress, or error + retry. */
export function ChatConnecting({
  status,
  onRetry,
}: {
  status: Exclude<SocialStatus, 'connected'>;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="chat-page">
      <div className="chat-loading">
        {status === 'failed' ? (
          <>
            <span>{t('chat.conversations.connect_failed')}</span>
            <Button type="primary" onClick={onRetry}>
              {t('common.retry')}
            </Button>
          </>
        ) : (
          <>
            <Spin />
            <span>{t('chat.conversations.connecting')}</span>
          </>
        )}
      </div>
    </div>
  );
}
