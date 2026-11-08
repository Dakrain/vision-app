import { Input, Modal, Radio, message as toast } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Message } from '@/shared/services/Firebase/chat';
import { REPORT_REASONS, type ReportReason, reportMail } from '../report';

const { shell, clipboard } = window.require('electron');

interface Props {
  /** The message being reported; null when closed. */
  message: Message | null;
  conversationId: string;
  senderName: string;
  onClose: () => void;
}

/** "Báo cáo tin nhắn này?": why, then an email to support (as on mobile). */
export function ReportDialog({
  message,
  conversationId,
  senderName,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const [reason, setReason] = useState<ReportReason>('spam');
  const [fallback, setFallback] = useState<string | null>(null);

  useEffect(() => {
    if (message) setReason('spam');
  }, [message]);

  const send = async () => {
    if (!message) return;
    const mail = reportMail({
      reason,
      conversation: conversationId,
      messageId: message.id,
      sender: `${senderName} (${message.senderBackendId})`,
      text: message.type === 'text' ? message.text : undefined,
    });
    onClose();
    try {
      await shell.openExternal(mail.url);
      toast.success(t('chat.report.sent'));
    } catch (_) {
      // No mail app: the report as text, to paste anywhere.
      setFallback(mail.text);
    }
  };

  return (
    <>
      <Modal
        open={!!message}
        title={t('chat.report.title')}
        okText={t('chat.report.send')}
        cancelText={t('common.cancel')}
        okButtonProps={{ danger: true }}
        onOk={send}
        onCancel={onClose}
        centered
        width={420}
      >
        <p>{t('chat.report.subtitle')}</p>
        <Radio.Group
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          {REPORT_REASONS.map((r) => (
            <Radio key={r} value={r}>
              {t(`chat.report.${r}`)}
            </Radio>
          ))}
        </Radio.Group>
      </Modal>
      <Modal
        open={fallback !== null}
        title={t('chat.report.failed_title')}
        okText={t('chat.report.copy')}
        cancelText={t('common.close')}
        onOk={() => {
          clipboard.writeText(fallback ?? '');
          toast.success(t('common.copied'));
          setFallback(null);
        }}
        onCancel={() => setFallback(null)}
        centered
      >
        <p>
          {t('chat.report.failed_message', { email: 'support@vision20.com' })}
        </p>
        <Input.TextArea value={fallback ?? ''} readOnly autoSize />
      </Modal>
    </>
  );
}
