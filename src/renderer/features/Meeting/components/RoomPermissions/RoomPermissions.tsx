import Icon from '@/assets/svg/icons';
import { RoomSettings } from '@/renderer/shared/types/meeting';
import { notification, Popover, Switch } from 'antd';
import { ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './RoomPermissions.scss';

const ITEMS: {
  key: keyof RoomSettings;
  label:
    | 'meeting.permission.mic_title'
    | 'meeting.permission.camera_title'
    | 'meeting.permission.chat_title'
    | 'meeting.permission.share_title'
    | 'meeting.permission.record_title';
  fallback: number;
}[] = [
  { key: 'muteAllAudio', label: 'meeting.permission.mic_title', fallback: 1 },
  {
    key: 'muteAllVideo',
    label: 'meeting.permission.camera_title',
    fallback: 0,
  },
  { key: 'muteAllChat', label: 'meeting.permission.chat_title', fallback: 1 },
  {
    key: 'multipleShareScreen',
    label: 'meeting.permission.share_title',
    fallback: 0,
  },
  { key: 'isRecording', label: 'meeting.permission.record_title', fallback: 0 },
];

interface Props {
  settings?: RoomSettings;
  onChange: (change: RoomSettings) => Promise<void>;
  children: ReactNode;
}

/**
 * Host/co-host: what plain members may do, changeable mid-meeting. Each switch
 * saves on its own and everyone in the room picks the change up via RTM.
 */
export function RoomPermissions({ settings, onChange, children }: Props) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState<keyof RoomSettings>();
  const [open, setOpen] = useState(false);

  const toggle = async (key: keyof RoomSettings, allowed: boolean) => {
    setSaving(key);
    try {
      await onChange({ [key]: allowed ? 1 : 0 });
    } catch (_) {
      notification.error({
        message: t('meeting.room.permission_change_failed'),
        placement: 'top',
      });
    } finally {
      setSaving(undefined);
    }
  };

  const content = (
    <div className="room-permissions">
      <div className="room-permissions-hint">
        {t('meeting.participants.permissions_hint')}
      </div>
      {ITEMS.map(({ key, label, fallback }) => (
        <div key={key} className="room-permissions-row">
          <span>{t(label)}</span>
          <Switch
            size="small"
            checked={(settings?.[key] ?? fallback) === 1}
            loading={saving === key}
            onChange={(checked) => toggle(key, checked)}
          />
        </div>
      ))}
    </div>
  );

  return (
    <Popover
      content={content}
      title={
        <div className="room-permissions-title">
          <span>{t('meeting.participants.permissions')}</span>
          <button
            type="button"
            className="room-permissions-close"
            aria-label={t('common.close')}
            onClick={() => setOpen(false)}
          >
            <Icon name="meetingClose" />
          </button>
        </div>
      }
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottomRight"
    >
      {children}
    </Popover>
  );
}
