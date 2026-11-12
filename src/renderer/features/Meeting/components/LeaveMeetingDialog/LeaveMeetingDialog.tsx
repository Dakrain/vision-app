import { Modal, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/components/Button';

interface Props {
  open: boolean;
  onEnd: () => void;
  onLeave: () => void;
  onClose: () => void;
}

/** The host leaving: end the meeting for everyone, just leave, or cancel. */
export function LeaveMeetingDialog({ open, onEnd, onLeave, onClose }: Props) {
  const { t } = useTranslation();
  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={t('meeting.exit.title')}
      centered
      footer={null}
    >
      <Typography.Paragraph>
        {t('meeting.exit.host_message')}
      </Typography.Paragraph>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Button
          variant="primary"
          title={t('meeting.exit.end_for_all_long')}
          onClick={onEnd}
        />
        <Button
          variant="outline"
          title={t('meeting.room.leave_room')}
          onClick={onLeave}
        />
        <Button variant="text" title={t('common.cancel')} onClick={onClose} />
      </div>
    </Modal>
  );
}
