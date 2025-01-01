/* eslint-disable react/jsx-props-no-spreading */
import { Avatar, Button, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import {
  AudioMutedOutlined,
  VideoCameraOutlined,
  MoreOutlined,
} from '@ant-design/icons';
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

interface MeetingUserProps {
  user: MeetingUserType;
  onAction?: (user: MeetingUserType) => void;
}

export function MeetingUser({ user, onAction }: MeetingUserProps) {
  const items: MenuProps['items'] = [
    {
      key: 'muteVideo',
      label: 'Tắt video',
    },
    {
      key: 'promote',
      label: 'Chuyển quyền thành Co-host',
    },
    {
      key: 'kick',
      label: 'Loại khỏi phòng',
    },
  ];

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
        />
        <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      </div>
    </div>
  );
}
