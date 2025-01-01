/* eslint-disable react/jsx-props-no-spreading */
import React, { ReactNode } from 'react';
import { ReactComponent as MicIcon } from './ic_mic.svg';
import { ReactComponent as MicOffIcon } from './ic_mic_off.svg';
import { ReactComponent as CameraIcon } from './ic_camera.svg';
import { ReactComponent as CameraOffIcon } from './ic_camera_off.svg';
import { ReactComponent as ShareScreenIcon } from './ic_share_screen.svg';
import { ReactComponent as HomeIcon } from './ic_home_dashboard.svg';
import { ReactComponent as HomeMeetingIcon } from './ic_home_live.svg';
import { ReactComponent as HomeChatIcon } from './ic_home_chat.svg';
import { ReactComponent as HomeLibraryIcon } from './ic_home_book.svg';
import { ReactComponent as HomeSettingIcon } from './ic_setting.svg';
import { ReactComponent as HomeActiveIcon } from './ic_home_dashboard_selected.svg';
import { ReactComponent as HomeMeetingActiveIcon } from './ic_home_live_selected.svg';
import { ReactComponent as HomeChatActiveIcon } from './ic_home_chat_selected.svg';
import { ReactComponent as HomeLibraryActiveIcon } from './ic_home_book_selected.svg';
import { ReactComponent as HomeSettingActiveIcon } from './ic_setting_selected.svg';
import { ReactComponent as UserIcon } from './ic_person.svg';
import { ReactComponent as CloseIcon } from './ic_close.svg';
import { ReactComponent as ViewLayoutIcon } from './ic_gallery.svg';
import { ReactComponent as FullScreenIcon } from './ic_full_screen.svg';
import { ReactComponent as CopyIcon } from './ic_copy.svg';
import { ReactComponent as ReactionIcon } from './ic_emoji.svg';
import { ReactComponent as RecordIcon } from './ic_record.svg';
import { ReactComponent as UsersIcon } from './ic_users.svg';
import { ReactComponent as ChatIcon } from './ic_chat.svg';

export interface IconProps {
  name: string;
  style?: React.CSSProperties;
  className?: string;
  stroke?: string;
}

export default function Icon({
  name,
  style = {},
  className,
  stroke,
}: IconProps): ReactNode {
  const svgStyle = {
    ...style,
    ...(stroke ? { stroke } : {}),
  };
  const svgProps = {
    style: svgStyle,
    className,
  };
  switch (name) {
    case 'micOn':
      return <MicIcon {...svgProps} />;
    case 'micOff':
      return <MicOffIcon {...svgProps} />;
    case 'cameraOn':
      return <CameraIcon {...svgProps} />;
    case 'cameraOff':
      return <CameraOffIcon {...svgProps} />;
    case 'shareScreen':
      return <ShareScreenIcon {...svgProps} />;
    case 'home':
      return <HomeIcon {...svgProps} />;
    case 'homeActive':
      return <HomeActiveIcon {...svgProps} />;
    case 'homeMeeting':
      return <HomeMeetingIcon {...svgProps} />;
    case 'homeMeetingActive':
      return <HomeMeetingActiveIcon {...svgProps} />;
    case 'homeChat':
      return <HomeChatIcon {...svgProps} />;
    case 'homeChatActive':
      return <HomeChatActiveIcon {...svgProps} />;
    case 'homeLibrary':
      return <HomeLibraryIcon {...svgProps} />;
    case 'homeLibraryActive':
      return <HomeLibraryActiveIcon {...svgProps} />;
    case 'homeSetting':
      return <HomeSettingIcon {...svgProps} />;
    case 'homeSettingActive':
      return <HomeSettingActiveIcon {...svgProps} />;
    case 'user':
      return <UserIcon {...svgProps} />;
    case 'close':
      return <CloseIcon {...svgProps} />;
    case 'viewLayout':
      return <ViewLayoutIcon {...svgProps} />;
    case 'fullScreen':
      return <FullScreenIcon {...svgProps} />;
    case 'copy':
      return <CopyIcon {...svgProps} />;
    case 'emoji':
      return <ReactionIcon {...svgProps} />;
    case 'users':
      return <UsersIcon {...svgProps} />;
    case 'setting':
      return <HomeSettingIcon {...svgProps} />;
    case 'record':
      return <RecordIcon {...svgProps} />;
    case 'chat':
      return <ChatIcon {...svgProps} />;
    default:
      return null;
  }
}
