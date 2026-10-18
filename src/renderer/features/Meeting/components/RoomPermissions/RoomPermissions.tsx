import { RoomSettings } from '@/renderer/shared/types/meeting';
import { notification, Popover, Switch } from 'antd';
import { ReactNode, useState } from 'react';
import './RoomPermissions.scss';

const ITEMS: { key: keyof RoomSettings; label: string; fallback: number }[] = [
  { key: 'muteAllAudio', label: 'Bật micro', fallback: 1 },
  { key: 'muteAllVideo', label: 'Bật camera', fallback: 0 },
  { key: 'muteAllChat', label: 'Chat', fallback: 1 },
  { key: 'multipleShareScreen', label: 'Chia sẻ màn hình', fallback: 0 },
  { key: 'isRecording', label: 'Ghi cuộc họp', fallback: 0 },
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
  const [saving, setSaving] = useState<keyof RoomSettings>();

  const toggle = async (key: keyof RoomSettings, allowed: boolean) => {
    setSaving(key);
    try {
      await onChange({ [key]: allowed ? 1 : 0 });
    } catch (_) {
      notification.error({
        message: 'Không đổi được quyền, vui lòng thử lại',
        placement: 'top',
      });
    } finally {
      setSaving(undefined);
    }
  };

  const content = (
    <div className="room-permissions">
      <div className="room-permissions-hint">
        Người tham dự được phép (Host và Co-host luôn được phép):
      </div>
      {ITEMS.map(({ key, label, fallback }) => (
        <div key={key} className="room-permissions-row">
          <span>{label}</span>
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
      title="Quyền của người tham dự"
      trigger="click"
      placement="bottomRight"
    >
      {children}
    </Popover>
  );
}
