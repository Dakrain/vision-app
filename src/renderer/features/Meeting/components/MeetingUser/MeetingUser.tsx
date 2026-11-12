import { Avatar, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './MeetingUser.scss';
import {
  MeetingUser as MeetingUserType,
  MeetingRole,
} from '@/renderer/shared/types/meeting';
import Icon from '@/assets/svg/icons';
import { confirmDialog } from '@/renderer/shared/utils/confirmDialog';

export type MemberAction =
  | 'muteAudio'
  | 'muteVideo'
  | 'makeCohost'
  | 'removeCohost'
  | 'kick'
  | 'ban';

const ACTION_LABEL = {
  muteAudio: 'meeting.participants.mute',
  muteVideo: 'meeting.participants.stop_video',
  makeCohost: 'meeting.participants.make_co_host_long',
  removeCohost: 'meeting.participants.remove_co_host',
  kick: 'meeting.participants.kick',
  ban: 'meeting.participants.ban',
} as const satisfies Record<MemberAction, string>;

// Destructive actions ask first.
const CONFIRM: Partial<
  Record<
    MemberAction,
    'meeting.participants.kick_confirm' | 'meeting.participants.ban_confirm'
  >
> = {
  kick: 'meeting.participants.kick_confirm',
  ban: 'meeting.participants.ban_confirm',
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
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);

  const run = (action: MemberAction) => {
    const confirm = CONFIRM[action];
    if (!confirm) {
      onAction?.(user, action);
      return;
    }
    confirmDialog({
      title: t(ACTION_LABEL[action]),
      content: t(confirm, { name: user.fullName ?? '' }),
      okText: t(ACTION_LABEL[action]),
      okButtonProps: { danger: true },
      cancelText: t('common.cancel'),
      onOk: () => onAction?.(user, action),
    });
  };

  // Muting is on the mic icon itself; the menu has the rest.
  const menuActions = actions.filter((action) => action !== 'muteAudio');
  const items: MenuProps['items'] = menuActions.flatMap((action, i) => [
    ...(i > 0 ? [{ type: 'divider' as const, key: `d-${action}` }] : []),
    {
      key: action,
      label: t(ACTION_LABEL[action]),
      danger: action === 'kick' || action === 'ban',
    },
  ]);

  const roles = [
    user.role === MeetingRole.HOST && t('meeting.participants.role_host'),
    user.role === MeetingRole.CO_HOST && t('meeting.participants.role_co_host'),
    isMe && t('meeting.participants.role_me'),
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
            title={t('meeting.participants.mute')}
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
              title={t('meeting.participants.options')}
            >
              <Icon name="memberDots" />
            </button>
          </Dropdown>
        )}
      </div>
    </div>
  );
}
