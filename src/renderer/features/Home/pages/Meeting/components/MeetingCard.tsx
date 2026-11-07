import Icon from '@/assets/svg/icons';
import {
  MeetingRole,
  MeetingStatus,
  type MeetingListItem,
} from '@/shared/types/meeting';
import { Dropdown, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { meetingDate, timeLabel } from '../meetingTime';
import { inviteUrl } from '@/shared/utils/inviteLink';

interface Props {
  meeting: MeetingListItem;
  onStart: (meeting: MeetingListItem) => void;
  onJoin: (meeting: MeetingListItem) => void;
  onEdit: (meeting: MeetingListItem) => void;
  onCopyLink: (meeting: MeetingListItem) => void;
  onDelete: (meeting: MeetingListItem) => void;
}

export const MeetingCard = memo(function MeetingCard({
  meeting,
  onStart,
  onJoin,
  onEdit,
  onCopyLink,
  onDelete,
}: Props) {
  const { t } = useTranslation();
  const isHost =
    meeting.isHost === 1 || Number(meeting.role) === MeetingRole.HOST;
  const isLive = Number(meeting.status) === MeetingStatus.GOING_ON;
  const canStart = isHost && !isLive;
  // A scheduled meeting gets its real key only when it starts.
  const meetingKey =
    meeting.visionMeetingKey &&
    meeting.visionMeetingKey !== 'not_ready_for_meet'
      ? meeting.visionMeetingKey
      : t('meeting.list.key_on_start');

  const menuItems: MenuProps['items'] = [
    ...(isHost ? [{ key: 'edit', label: t('meeting.list.edit_title') }] : []),
    ...(inviteUrl(meeting)
      ? [{ key: 'copy', label: t('meeting.list.copy_link') }]
      : []),
    // A running meeting has to be ended first (the API refuses).
    ...(isHost && !isLive
      ? [
          { type: 'divider' as const },
          { key: 'delete', label: t('meeting.list.delete'), danger: true },
        ]
      : []),
  ];

  const renderAction = () => {
    if (canStart) {
      return (
        <button
          type="button"
          className="meeting-card-action"
          onClick={() => onStart(meeting)}
        >
          {t('meeting.list.start')}
        </button>
      );
    }
    if (isLive) {
      return (
        <button
          type="button"
          className="meeting-card-action"
          onClick={() => onJoin(meeting)}
        >
          {t('meeting.list.join')}
        </button>
      );
    }
    return (
      <Tooltip title={t('meeting.list.not_started')}>
        <button type="button" className="meeting-card-action" disabled>
          {t('meeting.list.join')}
        </button>
      </Tooltip>
    );
  };

  return (
    <div className="meeting-card">
      <div className="meeting-card-header">
        <span className="meeting-card-title">{meeting.title}</span>
        {menuItems.length > 0 && (
          <Dropdown
            trigger={['click']}
            placement="bottomRight"
            overlayClassName="meeting-card-menu"
            menu={{
              items: menuItems,
              onClick: ({ key }) => {
                if (key === 'edit') onEdit(meeting);
                if (key === 'copy') onCopyLink(meeting);
                if (key === 'delete') onDelete(meeting);
              },
            }}
          >
            <button
              type="button"
              className="meeting-card-more"
              aria-label={t('meeting.list.options')}
            >
              <Icon name="meetingDots" />
            </button>
          </Dropdown>
        )}
      </div>
      <div className="meeting-card-body">
        <div className="meeting-card-info">
          <div className="meeting-card-row">
            <span className="meeting-card-icon host">
              <Icon name="meetingHost" />
            </span>
            <span>{meeting.ownerFullName}</span>
          </div>
          <div className="meeting-card-row">
            <span className="meeting-card-icon clock">
              <Icon name="meetingClock" />
            </span>
            <span>{timeLabel(meetingDate(meeting))}</span>
          </div>
          <div className="meeting-card-row">
            <span className="meeting-card-icon id">
              <Icon name="meetingId" />
            </span>
            <span>{meetingKey}</span>
          </div>
        </div>
        {renderAction()}
      </div>
    </div>
  );
});
