/* eslint-disable react/jsx-props-no-spreading */
import React, { ReactNode } from 'react';
import { ReactComponent as CameraIcon } from './ic_camera.svg';
import { ReactComponent as CameraOffIcon } from './ic_camera_off.svg';
import { ReactComponent as ChatIcon } from './ic_chat.svg';
import { ReactComponent as CloseIcon } from './ic_close.svg';
import { ReactComponent as CopyIcon } from './ic_copy.svg';
import { ReactComponent as ReactionIcon } from './ic_emoji.svg';
import { ReactComponent as FullScreenIcon } from './ic_full_screen.svg';
import { ReactComponent as ViewLayoutIcon } from './ic_gallery.svg';
import { ReactComponent as HomeLibraryIcon } from './ic_home_book.svg';
import { ReactComponent as HomeLibraryActiveIcon } from './ic_home_book_selected.svg';
import { ReactComponent as HomeChatIcon } from './ic_home_chat.svg';
import { ReactComponent as HomeChatActiveIcon } from './ic_home_chat_selected.svg';
import { ReactComponent as HomeIcon } from './ic_home_dashboard.svg';
import { ReactComponent as HomeActiveIcon } from './ic_home_dashboard_selected.svg';
import { ReactComponent as HomeMeetingIcon } from './ic_home_live.svg';
import { ReactComponent as HomeMeetingActiveIcon } from './ic_home_live_selected.svg';
import { ReactComponent as MicIcon } from './ic_mic.svg';
import { ReactComponent as MicOffIcon } from './ic_mic_off.svg';
import { ReactComponent as UserIcon } from './ic_person.svg';
import { ReactComponent as ThankEmojiIcon } from './ic_reaction_clap.svg';
import { ReactComponent as HandEmojiIcon } from './ic_reaction_hand.svg';
import { ReactComponent as HeartEmojiIcon } from './ic_reaction_heart.svg';
import { ReactComponent as LikeEmojiIcon } from './ic_reaction_like.svg';
import { ReactComponent as RecordIcon } from './ic_record.svg';
import { ReactComponent as MeetingSettingIcon } from './ic_meeting_setting.svg';
import { ReactComponent as MeetingDotsIcon } from './ic_meeting_dots.svg';
import { ReactComponent as MeetingHostIcon } from './ic_meeting_host.svg';
import { ReactComponent as MeetingClockIcon } from './ic_meeting_clock.svg';
import { ReactComponent as MeetingIdIcon } from './ic_meeting_id.svg';
import { ReactComponent as MeetingNewIcon } from './ic_meeting_new.svg';
import { ReactComponent as MeetingJoinIcon } from './ic_meeting_join.svg';
import { ReactComponent as MeetingScheduleIcon } from './ic_meeting_schedule.svg';
import { ReactComponent as MeetingCaretRightIcon } from './ic_meeting_caret_right.svg';
import { ReactComponent as MeetingFolderIcon } from './ic_meeting_folder.svg';
import { ReactComponent as MeetingCloseIcon } from './ic_meeting_close.svg';
import { ReactComponent as MeetingUserPlusIcon } from './ic_meeting_user_plus.svg';
import { ReactComponent as MeetingLinkIcon } from './ic_meeting_link.svg';
import { ReactComponent as MemberMicIcon } from './ic_member_mic.svg';
import { ReactComponent as MemberMicSpeakingIcon } from './ic_member_mic_speaking.svg';
import { ReactComponent as MemberMicOffIcon } from './ic_member_mic_off.svg';
import { ReactComponent as MemberVideoIcon } from './ic_member_video.svg';
import { ReactComponent as MemberDotsIcon } from './ic_member_dots.svg';
import { ReactComponent as MeetingCaretUpIcon } from './ic_meeting_caret_up.svg';
import { ReactComponent as MeetingCaretDownIcon } from './ic_meeting_caret_down.svg';
import { ReactComponent as MeetingTitleCaretIcon } from './ic_meeting_title_caret.svg';
import { ReactComponent as TileMicIcon } from './ic_tile_mic.svg';
import { ReactComponent as TileMicOffIcon } from './ic_tile_mic_off.svg';
import { ReactComponent as SettingProfileIcon } from './ic_setting_profile.svg';
import { ReactComponent as SettingSdcardIcon } from './ic_setting_sdcard.svg';
import { ReactComponent as SettingNoteIcon } from './ic_setting_note.svg';
import { ReactComponent as SettingGlobeIcon } from './ic_setting_globe.svg';
import { ReactComponent as SettingSignoutIcon } from './ic_setting_signout.svg';
import { ReactComponent as SettingProfileBigIcon } from './ic_setting_profile_big.svg';
import { ReactComponent as ChatPhoneIcon } from './ic_chat_phone.svg';
import { ReactComponent as ChatVideoIcon } from './ic_chat_video.svg';
import { ReactComponent as ChatPdfIcon } from './ic_chat_pdf.svg';
import { ReactComponent as ChatNotePencilIcon } from './ic_chat_note_pencil.svg';
import { ReactComponent as ChatSearchIcon } from './ic_chat_search.svg';
import { ReactComponent as ChatBellSlashIcon } from './ic_chat_bell_slash.svg';
import { ReactComponent as ChatCheckIcon } from './ic_chat_check.svg';
import { ReactComponent as ChatPaperclipIcon } from './ic_chat_paperclip.svg';
import { ReactComponent as ChatMicIcon } from './ic_chat_mic.svg';
import { ReactComponent as ChatImageIcon } from './ic_chat_image.svg';
import { ReactComponent as LobbyBackgroundIcon } from './ic_lobby_background.svg';
import { ReactComponent as ChatSmileyIcon } from './ic_chat_smiley.svg';
import { ReactComponent as SendIcon } from './ic_send.svg';
import { ReactComponent as HomeSettingIcon } from './ic_setting.svg';
import { ReactComponent as HomeSettingActiveIcon } from './ic_setting_selected.svg';
import { ReactComponent as ShareScreenIcon } from './ic_share_screen.svg';
import { ReactComponent as UsersIcon } from './ic_users.svg';
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
    case 'meetingDots':
      return <MeetingDotsIcon {...svgProps} />;
    case 'meetingHost':
      return <MeetingHostIcon {...svgProps} />;
    case 'meetingClock':
      return <MeetingClockIcon {...svgProps} />;
    case 'meetingId':
      return <MeetingIdIcon {...svgProps} />;
    case 'meetingNew':
      return <MeetingNewIcon {...svgProps} />;
    case 'meetingJoin':
      return <MeetingJoinIcon {...svgProps} />;
    case 'meetingSchedule':
      return <MeetingScheduleIcon {...svgProps} />;
    case 'meetingCaretRight':
      return <MeetingCaretRightIcon {...svgProps} />;
    case 'meetingFolder':
      return <MeetingFolderIcon {...svgProps} />;
    case 'meetingClose':
      return <MeetingCloseIcon {...svgProps} />;
    case 'settingProfile':
      return <SettingProfileIcon {...svgProps} />;
    case 'settingSdcard':
      return <SettingSdcardIcon {...svgProps} />;
    case 'settingNote':
      return <SettingNoteIcon {...svgProps} />;
    case 'settingGlobe':
      return <SettingGlobeIcon {...svgProps} />;
    case 'settingSignout':
      return <SettingSignoutIcon {...svgProps} />;
    case 'settingProfileBig':
      return <SettingProfileBigIcon {...svgProps} />;
    case 'chatPhone':
      return <ChatPhoneIcon {...svgProps} />;
    case 'chatVideo':
      return <ChatVideoIcon {...svgProps} />;
    case 'chatPdf':
      return <ChatPdfIcon {...svgProps} />;
    case 'chatNotePencil':
      return <ChatNotePencilIcon {...svgProps} />;
    case 'chatSearch':
      return <ChatSearchIcon {...svgProps} />;
    case 'chatBellSlash':
      return <ChatBellSlashIcon {...svgProps} />;
    case 'chatCheck':
      return <ChatCheckIcon {...svgProps} />;
    case 'chatPaperclip':
      return <ChatPaperclipIcon {...svgProps} />;
    case 'chatMic':
      return <ChatMicIcon {...svgProps} />;
    case 'chatImage':
      return <ChatImageIcon {...svgProps} />;
    case 'chatSmiley':
      return <ChatSmileyIcon {...svgProps} />;
    case 'meetingSetting':
      return <MeetingSettingIcon {...svgProps} />;
    case 'record':
      return <RecordIcon {...svgProps} />;
    case 'chat':
      return <ChatIcon {...svgProps} />;
    case 'hand':
      return <HandEmojiIcon {...svgProps} />;
    case 'like':
      return <LikeEmojiIcon {...svgProps} />;
    case 'heart':
      return <HeartEmojiIcon {...svgProps} />;
    case 'clap':
      return <ThankEmojiIcon {...svgProps} />;
    case 'send':
      return <SendIcon {...svgProps} />;
    case 'meetingUserPlus':
      return <MeetingUserPlusIcon {...svgProps} />;
    case 'meetingLink':
      return <MeetingLinkIcon {...svgProps} />;
    case 'memberMic':
      return <MemberMicIcon {...svgProps} />;
    case 'memberMicSpeaking':
      return <MemberMicSpeakingIcon {...svgProps} />;
    case 'memberMicOff':
      return <MemberMicOffIcon {...svgProps} />;
    case 'memberVideo':
      return <MemberVideoIcon {...svgProps} />;
    case 'memberDots':
      return <MemberDotsIcon {...svgProps} />;
    case 'meetingCaretUp':
      return <MeetingCaretUpIcon {...svgProps} />;
    case 'meetingCaretDown':
      return <MeetingCaretDownIcon {...svgProps} />;
    case 'meetingTitleCaret':
      return <MeetingTitleCaretIcon {...svgProps} />;
    case 'tileMic':
      return <TileMicIcon {...svgProps} />;
    case 'tileMicOff':
      return <TileMicOffIcon {...svgProps} />;
    case 'lobbyBackground':
      return <LobbyBackgroundIcon {...svgProps} />;
    default:
      return null;
  }
}
