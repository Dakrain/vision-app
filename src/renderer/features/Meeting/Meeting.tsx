/* eslint-disable @typescript-eslint/no-unused-vars */
import AgoraEngineService from '@/renderer/shared/services/Agora/AgoraEngineService';
import type { MeetingUser as MeetingUserType } from '@/renderer/shared/types/meeting';
import { MeetingRole, MemberStatus } from '@/renderer/shared/types/meeting';
import { Button } from '@/shared/components/Button';
import { useMeeting } from '@/shared/hooks/index';
import { CaretDownOutlined } from '@ant-design/icons';
import {
  Button as AntButton,
  Dropdown,
  Modal,
  Segmented,
  Typography,
  notification,
} from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMeetingRecorder } from '@/renderer/shared/hooks/useMeetingRecorder';
import { useLivestream } from '@/shared/hooks/useLivestream';
import { takeAutoRecord } from '@/shared/utils/recordingPrefs';
import { ensureScreenCaptureAccess } from '@/shared/utils/screenCapturePermission';
import { LivestreamDialog } from './components/LivestreamDialog/LivestreamDialog';
import { AddMemberDialog } from './components/AddMemberDialog/AddMemberDialog';
import { RecordingClock } from './components/RecordingClock/RecordingClock';
import {
  MeetingStage,
  MeetingViewMode,
} from './components/MeetingStage/MeetingStage';
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

const { ipcRenderer } = window.require('electron');

/** localStorage key for the chosen meeting layout. */
const VIEW_MODE_KEY = 'meeting.viewMode';

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
    activeSpeakerUid,
    lastSpeakerUid,
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

  // Speaker / Gallery, like mobile (default speaker). Remembered per
  // device; storage may be unavailable, which only loses the preference.
  const [viewMode, setViewMode] = useState<MeetingViewMode>(() => {
    try {
      return localStorage.getItem(VIEW_MODE_KEY) === 'gallery'
        ? 'gallery'
        : 'speaker';
    } catch (_) {
      return 'speaker';
    }
  });
  const changeViewMode = (mode: MeetingViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_MODE_KEY, mode);
    } catch (_) {
      // not persisted
    }
  };

  const renderUsers = useMemo(() => {
    const selfUid = meetingDetail?.user?.agUid;
    const self = meetingUsers.find((user) => user.agUid === selfUid);
    // Others actually in the RTC channel.
    const others = meetingUsers.filter(
      (user) =>
        user.agUid !== selfUid &&
        remoteUsers.some((remoteUser) => remoteUser === user.agUid),
    );
    const renderTile = (user: MeetingUserType) => {
      const isLocal = user.agUid === selfUid;
      return (
        <VideoView
          key={user.agUid}
          uid={user.agUid ?? 0}
          isLocal={isLocal}
          debug={false}
          enableAudio={user.enableAudio === 1}
          enableVideo={user.enableVideo === 1 || (isSharing && isLocal)}
          isSharing={isSharing && isLocal}
          avatar={user.avatarUrl ?? ''}
          label={user.fullName ?? 'Vision20User'}
          reaction={user.reaction}
          className="video-item"
        />
      );
    };
    return (
      <MeetingStage
        view={viewMode}
        others={others}
        self={self}
        heroUid={remoteSharingUid ?? lastSpeakerUid}
        activeSpeakerUid={activeSpeakerUid}
        renderTile={renderTile}
      />
    );
  }, [
    meetingDetail?.user?.agUid,
    meetingUsers,
    remoteUsers,
    isSharing,
    viewMode,
    remoteSharingUid,
    lastSpeakerUid,
    activeSpeakerUid,
  ]);

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

  const stopShare = () => {
    AgoraEngineService.stopScreenCapture();
    stopSharingScreen();
    setIsSharing(false);
    announceScreenShare(false);
  };

  // Permission taken away mid-meeting: stop sharing / recording (the hook
  // already tells the user what changed).
  useEffect(() => {
    if (!permissions.share && isSharing) stopShare();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissions.share]);

  // While sharing, the app minimises behind a floating "Dừng chia sẻ" bar
  // (main process, shareOverlay.ts) — like Google Meet.
  useEffect(() => {
    ipcRenderer.send(isSharing ? 'share-overlay:show' : 'share-overlay:hide');
  }, [isSharing]);
  useEffect(() => () => ipcRenderer.send('share-overlay:hide'), []);
  const stopShareRef = useRef(stopShare);
  stopShareRef.current = stopShare;
  useEffect(() => {
    const onStop = () => stopShareRef.current();
    ipcRenderer.on('share-overlay:stop', onStop);
    return () => {
      ipcRenderer.removeListener('share-overlay:stop', onStop);
    };
  }, []);
  // "Tự động ghi âm khi cuộc họp bắt đầu", chosen when the meeting was set up.
  useEffect(() => {
    if (isConnected && isHost && takeAutoRecord(Number(meetingId))) {
      recorder.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, isHost, meetingId]);
  useEffect(() => {
    if (!permissions.record && recorder.isRecording) recorder.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissions.record]);

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
                ● REC <RecordingClock startedAt={recorder.startedAt} />
              </span>
            )}
            <p>{meetingDetail?.room?.title}</p>
            <CaretDownOutlined style={{ color: 'white' }} />
          </div>
          <div className="meeting-header-controls">
            <Dropdown
              trigger={['click']}
              placement="bottomRight"
              menu={{
                selectable: true,
                selectedKeys: [viewMode],
                items: [
                  { key: 'speaker', label: 'Speaker View' },
                  { key: 'gallery', label: 'Gallery View' },
                ],
                onClick: ({ key }) => changeViewMode(key as MeetingViewMode),
              }}
            >
              <span>
                <MenuItem icon="viewLayout" name="Bố cục" />
              </span>
            </Dropdown>
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
          <div className="meeting-footer-group">
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
          <div className="meeting-footer-group center">
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
                  stopShare();
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
            <Dropdown
              trigger={['click']}
              placement="top"
              menu={{
                items: [{ key: 'virtualBackground', label: 'Phông nền' }],
                onClick: ({ key }) => {
                  if (key === 'virtualBackground') {
                    setOpenVirtualBackgroundDialog(true);
                  }
                },
              }}
            >
              <span className="meeting-footer-dropdown">
                <MenuItem icon="meetingSetting" name="Cài đặt" />
              </span>
            </Dropdown>
          </div>
          <Button
            variant="primary"
            title="Kết thúc"
            className="meeting-footer-end"
            onClick={() => (isHost ? setOpenLeaveDialog(true) : leaveMeeting())}
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
