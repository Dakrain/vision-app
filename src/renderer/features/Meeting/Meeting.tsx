/* eslint-disable @typescript-eslint/no-unused-vars */
import Icon from '@/assets/svg/icons';
import AgoraEngineService from '@/renderer/shared/services/Agora/AgoraEngineService';
import type { MeetingUser as MeetingUserType } from '@/renderer/shared/types/meeting';
import { MeetingRole, MemberStatus } from '@/renderer/shared/types/meeting';
import { Button } from '@/shared/components/Button';
import { useAuth, useMeeting } from '@/shared/hooks/index';
import {
  Button as AntButton,
  Dropdown,
  Modal,
  Segmented,
  Typography,
  notification,
} from 'antd';
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useMeetingRecorder } from '@/renderer/shared/hooks/useMeetingRecorder';
import { useLivestream } from '@/shared/hooks/useLivestream';
import {
  useRemoteVideoSubscriptions,
  type VisibleStreams,
} from '@/renderer/shared/hooks/useRemoteVideoSubscriptions';
import { ownerOfAgUid, parseAgUid } from '@/renderer/shared/utils/agoraUid';
import { takeAutoRecord } from '@/shared/utils/recordingPrefs';
import { ensureScreenCaptureAccess } from '@/shared/utils/screenCapturePermission';
import { LivestreamDialog } from './components/LivestreamDialog/LivestreamDialog';
import { AddMemberDialog } from './components/AddMemberDialog/AddMemberDialog';
import { RecordingClock } from './components/RecordingClock/RecordingClock';
import {
  MEETING_VIEW_MODES,
  MeetingStage,
  MeetingViewMode,
  TileMenuAction,
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
import { selectChats } from './store/selector';
import './Meeting.scss';
import {
  ClientRoleType,
  ScreenCaptureSourceType,
  VideoContentHint,
} from 'agora-electron-sdk';

const { ipcRenderer } = window.require('electron');

/** localStorage key for the chosen meeting layout. */
const VIEW_MODE_KEY = 'meeting.viewMode';
const HIDE_SELF_KEY = 'meeting.hideSelf';

// Excalidraw is large: loaded the first time a board opens.
const Whiteboard = lazy(() => import('./components/Whiteboard/Whiteboard'));

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
    spotlightUid,
    spotlight,
    whiteboard,
    whiteboardSync,
    canControlWhiteboard,
    openWhiteboard,
    closeWhiteboard,
    setWhiteboardLocked,
    activeSpeakerUid,
    lastSpeakerUid,
    localSpeaking,
    chatOnline,
    companion,
    deviceAudio,
    toggleDeviceAudio,
    uidVideoOff,
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
  // Unread chat: others' messages that arrived while the chat panel was
  // closed. What was already there when the meeting loaded counts as read.
  const { user: me } = useAuth();
  const chats = useSelector(selectChats);
  const [chatSeen, setChatSeen] = useState<number>();
  useEffect(() => {
    if (chatSeen === undefined && meetingDetail?.room) {
      setChatSeen(chats.length);
    }
  }, [chatSeen, meetingDetail?.room, chats.length]);
  useEffect(() => {
    if (showChat) setChatSeen(chats.length);
  }, [showChat, chats.length]);
  const unreadChat =
    chatSeen === undefined
      ? 0
      : chats.slice(chatSeen).filter((chat) => chat.userId !== me?.id).length;

  // Me talking: highlighted like everyone else (only while my mic is on).
  const selfSpeaking = localSpeaking && enableMic;
  // Only on-screen videos are received (see MeetingStage).
  const [visibleStreams, setVisibleStreams] = useState<VisibleStreams>({
    high: [],
    low: [],
  });
  useRemoteVideoSubscriptions(remoteUsers, visibleStreams);
  const livestream = useLivestream({
    // Only once in the room: before that the API has no member to answer for.
    meetingId: isConnected ? Number(meetingId) || undefined : undefined,
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
      const saved = localStorage.getItem(VIEW_MODE_KEY) as MeetingViewMode;
      return MEETING_VIEW_MODES.includes(saved) ? saved : 'speaker';
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

  // Pinned for me only (Teams' "Pin for me"); a spotlight beats it.
  const [pinnedUid, setPinnedUid] = useState<number>();
  // My own floating tile hidden (Teams' "Hide for me"), kept per device.
  const [hideSelf, setHideSelf] = useState(() => {
    try {
      return localStorage.getItem(HIDE_SELF_KEY) === '1';
    } catch (_) {
      return false;
    }
  });
  const toggleHideSelf = () => {
    setHideSelf(!hideSelf);
    try {
      localStorage.setItem(HIDE_SELF_KEY, hideSelf ? '0' : '1');
    } catch (_) {
      // not persisted
    }
  };

  const renderUsers = useMemo(() => {
    const selfUid = meetingDetail?.user?.agUid;
    const myUserId = meetingDetail?.user?.userId;
    // Member rows carry the main uid; on a second device mine is another.
    const selfMember = meetingUsers.find((user) => user.userId === myUserId);
    const self =
      selfMember &&
      (companion
        ? {
            ...selfMember,
            agUid: selfUid,
            enableAudio: enableMic ? 1 : 0,
            enableVideo: enableCamera ? 1 : 0,
          }
        : selfMember);
    // Others actually in the RTC channel.
    const others = meetingUsers.filter(
      (user) =>
        user.agUid !== selfUid &&
        remoteUsers.some((remoteUser) => remoteUser === user.agUid),
    );
    // Connections that are not a member's main one: someone's second device
    // or a presenter's camera (docs: vision-api meeting-devices.md).
    const sharerId =
      remoteSharingUid !== undefined
        ? ownerOfAgUid(remoteSharingUid)
        : undefined;
    let presenterCam: MeetingUserType | undefined;
    remoteUsers.forEach((uid) => {
      if (uid === selfUid || meetingUsers.some((u) => u.agUid === uid)) return;
      const { userId, kind } = parseAgUid(uid);
      const owner = meetingUsers.find((u) => u.userId === userId);
      if (!owner || kind === 'main') return;
      const tile: MeetingUserType = {
        ...owner,
        agUid: uid,
        fullName: `${owner.fullName ?? ''} (${
          kind === 'aux' ? 'camera' : 'thiết bị khác'
        })`,
        enableVideo: uidVideoOff[uid] ? 0 : 1,
        enableAudio: kind === 'aux' ? 0 : 1,
        reaction: undefined,
      };
      others.push(tile);
      if (kind === 'aux' && userId === sharerId) presenterCam = tile;
    });
    const renderTile = (user: MeetingUserType) => {
      const isLocal = user.agUid === selfUid;
      return (
        <VideoView
          key={user.agUid}
          uid={user.agUid ?? 0}
          isLocal={isLocal}
          debug={false}
          enableAudio={user.enableAudio === 1}
          // A presenter's main connection carries their screen, camera
          // on or not.
          // My own tile keeps my camera while I share: previewing the
          // screen being shared mirrored it into itself.
          enableVideo={
            (!isLocal && user.agUid !== undefined &&
            uidVideoOff[user.agUid] !== undefined
              ? !uidVideoOff[user.agUid]
              : user.enableVideo === 1) ||
            (!isLocal && user.agUid === remoteSharingUid)
          }
          // A shared screen shows no name tag: it covered the content.
          hideLabel={!isLocal && user.agUid === remoteSharingUid}
          avatar={user.avatarUrl ?? ''}
          label={user.fullName ?? 'Vision20User'}
          reaction={user.reaction}
          className="video-item"
        />
      );
    };
    // Main tile: a shared screen, else the spotlight, my pin, the last
    // speaker; skipping anyone no longer in the call.
    const heroUid = [
      remoteSharingUid,
      spotlightUid,
      pinnedUid,
      lastSpeakerUid,
    ].find((uid) => uid !== undefined && others.some((u) => u.agUid === uid));
    const tileActions = (user: MeetingUserType): TileMenuAction[] => {
      const actions: TileMenuAction[] = [
        user.agUid === pinnedUid ? 'unpin' : 'pin',
      ];
      // Spotlight names a member: their main connection only.
      if (
        canManageMembers &&
        user.agUid &&
        parseAgUid(user.agUid).kind === 'main'
      ) {
        actions.push(
          user.agUid === spotlightUid ? 'unspotlight' : 'spotlight',
        );
      }
      return actions;
    };
    const onTileAction = (user: MeetingUserType, action: TileMenuAction) => {
      if (action === 'pin') setPinnedUid(user.agUid);
      if (action === 'unpin') setPinnedUid(undefined);
      if (action === 'spotlight') spotlight(user.agUid);
      if (action === 'unspotlight') spotlight(undefined);
    };
    return (
      <MeetingStage
        view={viewMode}
        others={others}
        self={self}
        hideSelf={hideSelf}
        heroUid={heroUid}
        pinnedUid={pinnedUid}
        spotlightUid={spotlightUid}
        tileActions={tileActions}
        onTileAction={onTileAction}
        content={
          whiteboard && (
            <Suspense
              fallback={
                <p className="meeting-stage-hint">Đang mở bảng trắng…</p>
              }
            >
              <Whiteboard
                sync={whiteboardSync}
                ownerName={
                  meetingUsers.find(
                    (u) => u.userId === ownerOfAgUid(whiteboard.owner),
                  )?.fullName ?? ''
                }
                canEdit={!whiteboard.locked || canControlWhiteboard}
                locked={whiteboard.locked}
                canControl={canControlWhiteboard}
                onToggleLock={() => setWhiteboardLocked(!whiteboard.locked)}
                onClose={closeWhiteboard}
              />
            </Suspense>
          )
        }
        activeSpeakerUid={activeSpeakerUid}
        selfSpeaking={selfSpeaking}
        selfSharing={isSharing}
        sharingUid={remoteSharingUid}
        presenterCam={presenterCam}
        onVisibleStreamsChange={setVisibleStreams}
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
    spotlightUid,
    spotlight,
    whiteboard,
    whiteboardSync,
    canControlWhiteboard,
    setWhiteboardLocked,
    closeWhiteboard,
    pinnedUid,
    hideSelf,
    canManageMembers,
    selfSpeaking,
    companion,
    enableMic,
    enableCamera,
    uidVideoOff,
    meetingDetail?.user?.userId,
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
    return (
      <MeetingChat
        sendMessage={sendMessage}
        canSend={permissions.chat}
        online={chatOnline || !isConnected}
      />
    );
  }, [sendMessage, permissions.chat, chatOnline, isConnected]);

  const renderMeetingUsers = useMemo(() => {
    const filterUsers = (condition: (user: MeetingUserType) => boolean) =>
      meetingUsers.filter(condition);

    const activeUsers = filterUsers(
      (user) => user.status === MemberStatus.APPROVED,
    );
    // Really in the room right now: joined per the API *and* connected to
    // the call (remoteUsers never contains our own uid). `isJoin` alone
    // stays 1 when someone drops without leaving properly.
    // Any of their connections counts (a second device, a presenter's
    // camera), and so does mine on this device.
    const isOnline = (user: MeetingUserType) =>
      user.isJoin === 1 &&
      (user.agUid === myUid ||
        user.userId === meetingDetail?.user?.userId ||
        remoteUsers.some((uid) => ownerOfAgUid(uid) === user.userId));
    const online = activeUsers.filter(isOnline);
    const hosts = online.filter((user) => user.role === MeetingRole.HOST);
    const cohosts = online.filter((user) => user.role === MeetingRole.CO_HOST);
    const joinedUsers = online.filter(
      (user) => ![MeetingRole.HOST, MeetingRole.CO_HOST].includes(user.role!),
    );
    // Everyone else who belongs to the meeting, host included when away.
    const notJoinedUsers = activeUsers.filter((user) => !isOnline(user));
    const section = (title: string, users: MeetingUserType[], away = false) =>
      users.length > 0 && (
        <UserSection
          title={title}
          users={users}
          onAction={onAction}
          actionsFor={actionsFor}
          myUid={myUid}
          speakingUid={activeSpeakerUid}
          selfSpeaking={selfSpeaking}
          away={away}
        />
      );

    const copyInviteLink = () => {
      const link = meetingDetail?.room?.joinUrl;
      if (!link) {
        notification.warning({
          message: 'Cuộc họp chưa có link mời',
          placement: 'top',
        });
        return;
      }
      navigator.clipboard
        .writeText(link)
        .then(() =>
          notification.success({
            message: 'Đã sao chép link mời',
            placement: 'top',
          }),
        )
        .catch(() => {});
    };

    const inRoomTab = (
      <div className="meeting-users-list">
        <div className="meeting-users-actions">
          <div className="meeting-users-actions-group">
            {canManageMembers && (
              <button
                type="button"
                className="meeting-users-round primary"
                title="Thêm người"
                onClick={() => setOpenAddMember(true)}
              >
                <Icon name="meetingUserPlus" />
              </button>
            )}
            <button
              type="button"
              className="meeting-users-round"
              title="Sao chép link mời"
              onClick={copyInviteLink}
            >
              <Icon name="meetingLink" />
            </button>
          </div>
          {canManageMembers && (
            <div className="meeting-users-actions-group">
              <RoomPermissions
                settings={roomSettings}
                onChange={updateRoomSettings}
              >
                <button type="button" className="meeting-users-pill">
                  Quyền
                </button>
              </RoomPermissions>
              <button
                type="button"
                className="meeting-users-pill"
                onClick={onMuteAll}
              >
                Mute all
              </button>
            </div>
          )}
        </div>
        {section('HOST', hosts)}
        {section('CO-HOST', cohosts)}
        {section('NGƯỜI THAM DỰ', joinedUsers)}
        {section('ĐÃ THÊM VÀO PHÒNG', notJoinedUsers, true)}
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
        <h3 className="meeting-users-container-title">Người tham dự</h3>
        <div className="meeting-users-container-tabs">
          <Segmented
            block
            options={MEETING_USER_TABS.map((tab) => ({
              ...tab,
              label: `${tab.label} (${
                tab.value === 'pending' ? waitingUsers.length : online.length
              })`,
            }))}
            className="meeting-users-container-segmented"
            value={activeTab}
            onChange={setActiveTab}
          />
        </div>
        <div className="meeting-users-container-body">
          {activeTab === MEETING_USER_TABS[0].value ? inRoomTab : pendingTab}
        </div>
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
    meetingDetail?.room?.joinUrl,
    meetingDetail?.user?.userId,
    activeSpeakerUid,
    selfSpeaking,
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
            <Icon name="meetingTitleCaret" />
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
                  { key: 'large', label: 'Large Gallery (7x7)' },
                  { key: 'focus', label: 'Focus (chỉ nội dung chia sẻ)' },
                  { type: 'divider' },
                  {
                    key: 'self',
                    label: hideSelf ? 'Hiện ô của tôi' : 'Ẩn ô của tôi',
                  },
                ],
                onClick: ({ key }) => {
                  if (key === 'self') toggleHideSelf();
                  else changeViewMode(key as MeetingViewMode);
                },
              }}
            >
              <span>
                <MenuItem icon="viewLayout" name="Bố cục" caret="down" />
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
          {companion && (
            <div className="meeting-companion-banner" role="status">
              <span>
                Bạn đang tham gia thêm trên thiết bị này.
                {!deviceAudio && ' Âm thanh đang tắt để tránh tiếng vọng.'}
              </span>
              <button type="button" onClick={toggleDeviceAudio}>
                {deviceAudio ? 'Tắt âm thanh' : 'Bật âm thanh'}
              </button>
            </div>
          )}
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
                  if (whiteboard) {
                    notification.warning({
                      message:
                        'Đang mở bảng trắng: đóng bảng trước khi chia sẻ màn hình',
                      placement: 'top',
                    });
                    return;
                  }
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
            <MenuItem
              icon="whiteboard"
              name={whiteboard ? 'Đóng bảng trắng' : 'Bảng trắng'}
              locked={!whiteboard && !permissions.share}
              onClick={() => {
                if (whiteboard) {
                  if (canControlWhiteboard) closeWhiteboard();
                  else {
                    notification.info({
                      message:
                        'Chỉ người mở bảng hoặc chủ phòng mới đóng được bảng trắng',
                      placement: 'top',
                    });
                  }
                  return;
                }
                if (!permissions.share) {
                  notification.warning({
                    message: 'Chủ phòng chưa cho phép chia sẻ nội dung',
                    placement: 'top',
                  });
                  return;
                }
                if (isSharing || remoteSharingUid !== undefined) {
                  notification.warning({
                    message: 'Đang có người chia sẻ màn hình',
                    placement: 'top',
                  });
                  return;
                }
                openWhiteboard();
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
                caret="up"
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
            <MenuItem
              icon="chat"
              name={unreadChat > 0 ? `Chat (${unreadChat} tin mới)` : 'Chat'}
              badge={unreadChat}
              onClick={toggleShowChat}
            />
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
                // Slides and code, not motion: keep text sharp over frame rate.
                AgoraEngineService.setScreenCaptureContentHint(
                  VideoContentHint.ContentHintDetails,
                );
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
