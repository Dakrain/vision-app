/* eslint-disable @typescript-eslint/no-unused-vars */
import AgoraEngineService from '@/renderer/shared/services/Agora/AgoraEngineService';
import type { MeetingUser as MeetingUserType } from '@/renderer/shared/types/meeting';
import { MeetingRole, MemberStatus } from '@/renderer/shared/types/meeting';
import { Button } from '@/shared/components/Button';
import { useMeeting } from '@/shared/hooks/index';
import { CaretDownOutlined } from '@ant-design/icons';
import { Segmented, Typography } from 'antd';
import { useMemo, useState } from 'react';
import {
  EmojiPicker,
  MeetingChat,
  MeetingDetail,
  MeetingUser,
  MenuItem,
  UserSection,
  VideoView,
  VirtualBackgroundDialog
} from './components';
import { ShareScreenDialog } from './components/ShareScreenDialog/ShareScreenDialog';
import { MEETING_USER_TABS } from './constants';
import './Meeting.scss';
// const { ScreenCaptureSourceInfo, ScreenCaptureSourceType, ClientRoleType } = window.require('agora-electron-sdk');
import { ClientRoleType, ScreenCaptureSourceType } from 'agora-electron-sdk';
function Meeting() {
  const [openShareScreenDialog, setOpenShareScreenDialog] = useState(false);
  const [openEmojiPicker, setOpenEmojiPicker] = useState(false);
  const [openVirtualBackgroundDialog, setOpenVirtualBackgroundDialog] =
    useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [openMeetingDetail, setOpenMeetingDetail] = useState(false);
  const [activeTab, setActiveTab] = useState(MEETING_USER_TABS[0].value);
  const [showMeetingUser, setShowMeetingUser] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [reaction, setReaction] = useState(false);

  const toggleShowMeetingUser = () => {
    setShowMeetingUser(!showMeetingUser);
    setShowChat(false);
  };

  const toggleShowChat = () => {
    setShowChat(!showChat);
    setShowMeetingUser(false);
  };

  const {
    isConnected,
    isError,
    enableCamera,
    enableMic,
    sources,
    meetingUsers,
    meetingDetail,
    leaveMeeting,
    setSources,
    remoteUsers,
    toggleCamera,
    toggleMic,
    sendReaction,
    sendMessage,
    startSharingScreen,
    stopSharingScreen
  } = useMeeting();
  const getGridClass = (totalParticipants: number) => {
    if (totalParticipants === 1) return 'single-user';
    if (totalParticipants <= 2) return 'two-users';
    if (totalParticipants <= 4) return 'three-to-four-users';
    return 'many-users';
  };

  const renderUsers = useMemo(() => {
    const mockUser = {
      agUid: 1,
      enableAudio: 1,
      enableVideo: 1,
      avatarUrl: 'https://via.placeholder.com/150',
      fullName: 'Vision20User',
    };

    const mockUsers = Array.from({ length: 8 }, () => mockUser);

    // Filter meetingUsers to only include those present in remoteUsers
    const activeUsers = meetingUsers.filter(
      (user) =>
        // Include local user or users present in remoteUsers
        user.agUid === meetingDetail?.user?.agUid ||
        remoteUsers.some((remoteUser) => remoteUser === user.agUid),
    );
    return (
      <div className={`meeting-grid ${getGridClass(activeUsers.length)}`}>
        {activeUsers.map((user) => (
          <VideoView
            key={user.agUid}
            uid={user.agUid ?? 0}
            isLocal={user.agUid === meetingDetail?.user?.agUid }
            debug={false}
            enableAudio={user.enableAudio === 1}
            enableVideo={ user.enableVideo === 1 }
            avatar={user.avatarUrl ?? ''}
            label={user.fullName ?? 'Vision20User'}
            reaction={user.reaction}
            className="video-item"
          />
        ))}
      </div>
    );
  }, [meetingDetail?.user?.agUid, meetingUsers, remoteUsers]);

  const onAction = (user: MeetingUserType) => {
    console.log(user);
  };
  

  const handleEmojiSelect = (emoji: string) => {
    console.log('Selected emoji:', emoji);
  };

  const renderChat = useMemo(() => {
    return <MeetingChat sendMessage={sendMessage} />;
  }, [sendMessage]);

  const renderMeetingUsers = useMemo(() => {
    const filterUsers = (condition: (user: MeetingUserType) => boolean) =>
      meetingUsers.filter(condition);

    const waitingUsers = filterUsers(
      (user) => user.status === MemberStatus.PENDING,
    );
    const activeUsers = filterUsers(
      (user) => user.status === MemberStatus.APPROVED,
    );
    const hosts = filterUsers((user) => user.role === MeetingRole.HOST);

    const joinedUsers = activeUsers.filter(
      (user) =>
        user.isJoin === 1 &&
        ![MeetingRole.HOST, MeetingRole.CO_HOST].includes(user.role!) &&
        remoteUsers.some((remoteUser) => remoteUser === user.agUid),
    );

    const notJoinedUsers = activeUsers.filter((user) => user.isJoin === 0);

    const inRoomTab = (
      <div>
        <UserSection title="HOST" users={hosts} onAction={onAction} />
        {joinedUsers.length > 0 && (
          <UserSection
            title="NGƯỜI THAM DỰ"
            users={joinedUsers}
            onAction={onAction}
          />
        )}
        {notJoinedUsers.length > 0 && (
          <UserSection
            title="ĐƯỢC THÊM VÀO PHÒNG"
            users={notJoinedUsers}
            onAction={onAction}
          />
        )}
      </div>
    );

    const pendingTab = (
      <div>
        {waitingUsers.map((user) => (
          <MeetingUser key={user.agUid} user={user} />
        ))}
      </div>
    );

    return (
      <div className="meeting-users-container">
        <Typography.Text className="meeting-users-container-title">
          Người tham dự
        </Typography.Text>
        <Segmented
          options={MEETING_USER_TABS}
          className="meeting-users-container-segmented"
          size="large"
          defaultValue={MEETING_USER_TABS[0].value}
          value={activeTab}
          onChange={setActiveTab}
        />
        {activeTab === MEETING_USER_TABS[0].value ? inRoomTab : pendingTab}
      </div>
    );
  }, [activeTab, meetingUsers, remoteUsers]);

  return (
    <div className="root">
      <div className="meeting-container">
        <div className="meeting-header">
          <div
            className="meeting-header-title"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setOpenMeetingDetail(true);
              }
            }}
            onClick={() => {
              setOpenMeetingDetail(true);
            }}
          >
            <p>{meetingDetail?.room?.title}</p>
            <CaretDownOutlined style={{ color: 'white' }} />
          </div>
          <div className="meeting-header-controls">
            <MenuItem icon="viewLayout" name="View layout" onClick={() => {}} />
            <MenuItem
              icon="fullScreen"
              name="Full screen"
              onClick={() => {
                if (!document.fullscreenElement) {
                  document.documentElement.requestFullscreen();
                  setIsFullScreen(true);
                } else {
                  document.exitFullscreen();
                  setIsFullScreen(false);
                }
              }}
            />
          </div>
        </div>
        <div className="meeting-body">
          {isConnected ? (
            <div
              className={`meeting-body-grid ${showChat || showMeetingUser ? 'visible' : ''}`}
            >
              {renderUsers}
            </div>
          ) : (
            <div>
              <p>Disconnected</p>
            </div>
          )}
          <div
            className={`meeting-sidebar ${showChat || showMeetingUser ? 'visible' : ''}`}
          >
            {showMeetingUser && renderMeetingUsers}
            {showChat && renderChat}
          </div>
        </div>
        <div className="meeting-footer">
          <div
            style={{
              alignItems: 'flex-start',
              justifyContent: 'center',
              display: 'flex',
            }}
          >
            <MenuItem
              icon={enableCamera ? 'cameraOn' : 'cameraOff'}
              name="Camera"
              onClick={toggleCamera}
            />
            <MenuItem
              icon={enableMic ? 'micOn' : 'micOff'}
              name="Âm thanh"
              onClick={toggleMic}
            />
          </div>
          <div
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              display: 'flex',
            }}
          >
            <MenuItem icon="record" name="Ghi âm" onClick={() => {}} />
            <MenuItem
              icon="shareScreen"
              name={isSharing ? 'Dừng chia sẻ' : 'Chia sẻ màn hình'}
              onClick={() => {
                if (isSharing) {
                  AgoraEngineService.stopScreenCapture();
                  AgoraEngineService.leaveChannelEx({ channelId: meetingDetail?.room?.channelName ?? '', localUid: (meetingDetail?.user?.agUid ?? 0) + 10000 });
                  stopSharingScreen();
                  setIsSharing(false);
                } else {
                  const res = AgoraEngineService.getScreenCaptureSources(
                    { width: 600, height: 400 },
                    { width: 64, height: 64 },
                    true,
                  );
                  setSources(res);
                  setOpenShareScreenDialog(true);
                }
              }}
            />
            <EmojiPicker
              open={openEmojiPicker}
              onClose={() => {
                setOpenEmojiPicker(false);
              }}
              onEmojiSelect={(emoji) => {
                sendReaction(emoji);
                setReaction(true);
                setOpenEmojiPicker(false);
              }} 
            >
              <MenuItem icon="emoji" name={reaction ? 'Dừng thả cảm xúc' : 'Thả cảm xúc'} onClick={() => {
                if(reaction) {
                  setReaction(false);
                  sendReaction('NONE');
                } else {
                  setOpenEmojiPicker(true);
                }
              }} />
            </EmojiPicker>
            <MenuItem
              icon="users"
              name="Người tham dự"
              onClick={toggleShowMeetingUser}
            />
            <MenuItem icon="chat" name="Chat" onClick={toggleShowChat} />
            <MenuItem icon="setting" name="Cài đặt" onClick={() => {}} />
            <MenuItem
              icon="setting"
              name="Phong nền"
              onClick={() => {
                setOpenVirtualBackgroundDialog(true);
              }}
            />
          </div>
          <Button
            variant="primary"
            title="Kết thúc"
            onClick={leaveMeeting}
            style={{ marginLeft: 'auto', width: '120px' }}
          />
        </div>
        <ShareScreenDialog
          open={openShareScreenDialog}
          onClose={() => {
            setOpenShareScreenDialog(false);
          }}
          onShare={(selectedSource) => {
            try {
              
            setIsSharing(true);
            setOpenShareScreenDialog(false);
            startSharingScreen();
            console.log('onShare boolean',selectedSource.sourceId);
            if ( selectedSource.sourceId !== undefined) {
              console.log('onShare Token', meetingDetail?.user?.agScreenToken);

              if(selectedSource.type === ScreenCaptureSourceType.ScreencapturesourcetypeWindow) {
              AgoraEngineService.startScreenCaptureByWindowId(
                selectedSource.sourceId,
                {},
                {
                  dimensions: { width: 1920, height: 1080 },
                  frameRate: 15,
                  bitrate: 0,
                  captureMouseCursor: true,
                  windowFocus: false,
                  highLightWidth: 0,
                  highLightColor: 0xff8cbf26,
                  enableHighLight: false,
                },
              );
            } else if(selectedSource.type === ScreenCaptureSourceType.ScreencapturesourcetypeScreen) {
              AgoraEngineService.startScreenCaptureByDisplayId(
                selectedSource.sourceId,
                {},
                {
                  dimensions: { width: 1920, height: 1080 },
                  frameRate: 15,
                  bitrate: 0,
                  captureMouseCursor: true,
                  windowFocus: false,
                  highLightWidth: 0,
                  highLightColor: 0xff8cbf26,
                  enableHighLight: false,
                },
              );
            }
            AgoraEngineService.updateChannelMediaOptions({
              publishScreenTrack: true,
              publishCameraTrack: false,
              clientRoleType: ClientRoleType.ClientRoleBroadcaster,
            });

            AgoraEngineService.joinChannelEx(
              meetingDetail?.user?.agScreenToken ?? '',
              {channelId: meetingDetail?.room?.channelName ?? '', 
                localUid: (meetingDetail?.user?.agUid ?? 0) + 800000,
              },
              {
                autoSubscribeAudio: false,
                autoSubscribeVideo: false,
                publishMicrophoneTrack: false,
                publishCameraTrack: false,
                clientRoleType: ClientRoleType.ClientRoleBroadcaster,
                publishScreenTrack: true,
              }
            );
          }
            } catch (error) {
              console.log('onShare', error);
            }
}}
          sources={sources}
        />

        <MeetingDetail
          isOpen={openMeetingDetail}
          onClose={() => {
            setOpenMeetingDetail(false);
          }}
          meetingInfo={meetingDetail?.room || {}}
        />
        <VirtualBackgroundDialog
          open={openVirtualBackgroundDialog}
          onClose={() => {
            setOpenVirtualBackgroundDialog(false);
          }}
        />
      </div>
    </div>
  );
}

export default Meeting;
