import { Avatar, Dropdown, Modal } from 'antd';
import type { MenuProps } from 'antd';
import { useState } from 'react';
import './MeetingUser.scss';
import {
  MeetingUser as MeetingUserType,
  MeetingRole,
} from '@/renderer/shared/types/meeting';
import Icon from '@/assets/svg/icons';

export type MemberAction =
  | 'muteAudio'
  | 'muteVideo'
  | 'makeCohost'
  | 'removeCohost'
  | 'kick'
  | 'ban';

const ACTION_LABEL: Record<MemberAction, string> = {
  muteAudio: 'Tắt micro',
  muteVideo: 'Tắt video',
  makeCohost: 'Chuyển quyền thành Co-host',
  removeCohost: 'Thu hồi quyền Co-host',
  kick: 'Loại khỏi phòng',
  ban: 'Cấm tham gia cuộc họp',
};

// Destructive actions ask first.
const CONFIRM: Partial<Record<MemberAction, (name: string) => string>> = {
  kick: (name) => `Mời ${name} ra khỏi cuộc họp? Họ vẫn có thể tham gia lại.`,
  ban: (name) =>
    `Cấm ${name} tham gia? Họ sẽ bị đưa ra ngoài và không thể vào lại cuộc họp này.`,
};

interface MeetingUserProps {
  user: MeetingUserType;
  /** This is me: shown as "(…, tôi)". */
  isMe?: boolean;
  /** Talking right now: green mic. */
  speaking?: boolean;
  /**
   * Added to the room but not in it: plain mic + camera icons instead of
   * the live mic state and menu.
   */
  away?: boolean;
  /** Actions the current user may perform on `user` (empty = no menu). */
  actions?: MemberAction[];
  onAction?: (user: MeetingUserType, action: MemberAction) => void;
}

/** One row of the participants panel. */
export function MeetingUser({
  user,
  isMe = false,
  speaking = false,
  away = false,
  actions = [],
  onAction,
}: MeetingUserProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const run = (action: MemberAction) => {
    const confirm = CONFIRM[action];
    if (!confirm) {
      onAction?.(user, action);
      return;
    }
    Modal.confirm({
      title: ACTION_LABEL[action],
      content: confirm(user.fullName ?? ''),
      okText: ACTION_LABEL[action],
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: () => onAction?.(user, action),
    });
  };

  // Muting is on the mic icon itself; the menu has the rest.
  const menuActions = actions.filter((action) => action !== 'muteAudio');
  const items: MenuProps['items'] = menuActions.flatMap((action, i) => [
    ...(i > 0 ? [{ type: 'divider' as const, key: `d-${action}` }] : []),
    {
      key: action,
      label: ACTION_LABEL[action],
      danger: action === 'kick' || action === 'ban',
    },
  ]);

  const roles = [
    user.role === MeetingRole.HOST && 'Người chủ trì',
    user.role === MeetingRole.CO_HOST && 'Co-host',
    isMe && 'tôi',
  ].filter(Boolean);

  let micIcon = 'memberMicOff';
  if (away) micIcon = 'memberMic';
  else if (user.enableAudio)
    micIcon = speaking ? 'memberMicSpeaking' : 'memberMic';
  // Muting someone is offered on the mic itself when allowed.
  const canMute = !away && !!user.enableAudio && actions.includes('muteAudio');

  return (
    <div
      className={`meeting-user${away ? ' away' : ''}${menuOpen ? ' active' : ''}`}
    >
      <div className="meeting-user-info">
        <Avatar src={user.avatarUrl || undefined} size={24}>
          {user.fullName?.[0]}
        </Avatar>
        <span className="meeting-user-name">
          {user.fullName}
          {roles.length > 0 && ` (${roles.join(', ')})`}
        </span>
      </div>
      <div className="meeting-user-controls">
        {canMute ? (
          <button
            type="button"
            className="meeting-user-icon clickable"
            title="Tắt micro"
            onClick={() => run('muteAudio')}
          >
            <Icon name={micIcon} />
          </button>
        ) : (
          <span className="meeting-user-icon">
            <Icon name={micIcon} />
          </span>
        )}
        {away && (
          <span className="meeting-user-icon">
            <Icon name="memberVideo" />
          </span>
        )}
        {!away && items.length > 0 && (
          <Dropdown
            menu={{
              items,
              onClick: ({ key }) => run(key as MemberAction),
            }}
            trigger={['click']}
            placement="bottomRight"
            overlayClassName="meeting-user-menu"
            onOpenChange={setMenuOpen}
          >
            <button
              type="button"
              className="meeting-user-icon clickable"
              title="Tuỳ chọn"
            >
              <Icon name="memberDots" />
            </button>
          </Dropdown>
        )}
      </div>
    </div>
  );
}
