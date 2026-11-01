import { Modal, Typography, Space, Button, Tooltip, message } from 'antd';
import './MeetingDetail.scss';
import Icon from '@/assets/svg/icons';
import { useTranslation } from 'react-i18next';
import { InfoItemProps, MeetingDetailProps } from './types';

const { Text } = Typography;

function InfoItem({ label, value, copyable = false, onCopy }: InfoItemProps) {
  const { t } = useTranslation();
  return (
    <div className="meeting-info-item">
      <Text type="secondary">{label}</Text>
      <Space>
        <Text>{value}</Text>
        {copyable && (
          <Tooltip title={t('meeting.detail.copy')}>
            <Button
              type="text"
              icon={<Icon name="copy" />}
              onClick={() => onCopy(value)}
              size="small"
            />
          </Tooltip>
        )}
      </Space>
    </div>
  );
}

export function MeetingDetail({
  isOpen,
  onClose,
  meetingInfo,
}: MeetingDetailProps) {
  const { t } = useTranslation();
  const handleCopy = (text: string) => {
    message.success(t('common.copied'));
    navigator.clipboard.writeText(text);
  };

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      title={t('meeting.detail.title_of', {
        name: meetingInfo.ownerFullName,
      })}
      footer={null}
      width={480}
      className="meeting-detail-modal"
    >
      <div className="meeting-detail">
        <InfoItem
          label={t('meeting.detail.host')}
          value={meetingInfo.ownerFullName || ''}
          onCopy={handleCopy}
        />
        <InfoItem
          label={t('meeting.detail.start_time')}
          value={
            meetingInfo.createdAt
              ? new Date(meetingInfo.createdAt * 1000).toLocaleString()
              : ''
          }
          onCopy={handleCopy}
        />
        <InfoItem
          label={t('meeting.detail.meeting_id')}
          value={meetingInfo.visionMeetingKey || ''}
          copyable
          onCopy={handleCopy}
        />
        <InfoItem
          label={t('meeting.detail.password')}
          value={meetingInfo.visionMeetingPwd || ''}
          copyable
          onCopy={handleCopy}
        />
        <InfoItem
          label={t('meeting.detail.join_link')}
          value={meetingInfo.joinUrl || ''}
          copyable
          onCopy={handleCopy}
        />
      </div>
    </Modal>
  );
}
