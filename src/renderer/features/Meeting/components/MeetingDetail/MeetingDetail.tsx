import { Modal, Typography, Space, Button, Tooltip, message } from 'antd';
import './MeetingDetail.scss';
import Icon from '@/assets/svg/icons';
import { InfoItemProps, MeetingDetailProps } from './types';

const { Text } = Typography;

function InfoItem({ label, value, copyable = false, onCopy }: InfoItemProps) {
  return (
    <div className="meeting-info-item">
      <Text type="secondary">{label}</Text>
      <Space>
        <Text>{value}</Text>
        {copyable && (
          <Tooltip title="Copy">
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
  const handleCopy = (text: string) => {
    message.success('Đã sao chép');
    navigator.clipboard.writeText(text);
  };

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      title={`${meetingInfo.ownerFullName}'s meeting`}
      footer={null}
      width={480}
      className="meeting-detail-modal"
    >
      <div className="meeting-detail">
        <InfoItem
          label="Host"
          value={meetingInfo.ownerFullName || ''}
          onCopy={handleCopy}
        />
        <InfoItem
          label="Thời gian bắt đầu"
          value={
            meetingInfo.createdAt
              ? new Date(meetingInfo.createdAt * 1000).toLocaleString()
              : ''
          }
          onCopy={handleCopy}
        />
        <InfoItem
          label="ID cuộc họp"
          value={meetingInfo.visionMeetingKey || ''}
          copyable
          onCopy={handleCopy}
        />
        <InfoItem
          label="Mật khẩu"
          value={meetingInfo.visionMeetingPwd || ''}
          copyable
          onCopy={handleCopy}
        />
        <InfoItem
          label="Link tham gia"
          value={meetingInfo.joinUrl || ''}
          copyable
          onCopy={handleCopy}
        />
      </div>
    </Modal>
  );
}
