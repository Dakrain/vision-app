/* eslint-disable react/jsx-props-no-spreading */
import { Avatar, Button, Dropdown, Modal } from 'antd';
import type { MenuProps } from 'antd';
import { MoreOutlined } from '@ant-design/icons';
import './MeetingUser.scss';
import {
  MeetingUser as MeetingUserType,
  MeetingRole,
} from '@/renderer/shared/types/meeting';
import Icon from '@/assets/svg/icons';

import * as React from 'react';
import { SVGProps } from 'react';

function MicIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" {...props}>
      <path
        stroke="#808080"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12.2 2.25h0A3.75 3.75 0 0 1 15.95 6v6a3.75 3.75 0 0 1-3.75 3.75h0A3.75 3.75 0 0 1 8.45 12V6a3.75 3.75 0 0 1 3.75-3.75v0ZM12.2 18.75v3"
      />
      <path
        stroke="#808080"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M18.909 12.75a6.75 6.75 0 0 1-13.418 0"
      />
    </svg>
  );
}

function CameraIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" {...props}>
      <path
        stroke="#808080"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M2.65 5.625h12a3 3 0 0 1 3 3v9a.75.75 0 0 1-.75.75h-12a3 3 0 0 1-3-3v-9a.75.75 0 0 1 .75-.75v0ZM17.65 10.5l5.25-3v9l-5.25-3"
      />
    </svg>
  );
}

export type MemberAction =
  | 'muteAudio'
  | 'muteVideo'
  | 'makeCohost'
  | 'removeCohost'
  | 'kick'
  | 'ban';

const ACTION_LABEL: Record<MemberAction, string> = {
  muteAudio: 'Tắt micro',
  muteVideo: 'Tắt camera',
  makeCohost: 'Trao quyền Co-host',
  removeCohost: 'Thu hồi quyền Co-host',
  kick: 'Mời ra khỏi phòng',
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
  /** Actions the current user may perform on `user` (empty = no menu). */
  actions?: MemberAction[];
  onAction?: (user: MeetingUserType, action: MemberAction) => void;
}

export function MeetingUser({
  user,
  actions = [],
  onAction,
}: MeetingUserProps) {
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
      cancelText: 'Huỷ',
      onOk: () => onAction?.(user, action),
    });
  };

  const items: MenuProps['items'] = actions.map((action) => ({
    key: action,
    label: ACTION_LABEL[action],
    danger: action === 'kick' || action === 'ban',
  }));

  return (
    <div className="meeting-user">
      <div className="meeting-user-info">
        <Avatar src={user.avatarUrl} size={36}>
          {user.fullName?.[0]}
        </Avatar>
        <div className="meeting-user-name">
          <div className="name">
            {user.fullName}
            {user.role === MeetingRole.HOST && (
              <span className="role">(Người chủ trì)</span>
            )}
            {user.role === MeetingRole.CO_HOST && (
              <span className="role">(Co-host)</span>
            )}
          </div>
        </div>
      </div>
      <div className="meeting-user-controls">
        <Button
          type="text"
          icon={
            !user.enableAudio ? (
              <Icon name="micOff" />
            ) : (
              <MicIcon width={24} height={24} />
            )
          }
          className={!user.enableAudio ? 'disabled' : ''}
          title={actions.includes('muteAudio') ? 'Tắt micro' : undefined}
          onClick={() => actions.includes('muteAudio') && run('muteAudio')}
        />
        <Button
          type="text"
          icon={
            !user.enableVideo ? (
              <Icon name="cameraOff" />
            ) : (
              <CameraIcon width={24} height={24} />
            )
          }
          className={!user.enableVideo ? 'disabled' : ''}
          title={actions.includes('muteVideo') ? 'Tắt camera' : undefined}
          onClick={() => actions.includes('muteVideo') && run('muteVideo')}
        />
        {items.length > 0 && (
          <Dropdown
            menu={{
              items,
              onClick: ({ key }) => run(key as MemberAction),
            }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        )}
      </div>
    </div>
  );
}
