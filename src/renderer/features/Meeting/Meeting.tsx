/* eslint-disable @typescript-eslint/no-unused-vars */
import AgoraEngineService from '@/renderer/shared/services/Agora/AgoraEngineService';
import type { MeetingUser as MeetingUserType } from '@/renderer/shared/types/meeting';
import { MeetingRole, MemberStatus } from '@/renderer/shared/types/meeting';
import { Button } from '@/shared/components/Button';
import { useMeeting } from '@/shared/hooks/index';
import { CaretDownOutlined } from '@ant-design/icons';
import {
  Button as AntButton,
  Modal,
  Segmented,
  Typography,
  notification,
} from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMeetingRecorder } from '@/renderer/shared/hooks/useMeetingRecorder';
import { useLivestream } from '@/shared/hooks/useLivestream';
import { ensureScreenCaptureAccess } from '@/shared/utils/screenCapturePermission';
import { LivestreamDialog } from './components/LivestreamDialog/LivestreamDialog';
import { AddMemberDialog } from './components/AddMemberDialog/AddMemberDialog';
import type { MemberAction } from './components/MeetingUser/MeetingUser';
import {
  EmojiPicker,
  MeetingChat,
  MeetingDetail,
  MeetingUser,
  MenuItem,
  UserSection,
  VideoView,
  VirtualBackgroundDialog,
} from './components';
import { ShareScreenDialog } from './components/ShareScreenDialog/ShareScreenDialog';
import { MEETING_USER_TABS } from './constants';
import { RoomPermissions } from './components/RoomPermissions/RoomPermissions';
import './Meeting.scss';
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
  const [openLeaveDialog, setOpenLeaveDialog] = useState(false);
  const [openLivestreamDialog, setOpenLivestreamDialog] = useState(false);
  const [openAddMember, setOpenAddMember] = useState(false);

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
    isReconnecting,
    isError,
    enableCamera,
    enableMic,
    sources,
    meetingUsers,
    meetingDetail,
    leaveMeeting,
    endMeeting,
    isHost,
    canManageLivestream,
    canManageMembers,
    myRole,
    announceScreenShare,
    remoteSharingUid,
    muteMember,
    muteAllMembers,
    kickMember,
    changeMemberRole,
    addMember,
    reviewWaitingMember,
    permissions,
    roomSettings,
    updateRoomSettings,
    livestreamSignal,
    sendLivestreamState,
    meetingId,
    setSources,
    remoteUsers,
    toggleCamera,
    toggleMic,
    sendReaction,
    sendMessage,
    startSharingScreen,
    stopSharingScreen,
  } = useMeeting();
  const livestream = useLivestream({
    meetingId: Number(meetingId) || undefined,
    canManage: canManageLivestream,
    signal: livestreamSignal,
    announce: sendLivestreamState,
    myUid: meetingDetail?.user?.agUid,
    remoteUids: remoteUsers,
    isSharing,
    remoteSharingUid,
  });

  // Everyone must know when the meeting goes out publicly.
  const wasLive = useRef(false);
  useEffect(() => {
    if (livestream.isLive && !wasLive.current) {
      const platforms = Array.from(
        new Set(
          livestream.activeStreams.map((s) =>
            s.platform === 'custom'
              ? s.name
              : s.platform === 'youtube'
                ? 'YouTube'
                : 'Facebook',
          ),
        ),
      ).join(', ');
      notification.warning({
        message: 'Cuộc họp đang được phát trực tiếp',
        description: `Hình ảnh và âm thanh của cuộc họp đang được phát công khai lên ${platforms}.`,
        placement: 'top',
      });
    }
    wasLive.current = livestream.isLive;
  }, [livestream.isLive, livestream.activeStreams]);

  // ---- Waiting room (host/co-host).
  const waitingUsers = useMemo(
    () => meetingUsers.filter((user) => user.status === MemberStatus.PENDING),
    [meetingUsers],
  );
  const review = (user: MeetingUserType, approve: boolean) => {
    notification.destroy(`waiting-${user.userId}`);
    reviewWaitingMember(user, approve).catch(() =>
      notification.error({
        message: approve ? 'Không cho vào được' : 'Không từ chối được',
        placement: 'top',
      }),
    );
  };
  const reviewRef = useRef(review);
  reviewRef.current = review;
  // Announce each new request once, with quick actions.
  const announcedWaiting = useRef(new Set<number>());
  useEffect(() => {
    if (!canManageMembers) return;
    waitingUsers.forEach((user) => {
      const id = user.userId ?? 0;
      if (announcedWaiting.current.has(id)) return;
      announcedWaiting.current.add(id);
      const key = `waiting-${id}`;
      notification.info({
        key,
        message: `${user.fullName ?? 'Một người'} đang chờ vào phòng`,
        placement: 'topRight',
        duration: 0,
        btn: (
          <div className="meeting-waiting-actions">
            <AntButton
              size="small"
              onClick={() => reviewRef.current(user, false)}
            >
              Từ chối
            </AntButton>
            <AntButton
              size="small"
              type="primary"
              onClick={() => reviewRef.current(user, true)}
            >
              Cho vào
            </AntButton>
          </div>
        ),
      });
    });
    // Requests handled elsewhere (co-host, cancelled): drop their toast.
    const stillWaiting = new Set(waitingUsers.map((u) => u.userId ?? 0));
    announcedWaiting.current.forEach((id) => {
      if (!stillWaiting.has(id)) {
        announcedWaiting.current.delete(id);
        notification.destroy(`waiting-${id}`);
      }
    });
  }, [waitingUsers, canManageMembers]);

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
            isLocal={user.agUid === meetingDetail?.user?.agUid}
            debug={false}
            enableAudio={user.enableAudio === 1}
            enableVideo={
              user.enableVideo === 1 ||
              (isSharing && user.agUid === meetingDetail?.user?.agUid)
            }
            isSharing={isSharing && user.agUid === meetingDetail?.user?.agUid}
            avatar={user.avatarUrl ?? ''}
            label={user.fullName ?? 'Vision20User'}
            reaction={user.reaction}
            className="video-item"
          />
        ))}
      </div>
    );
  }, [meetingDetail?.user?.agUid, meetingUsers, remoteUsers, isSharing]);

  const myUid = meetingDetail?.user?.agUid;

  // Mirrors MeetingMemberModel.canManageMember on the server.
  const actionsFor = (user: MeetingUserType): MemberAction[] => {
    if (!canManageMembers || user.agUid === myUid) return [];
    if (user.role === MeetingRole.HOST) return [];
    if (myRole !== MeetingRole.HOST && user.role !== MeetingRole.MEMBER) {
      return [];
    }
    const actions: MemberAction[] = [];
    if (user.enableAudio) actions.push('muteAudio');
    if (user.enableVideo) actions.push('muteVideo');
    if (myRole === MeetingRole.HOST) {
      actions.push(
        user.role === MeetingRole.CO_HOST ? 'removeCohost' : 'makeCohost',
      );
    }
    // Kick/ban are on hold in the apps (the API exists: host/user/kick.js).
    return actions;
  };

  const onAction = async (user: MeetingUserType, action: MemberAction) => {
    try {
      switch (action) {
        case 'muteAudio':
          await muteMember(user, 'audio');
          break;
        case 'muteVideo':
          await muteMember(user, 'video');
          break;
        case 'makeCohost':
          await changeMemberRole(user, MeetingRole.CO_HOST);
          break;
        case 'removeCohost':
          await changeMemberRole(user, MeetingRole.MEMBER);
          break;
        case 'kick':
          await kickMember(user, false);
          break;
        case 'ban':
          await kickMember(user, true);
          break;
        default:
          break;
      }
    } catch (_) {
      notification.error({
        message: 'Không thực hiện được thao tác',
        description: 'Bạn có thể không đủ quyền, hoặc người này đã rời phòng.',
        placement: 'top',
      });
    }
  };

  const onMuteAll = () => {
    Modal.confirm({
      title: 'Tắt micro tất cả',
      content:
        'Tắt micro của mọi thành viên (trừ Host và Co-host)? Mọi người vẫn tự bật lại được.',
      okText: 'Tắt micro tất cả',
      cancelText: 'Huỷ',
      onOk: () =>
        muteAllMembers().catch(() =>
          notification.error({
            message: 'Không tắt được micro của mọi người',
            placement: 'top',
          }),
        ),
    });
  };

  const handleEmojiSelect = (emoji: string) => {
    console.log('Selected emoji:', emoji);
  };

  const renderChat = useMemo(() => {
    return <MeetingChat sendMessage={sendMessage} canSend={permissions.chat} />;
  }, [sendMessage, permissions.chat]);

  const renderMeetingUsers = useMemo(() => {
    const filterUsers = (condition: (user: MeetingUserType) => boolean) =>
      meetingUsers.filter(condition);

    const activeUsers = filterUsers(
      (user) => user.status === MemberStatus.APPROVED,
    );
    const hosts = filterUsers((user) => user.role === MeetingRole.HOST);
    const cohosts = activeUsers.filter(
      (user) => user.role === MeetingRole.CO_HOST && user.isJoin === 1,
    );

    const joinedUsers = activeUsers.filter(
      (user) =>
        user.isJoin === 1 &&
        ![MeetingRole.HOST, MeetingRole.CO_HOST].includes(user.role!) &&
        // remoteUsers never contains our own uid
        (user.agUid === myUid ||
          remoteUsers.some((remoteUser) => remoteUser === user.agUid)),
    );

    const notJoinedUsers = activeUsers.filter((user) => user.isJoin === 0);
    const section = (title: string, users: MeetingUserType[]) =>
      users.length > 0 && (
        <UserSection
          title={title}
          users={users}
          onAction={onAction}
          actionsFor={actionsFor}
        />
      );

    const inRoomTab = (
      <div>
        {canManageMembers && (
          <div className="meeting-users-actions">
            <Button
              variant="outline"
              title="Tắt micro tất cả"
              onClick={onMuteAll}
            />
            <Button
              variant="primary"
              title="+ Thêm người"
              onClick={() => setOpenAddMember(true)}
            />
            <RoomPermissions
              settings={roomSettings}
              onChange={updateRoomSettings}
            >
              <Button variant="outline" title="Quyền" />
            </RoomPermissions>
          </div>
        )}
        {section('HOST', hosts)}
        {section('CO-HOST', cohosts)}
        {section('NGƯỜI THAM DỰ', joinedUsers)}
        {section('ĐƯỢC THÊM VÀO PHÒNG', notJoinedUsers)}
      </div>
    );

    const pendingTab = (
      <div className="meeting-waiting-list">
        {waitingUsers.length === 0 && (
          <Typography.Text className="meeting-waiting-empty">
            {meetingDetail?.room?.waitingRoom === 1
              ? 'Chưa có ai đang chờ'
              : 'Phòng này không bật phòng chờ'}
          </Typography.Text>
        )}
        {waitingUsers.map((user) => (
          <div key={user.userId} className="meeting-waiting-row">
            <MeetingUser user={user} />
            {canManageMembers && (
              <div className="meeting-waiting-actions">
                <AntButton
                  size="small"
                  onClick={() => reviewRef.current(user, false)}
                >
                  Từ chối
                </AntButton>
                <AntButton
                  size="small"
                  type="primary"
                  onClick={() => reviewRef.current(user, true)}
                >
                  Cho vào
                </AntButton>
              </div>
            )}
          </div>
        ))}
      </div>
    );

    return (
      <div className="meeting-users-container">
        <Typography.Text className="meeting-users-container-title">
          Người tham dự
        </Typography.Text>
        <Segmented
          options={MEETING_USER_TABS.map((tab) =>
            tab.value === 'pending' && waitingUsers.length > 0
              ? { ...tab, label: `${tab.label} (${waitingUsers.length})` }
              : tab,
          )}
          className="meeting-users-container-segmented"
          size="large"
          defaultValue={MEETING_USER_TABS[0].value}
          value={activeTab}
          onChange={setActiveTab}
        />
        {activeTab === MEETING_USER_TABS[0].value ? inRoomTab : pendingTab}
      </div>
    );
  }, [
    activeTab,
    meetingUsers,
    waitingUsers,
    remoteUsers,
    canManageMembers,
    myRole,
    myUid,
    meetingDetail?.room?.waitingRoom,
    roomSettings,
    updateRoomSettings,
  ]);

  const recorder = useMeetingRecorder(meetingDetail?.room?.title);

  // Permission taken away mid-meeting: stop sharing / recording (the hook
  // already tells the user what changed).
  useEffect(() => {
    if (!permissions.share && isSharing) {
      AgoraEngineService.stopScreenCapture();
      stopSharingScreen();
      setIsSharing(false);
      announceScreenShare(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissions.share]);
  useEffect(() => {
    if (!permissions.record && recorder.isRecording) recorder.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissions.record]);
  const [clockNow, setClockNow] = useState(Date.now());
  useEffect(() => {
    if (!recorder.isRecording) return undefined;
    const timer = setInterval(() => setClockNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [recorder.isRecording]);
  const recordingClock = (() => {
    const s = Math.max(
      0,
      Math.floor((clockNow - (recorder.startedAt ?? clockNow)) / 1000),
    );
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(
      s % 60,
    ).padStart(2, '0')}`;
  })();

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
            {livestream.isLive && (
              <span className="meeting-live-badge" title="Đang phát trực tiếp">
                ● LIVE
              </span>
            )}
            {recorder.isRecording && (
              <span className="meeting-rec-badge" title="Đang ghi cuộc họp">
                ● REC {recordingClock}
              </span>
            )}
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
          {isReconnecting && (
            <div className="meeting-reconnecting" role="status">
              <span className="meeting-reconnecting-spinner" />
              <span>Mất kết nối mạng. Đang kết nối lại…</span>
              <button
                type="button"
                onClick={() =>
                  isHost ? setOpenLeaveDialog(true) : leaveMeeting()
                }
              >
                Rời phòng
              </button>
            </div>
          )}
          {isConnected ? (
            <div
              className={`meeting-body-grid ${showChat || showMeetingUser ? 'visible' : ''}`}
            >
              {renderUsers}
            </div>
          ) : (
            <div className="meeting-connecting">
              <span className="meeting-reconnecting-spinner" />
              <p>Đang kết nối vào cuộc họp…</p>
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
              locked={!enableCamera && !permissions.camera}
            />
            <MenuItem
              icon={enableMic ? 'micOn' : 'micOff'}
              name="Âm thanh"
              onClick={toggleMic}
              locked={!enableMic && !permissions.mic}
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
            {/* Local recording: host/co-host, or members if the room allows. */}
            <MenuItem
              icon="record"
              name={recorder.isRecording ? 'Dừng ghi' : 'Ghi cuộc họp'}
              locked={!recorder.isRecording && !permissions.record}
              onClick={() => {
                if (recorder.isRecording) {
                  recorder.stop();
                } else if (!permissions.record) {
                  notification.warning({
                    message: 'Chủ phòng chưa cho phép ghi cuộc họp',
                    placement: 'top',
                  });
                } else {
                  recorder.start();
                }
              }}
            />
            <MenuItem
              icon="shareScreen"
              name={isSharing ? 'Dừng chia sẻ' : 'Chia sẻ màn hình'}
              locked={!isSharing && !permissions.share}
              onClick={async () => {
                if (!isSharing && !permissions.share) {
                  notification.warning({
                    message: 'Chủ phòng chưa cho phép chia sẻ màn hình',
                    placement: 'top',
                  });
                  return;
                }
                if (isSharing) {
                  AgoraEngineService.stopScreenCapture();
                  stopSharingScreen();
                  setIsSharing(false);
                  announceScreenShare(false);
                } else {
                  if (!(await ensureScreenCaptureAccess())) return;
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
            {canManageLivestream && livestream.supported && (
              <MenuItem
                icon={
                  <span
                    className={`meeting-live-icon ${livestream.isLive ? 'on' : ''}`}
                  >
                    LIVE
                  </span>
                }
                name={
                  livestream.isLive ? 'Đang phát trực tiếp' : 'Phát trực tiếp'
                }
                onClick={() => setOpenLivestreamDialog(true)}
              />
            )}
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
              <MenuItem
                icon="emoji"
                name={reaction ? 'Dừng thả cảm xúc' : 'Thả cảm xúc'}
                onClick={() => {
                  if (reaction) {
                    setReaction(false);
                    sendReaction('NONE');
                  } else {
                    setOpenEmojiPicker(true);
                  }
                }}
              />
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
            onClick={() => (isHost ? setOpenLeaveDialog(true) : leaveMeeting())}
            style={{ marginLeft: 'auto', width: '120px' }}
          />
        </div>
        <Modal
          open={openLeaveDialog}
          onCancel={() => setOpenLeaveDialog(false)}
          title="Thoát cuộc họp"
          centered
          footer={null}
        >
          <Typography.Paragraph>
            Kết thúc cuộc họp cho tất cả mọi người, hay chỉ mình bạn rời phòng?
          </Typography.Paragraph>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Button
              variant="primary"
              title="Kết thúc cuộc họp cho mọi người"
              onClick={endMeeting}
            />
            <Button
              variant="outline"
              title="Rời phòng"
              onClick={leaveMeeting}
            />
          </div>
        </Modal>
        <AddMemberDialog
          open={openAddMember}
          onClose={() => setOpenAddMember(false)}
          members={meetingUsers}
          canAddCohost={myRole === MeetingRole.HOST}
          onAdd={addMember}
        />
        <LivestreamDialog
          open={openLivestreamDialog}
          onClose={() => setOpenLivestreamDialog(false)}
          streams={livestream.streams}
          activeStreams={livestream.activeStreams}
          onStart={livestream.start}
          onStop={livestream.stop}
        />
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
              announceScreenShare(true);
              console.log('onShare boolean', selectedSource.sourceId);
              if (selectedSource.sourceId !== undefined) {
                console.log(
                  'onShare Token',
                  meetingDetail?.user?.agScreenToken,
                );

                if (
                  selectedSource.type ===
                  ScreenCaptureSourceType.ScreencapturesourcetypeWindow
                ) {
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
                } else if (
                  selectedSource.type ===
                  ScreenCaptureSourceType.ScreencapturesourcetypeScreen
                ) {
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
                // Share on the main connection (same as mobile) so every client
                // sees the screen in the presenter's own tile.
                AgoraEngineService.updateChannelMediaOptions({
                  publishScreenTrack: true,
                  publishCameraTrack: false,
                  publishMicrophoneTrack: true,
                  clientRoleType: ClientRoleType.ClientRoleBroadcaster,
                });
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
