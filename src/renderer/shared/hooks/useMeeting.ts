/* eslint-disable @typescript-eslint/no-unused-vars */
import { useAppDispatch, useAppSelector } from '@/renderer/store/hooks';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  addChat,
  remoteUserMutedAudio,
  remoteUserMutedVideo,
  removeMeetingUser,
  resetMeetingState,
  setReaction,
  userReaction
} from '@/renderer/features/Meeting/store/slice';

import {
  debouncedFetchMeetingUsers,
  debouncedUpdateUserConfig,
  fetchAllMeetingData,
  fetchChats,
  startShareScreen,
  stopShareScreen
} from '@/renderer/features/Meeting/store/action';
import {
  selectMeetingDetail,
  selectMeetingUsers,
} from '@/renderer/features/Meeting/store/selector';
import useLoading from '@/renderer/shared/hooks/useLoading';
import MeetingService from '@/shared/services/Meeting/MeetingService';
import {
  createClient,
  RtmChannel,
  RtmMessage,
  RtmTextMessage,
} from 'agora-rtm-react';
import { notification } from 'antd';
import { camelizeKeys, decamelizeKeys } from 'humps';
import {
  ChannelProfileType,
  ClientRoleType,
  ConnectionChangedReasonType,
  ConnectionStateType,
  IRtcEngineEventHandler,
  ScreenCaptureSourceInfo,
  SimulcastStreamMode,
} from 'agora-electron-sdk';
import AgoraEngineService from '../services/Agora/AgoraEngineService';
import { restoreVirtualBackground } from '../utils/virtualBackground';
import { ownerOfAgUid } from '../utils/agoraUid';
import { WhiteboardSync } from '../utils/whiteboardSync';
import {
  AgoraRtmMessage,
  MeetingChat,
  MeetingRole,
  MeetingUser,
  MemberStatus,
  RoomPermissions,
  RoomSettings,
} from '../types/meeting';
import { AGORA_APP_ID } from '../config';

const useClient = createClient(AGORA_APP_ID);

const MEETING_STATUS_ENDED = 3;

/** Volume (0-255) from which a remote user counts as speaking. */
const SPEAKING_VOLUME = 30;
/**
 * Reports in a row (300ms each) someone must be the loudest before the
 * speaker view switches to them: about a second, like Zoom.
 */
const SPEAKER_SWITCH_REPORTS = 3;

export const useMeeting = () => {
  const location = useLocation();
  // `enableMic`/`enableCamera` come from the pre-join lobby.
  const {
    meetingId,
    enableMic: lobbyMic,
    enableCamera: lobbyCamera,
    companion: companionState,
  } = (location.state || {}) as {
    meetingId?: number;
    enableMic?: boolean;
    enableCamera?: boolean;
    /** Joined as this account's second device ("Tham gia trên thiết bị này"). */
    companion?: boolean;
  };
  const companion = !!companionState;
  // Before any detail fetch below: a second device needs its own uid/tokens.
  if (meetingId) MeetingService.setCompanion(Number(meetingId), companion);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const meetingDetail = useAppSelector(selectMeetingDetail);
  const meetingUsers = useAppSelector(selectMeetingUsers);
  const [isConnected, setIsConnected] = useState(false);
  // True while Agora is retrying after the network dropped; the meeting
  // stays on screen and the SDK restores media by itself.
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isError, setIsError] = useState(false);
  // The RTC/RTM handlers below are registered once, so they call through
  // this ref to always reach the latest state.
  const connectionHandler = useRef<
    (source: 'rtc' | 'rtm', state: number | string, reason: number | string) => void
  >(() => {});
  const [enableCamera, setEnableCamera] = useState(true);
  const [enableMic, setEnableMic] = useState(true);
  const [shareScreen, setShareScreen] = useState(false);
  const [sources, setSources] = useState<ScreenCaptureSourceInfo[]>(
    [],
  );
  const [isSharing, setIsSharing] = useState(false);
  // A second device starts with the room's audio off (it sits next to the
  // first one: hearing the meeting twice would echo).
  const [deviceAudio, setDeviceAudio] = useState(!companion);
  // While sharing, the camera stays on through a second connection (its
  // own uid; the screen takes the main one so older apps still see it).
  const auxConnection = useRef<{ channelId: string; localUid: number }>();
  // My own extra uids, never shown or received as someone else.
  const ownAuxUid = useRef<number>();
  // Video muted per uid, for connections that are not a member row (a
  // second device, a presenter's camera).
  const [uidVideoOff, setUidVideoOff] = useState<Record<number, boolean>>({});
  // Meeting chat runs over RTM: whether it is up right now. Messages are
  // saved on the server first, so whatever RTM missed is fetched again
  // once it is back.
  const [chatOnline, setChatOnline] = useState(false);
  const chatDropped = useRef(false);
  const { withLoading } = useLoading();
  const client = useClient();
  const channel = useRef<RtmChannel | null>(null);

  // Filled in below, once the role and room settings are known.
  const permissionsRef = useRef<RoomPermissions>();
  const warnNotAllowed = (what: string) =>
    notification.warning({
      message: `Chủ phòng chưa cho phép bật ${what}`,
      placement: 'top',
    });

  const toggleMic = () => {
    if (!enableMic && permissionsRef.current?.mic === false) {
      warnNotAllowed('micro');
      return;
    }
    setEnableMic(!enableMic);
    if (enableMic) {
      AgoraEngineService.muteLocalAudioStream(true);
    } else {
      AgoraEngineService.muteLocalAudioStream(false);
    }
    // The member row (mute icons others see) belongs to the main device.
    if (companion) return;
    dispatch(
      debouncedUpdateUserConfig({
        meetingId: Number(meetingId),
        request: {
          enable_audio: enableMic ? 0 : 1,
        },
      }),
    );
  };
  const toggleCamera = () => {
    if (!enableCamera && permissionsRef.current?.camera === false) {
      warnNotAllowed('camera');
      return;
    }
    setEnableCamera(!enableCamera);
    if (auxConnection.current) {
      // Sharing: the main connection carries the screen, the camera rides
      // on the second one.
      AgoraEngineService.updateChannelMediaOptionsEx(
        { publishCameraTrack: !enableCamera },
        auxConnection.current,
      );
    } else if (enableCamera) {
      AgoraEngineService.muteLocalVideoStream(true);
    } else {
      AgoraEngineService.muteLocalVideoStream(false);
    }
    if (companion) return;
    dispatch(
      debouncedUpdateUserConfig({
        meetingId: Number(meetingId),
        request: {
          enable_video: enableCamera ? 0 : 1,
        },
      }),
    );
  };

  const stopAuxCamera = useCallback(() => {
    if (!auxConnection.current) return;
    AgoraEngineService.leaveChannelEx(auxConnection.current);
    auxConnection.current = undefined;
  }, []);

  const startSharingScreen = useCallback(() => {
    // The screen track rides on the main connection, so video must be
    // unmuted for it to go out; the camera itself is unpublished instead.
    AgoraEngineService.muteLocalVideoStream(false);
    setShareScreen(true);
    dispatch(startShareScreen(Number(meetingId)));
    // ...and keeps going out on a second connection (API with
    // ag_aux_uid only; older servers: the screen replaces the camera).
    const user = meetingDetail?.user;
    const channelId = meetingDetail?.room?.channelName;
    if (user?.agAuxUid && user.agScreenToken && channelId) {
      const connection = { channelId, localUid: user.agAuxUid };
      AgoraEngineService.joinChannelEx(user.agScreenToken, connection, {
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        publishCameraTrack: enableCamera,
        publishMicrophoneTrack: false,
        publishScreenTrack: false,
        autoSubscribeAudio: false,
        autoSubscribeVideo: false,
      });
      auxConnection.current = connection;
    }
  }, [dispatch, meetingId, meetingDetail, enableCamera]);

  const stopSharingScreen = useCallback(() => {
    stopAuxCamera();
    // Back to camera, keeping whatever mic/camera state the user had.
    AgoraEngineService.updateChannelMediaOptions({
      publishScreenTrack: false,
      publishCameraTrack: true,
      publishMicrophoneTrack: true,
    });
    AgoraEngineService.muteLocalVideoStream(!enableCamera);
    AgoraEngineService.muteLocalAudioStream(!enableMic);
    setShareScreen(false);
    dispatch(stopShareScreen(Number(meetingId)));
  }, [dispatch, meetingId, enableCamera, enableMic, stopAuxCamera]);

  const sendMessage = (message: MeetingChat) => {
    // Only send the message through the channel
    const rtmMessage: AgoraRtmMessage = {
      message_type: 'NEW_CHAT',
      message_sub_type: null,
      message_content: decamelizeKeys(message),
    };

    const rtm = client.createMessage({
      text: JSON.stringify(rtmMessage),
      messageType: 'TEXT',
    });

    channel.current?.sendMessage(rtm);
  };

  const sendReaction = (reaction: string) => {
    const rtmMessage: AgoraRtmMessage = {
      message_type: 'ACTION',
      message_sub_type: 'ROOM_REACTION',
      message_content: reaction,
    };

    const rtm = client.createMessage({
      text: JSON.stringify(rtmMessage),
      messageType: 'TEXT',
    });

    channel.current?.sendMessage(rtm);

    dispatch(userReaction(reaction));
  };

 
  const [remoteUsers, setRemoteUsers] = useState<number[]>([]);
  // Who's talking (remote users only, like mobile): `activeSpeakerUid` while
  // they speak, `lastSpeakerUid` sticks to whoever spoke last so the speaker
  // view doesn't jump back when the room goes quiet. Both only change when
  // the speaker does: volume reports arrive several times a second.
  const [activeSpeakerUid, setActiveSpeakerUid] = useState<number>();
  const [lastSpeakerUid, setLastSpeakerUid] = useState<number>();
  // Who is loudest right now, and for how many reports in a row.
  const speakerStreak = useRef<{ uid?: number; count: number }>({ count: 0 });
  // My own mic level (Agora reports it as uid 0). Still measured while I am
  // muted, so callers combine it with the mic state.
  const [localSpeaking, setLocalSpeaking] = useState(false);
  // The camera-while-sharing connection reports to the same handler; its
  // join/leave/connection events are not the meeting's (leaving it showed
  // "Đang kết nối…" as if the meeting had dropped).
  const fromAux = (connection: any) =>
    connection?.localUid !== undefined &&
    connection.localUid === ownAuxUid.current;
  const eventHandler = useMemo<IRtcEngineEventHandler>(
    () => ({
      onJoinChannelSuccess(connection: any) {
        if (fromAux(connection)) return;
        console.log("🚀 ~ onJoinChannelSuccess ~ connection:", connection)
        setIsConnected(true);
        // Report volumes every 300ms (smoothed) for speaker detection.
        AgoraEngineService.enableAudioVolumeIndication(300, 3, true);
      },

      onAudioVolumeIndication(connection: any, speakers: any[]) {
        if (fromAux(connection)) return;
        const local = (speakers ?? []).find((s) => s.uid === 0);
        if (local) {
          const on = local.volume >= SPEAKING_VOLUME && local.vad !== 0;
          setLocalSpeaking((prev) => (prev === on ? prev : on));
        }
        const remote = (speakers ?? []).filter((s) => s.uid);
        // The local report comes separately (only uid 0): not a verdict on
        // remote speakers.
        if (remote.length === 0 && (speakers ?? []).length > 0) return;
        const loudest = remote
          .filter((s) => s.volume >= SPEAKING_VOLUME)
          .sort((a, b) => b.volume - a.volume)[0];
        const next: number | undefined = loudest?.uid;
        setActiveSpeakerUid((prev) => (prev === next ? prev : next));
        // The speaker view only moves to someone who keeps talking: a cough,
        // a keyboard or an echo on another mic used to grab the stage for a
        // moment and leave it there.
        const streak = speakerStreak.current;
        streak.count =
          next !== undefined && next === streak.uid ? streak.count + 1 : 1;
        streak.uid = next;
        if (next !== undefined && streak.count >= SPEAKER_SWITCH_REPORTS) {
          setLastSpeakerUid((prev) => (prev === next ? prev : next));
        }
      },

      onUserJoined(connection: any, remoteUid: any) {
        if (fromAux(connection)) return;
        console.log("🚀 ~ onUserJoined ~ connection:", connection)
        if (remoteUid === ownAuxUid.current) {
          // My own camera-while-sharing connection: not someone else.
          AgoraEngineService.muteRemoteVideoStream(remoteUid, true);
          AgoraEngineService.muteRemoteAudioStream(remoteUid, true);
          return;
        }
        setRemoteUsers((prevUsers) => {
          // Chỉ thêm remoteUid nếu nó chưa tồn tại trong mảng
          return prevUsers.includes(remoteUid)
            ? prevUsers
            : [...prevUsers, remoteUid];
        });
        dispatch(debouncedFetchMeetingUsers(Number(meetingId)));
      },

      onUserOffline(connection: any, remoteUid: any, reason: any) {
        if (fromAux(connection)) return;
        console.log("🚀 ~ onUserOffline ~ connection:", connection)
        setRemoteUsers((prevUsers) =>
          prevUsers.filter((user) => user !== remoteUid),
        );
        setActiveSpeakerUid((prev) => (prev === remoteUid ? undefined : prev));
        setLastSpeakerUid((prev) => (prev === remoteUid ? undefined : prev));
        dispatch(removeMeetingUser(remoteUid));
      },

      onUserMuteAudio(connection: any, remoteUid: any, muted: any) {
        if (fromAux(connection)) return;
        console.log("🚀 ~ onUserMuteAudio ~ connection:", connection)
        dispatch(remoteUserMutedAudio({ agUid: remoteUid, muted }));
      },
      onUserMuteVideo(connection: any, remoteUid: any, muted: any) {
        if (fromAux(connection)) return;
        console.log("🚀 ~ onUserMuteVideo ~ connection:", connection)
        setUidVideoOff((prev) =>
          prev[remoteUid] === !!muted
            ? prev
            : { ...prev, [remoteUid]: !!muted },
        );
        dispatch(remoteUserMutedVideo({ agUid: remoteUid, muted }));
      },

      onRemoteAudioStats(connection: any, stats: any) {
      console.log("🚀 ~ useMeeting ~ connection:", connection)
      },
      onConnectionStateChanged(connection: any, state: any, reason: any) {
        if (fromAux(connection)) return;
        connectionHandler.current('rtc', state, reason);
      },

      onError(err: any, msg: any) {
        console.log("🚀 ~ onError ~ err:", err, msg)
        setIsError(true);
      },

      onRemoteVideoStateChanged(
        connection: any,
        remoteUid: any,
        state: any,
        _reason: any,
        _elapsed: any,
      ) {
        console.log("🚀 ~ useMeeting ~ connection:", state)
      },
      onLocalVideoStateChanged(source: any, state: any, reason: any) {
        console.log("🚀 ~ onLocalVideoStateChanged ~ source:", source, state, reason);
      },
      onRemoteAudioStateChanged(
        connection: any,
        remoteUid: any,
        state: any,
        _reason: any,
        _elapsed: any,
      ) {
        console.log("🚀 ~ onRemoteAudioStateChanged ~ connection:", connection);
      },
    }),
    [dispatch, meetingId],
  );
  useEffect(() => {
    // Remove all listeners before joining a new channel
    AgoraEngineService.removeAllListeners();

    // Leave any pending channel
    AgoraEngineService.leaveChannel();

    if (meetingId) {
      withLoading(dispatch(fetchAllMeetingData(Number(meetingId))));
    }

    client.on('MessageFromPeer', (state, reason) => {});

    const onRtmConnection = (state: string, reason: string) =>
      connectionHandler.current('rtm', state, reason);
    client.on('ConnectionStateChanged', onRtmConnection);

    client.on('PeersOnlineStatusChanged', (status) => {});

    return () => {
      client.off('ConnectionStateChanged', onRtmConnection);
      AgoraEngineService.removeAllListeners();
      if (auxConnection.current) {
        AgoraEngineService.leaveChannelEx(auxConnection.current);
        auxConnection.current = undefined;
      }
      AgoraEngineService.leaveChannel();
      // The engine is shared (1:1 calls): undo a second device's silence.
      AgoraEngineService.muteAllRemoteAudioStreams(false);
      if (meetingId) MeetingService.setCompanion(Number(meetingId), false);
      client.logout();
      channel?.current?.leave();
      dispatch(resetMeetingState());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Exactly one RTC handler per meeting screen. It used to be registered in
  // the join effect, which runs again whenever meetingDetail changes: the
  // extra copies fired every event twice, and a copy left over from a
  // previous meeting resynced *that* (ended) meeting after a reconnect and
  // kicked the user out of the current one.
  useEffect(() => {
    AgoraEngineService.registerEventHandler(eventHandler);
    return () => {
      AgoraEngineService.unregisterEventHandler(eventHandler);
    };
  }, [eventHandler]);

  // A second device hears the room only when asked to.
  useEffect(() => {
    if (!isConnected) return;
    AgoraEngineService.muteAllRemoteAudioStreams(!deviceAudio);
  }, [isConnected, deviceAudio]);
  const toggleDeviceAudio = useCallback(() => setDeviceAudio((on) => !on), []);

  const goHome = useCallback(() => {
    dispatch(resetMeetingState());
    navigate('/home', { replace: true });
  }, [dispatch, navigate]);

  // The role can change mid-meeting (ROLE_CHANGED). meetingDetail is kept as
  // fetched at join time: refetching it would re-run the join effect.
  const [roleOverride, setRoleOverride] = useState<number>();
  const myRole = roleOverride ?? meetingDetail?.user?.role;
  const isHost = myRole === MeetingRole.HOST;
  const canManageMembers =
    myRole === MeetingRole.HOST || myRole === MeetingRole.CO_HOST;
  // Room settings can change mid-meeting (SETTINGS_CHANGED); same reason as
  // the role for keeping them apart from meetingDetail.
  const [settingsOverride, setSettingsOverride] = useState<RoomSettings>();
  const roomSettings: RoomSettings | undefined =
    settingsOverride ?? meetingDetail?.room;
  // Host/co-host may always; members per room setting (1 = allowed). The
  // defaults match the server's for settings a room doesn't have.
  const memberMay = (value: number | undefined, fallback: number) =>
    canManageMembers || (value ?? fallback) === 1;
  const permissions: RoomPermissions = {
    mic: memberMay(roomSettings?.muteAllAudio, 1),
    camera: memberMay(roomSettings?.muteAllVideo, 0),
    chat: memberMay(roomSettings?.muteAllChat, 1),
    share: memberMay(roomSettings?.multipleShareScreen, 0),
    record: memberMay(roomSettings?.isRecording, 0),
    livestream:
      canManageMembers && (roomSettings?.allowLivestream ?? 1) === 1,
  };
  permissionsRef.current = permissions;
  const canManageLivestream = permissions.livestream;
  // Bumped whenever another participant announces a livestream change.
  const [livestreamSignal, setLivestreamSignal] = useState(0);

  const sendAction = useCallback(
    (subType: string, content: unknown = null) => {
      const rtmMessage: AgoraRtmMessage = {
        message_type: 'ACTION',
        message_sub_type: subType,
        message_content: content,
      };
      channel.current
        ?.sendMessage(
          client.createMessage({
            text: JSON.stringify(rtmMessage),
            messageType: 'TEXT',
          }),
        )
        .catch(() => {});
    },
    [client],
  );

  const sendLivestreamState = useCallback(
    () => sendAction('LIVESTREAM_STATE'),
    [sendAction],
  );

  // agUid of the participant currently sharing their screen (other than me).
  const [remoteSharingUid, setRemoteSharingUid] = useState<number>();

  /** Tells everyone that I started/stopped sharing my screen. */
  const announceScreenShare = useCallback(
    (sharing: boolean) =>
      sendAction('SCREEN_SHARE', {
        ag_uid: meetingDetail?.user?.agUid,
        sharing: sharing ? 1 : 0,
      }),
    [sendAction, meetingDetail?.user?.agUid],
  );

  // Spotlight (Teams): a host/co-host puts one participant (main uid) on
  // everyone's stage. RTM only, nothing on the server: a manager repeats it
  // whenever someone joins so late joiners get it too.
  const [spotlightUid, setSpotlightUid] = useState<number>();
  const spotlight = useCallback(
    (agUid: number | undefined) => {
      setSpotlightUid(agUid);
      sendAction('SPOTLIGHT', { ag_uid: agUid ?? 0 });
    },
    [sendAction],
  );
  useEffect(() => {
    if (!canManageMembers || spotlightUid === undefined) return undefined;
    // After the newcomer's RTM login, which follows their RTC join.
    const timer = setTimeout(
      () => sendAction('SPOTLIGHT', { ag_uid: spotlightUid }),
      3000,
    );
    return () => clearTimeout(timer);
  }, [remoteUsers.length, canManageMembers, spotlightUid, sendAction]);

  // ---- Whiteboard (Excalidraw over RTM, no server; see whiteboardSync).
  // One board at a time, opened by anyone allowed to share; its owner (and
  // hosts/co-hosts) can lock it to view-only or close it.
  const [whiteboard, setWhiteboard] = useState<{
    id: string;
    owner: number;
    locked: boolean;
  }>();
  const sendActionRef = useRef(sendAction);
  sendActionRef.current = sendAction;
  const whiteboardSync = useMemo(
    () =>
      new WhiteboardSync((subType, content) =>
        sendActionRef.current(subType, content),
      ),
    [],
  );
  const announceWhiteboard = useCallback(
    (board?: { id: string; owner: number; locked: boolean }) =>
      sendAction(
        'WHITEBOARD',
        board
          ? {
              open: 1,
              id: board.id,
              owner: board.owner,
              locked: board.locked ? 1 : 0,
            }
          : { open: 0 },
      ),
    [sendAction],
  );
  const myAgUid = meetingDetail?.user?.agUid;
  const ownsWhiteboard = !!whiteboard && whiteboard.owner === myAgUid;
  const canControlWhiteboard = ownsWhiteboard || canManageMembers;
  const openWhiteboard = useCallback(() => {
    if (!myAgUid || whiteboard) return;
    const board = {
      id: `${myAgUid}-${Date.now().toString(36)}`,
      owner: myAgUid,
      locked: false,
    };
    whiteboardSync.open(board.id);
    setWhiteboard(board);
    announceWhiteboard(board);
  }, [myAgUid, whiteboard, whiteboardSync, announceWhiteboard]);
  const closeWhiteboard = useCallback(() => {
    if (!whiteboard || !canControlWhiteboard) return;
    whiteboardSync.close();
    setWhiteboard(undefined);
    announceWhiteboard(undefined);
  }, [whiteboard, canControlWhiteboard, whiteboardSync, announceWhiteboard]);
  const setWhiteboardLocked = useCallback(
    (locked: boolean) => {
      if (!whiteboard || !canControlWhiteboard) return;
      const board = { ...whiteboard, locked };
      setWhiteboard(board);
      announceWhiteboard(board);
    },
    [whiteboard, canControlWhiteboard, announceWhiteboard],
  );
  // RTM only: the owner repeats the board for late joiners (or, once the
  // owner has left, the hosts do).
  const ownerPresent = !!whiteboard && remoteUsers.includes(whiteboard.owner);
  const repeatsWhiteboard =
    ownsWhiteboard || (!!whiteboard && !ownerPresent && canManageMembers);
  useEffect(() => {
    if (!whiteboard || !repeatsWhiteboard) return undefined;
    const timer = setTimeout(() => announceWhiteboard(whiteboard), 3000);
    return () => clearTimeout(timer);
  }, [remoteUsers.length, whiteboard, repeatsWhiteboard, announceWhiteboard]);

  // Back from an RTM drop: catch up on what was drawn meanwhile.
  const whiteboardOpen = !!whiteboard;
  useEffect(() => {
    if (chatOnline && whiteboardOpen) whiteboardSync.requestAll();
  }, [chatOnline, whiteboardOpen, whiteboardSync]);

  // Whiteboard messages; reassigned every render (the RTM handler is not).
  const handleWhiteboardMessage = useRef<
    (subType: string, content: any, senderUid: number) => void
  >(() => {});
  handleWhiteboardMessage.current = (subType, content, senderUid) => {
    if (senderUid === myAgUid) return;
    if (subType === 'WB_ELEMENTS') {
      whiteboardSync.remote(String(content?.id), content?.els);
      return;
    }
    if (subType === 'WB_SYNC') {
      if (whiteboard && content?.id === whiteboard.id && repeatsWhiteboard) {
        whiteboardSync.sendAll();
      }
      return;
    }
    // WHITEBOARD: opened/updated by its owner, or by a host/co-host.
    const sender = meetingUsers.find(
      (u) => u.userId === ownerOfAgUid(senderUid),
    );
    const fromManager =
      sender?.role === MeetingRole.HOST || sender?.role === MeetingRole.CO_HOST;
    if (!content?.open) {
      if (!whiteboard) return;
      if (!fromManager && senderUid !== whiteboard.owner) return;
      whiteboardSync.close();
      setWhiteboard(undefined);
      return;
    }
    const board = {
      id: String(content.id),
      owner: Number(content.owner),
      locked: !!content.locked,
    };
    if (!fromManager && senderUid !== board.owner) return;
    if (whiteboard?.id !== board.id) {
      whiteboardSync.open(board.id);
      if (!whiteboard) {
        notification.info({
          message: `${sender?.fullName ?? 'Một người tham dự'} đã mở bảng trắng`,
          placement: 'top',
          duration: 3,
        });
      }
      // Whatever was drawn before I arrived.
      setTimeout(() => whiteboardSync.requestAll(), 300);
    }
    setWhiteboard(board);
  };

  const refreshUsers = useCallback(() => {
    dispatch(debouncedFetchMeetingUsers(Number(meetingId)));
  }, [dispatch, meetingId]);

  // ---- Host/co-host actions.
  // Muting is RTM only: the target checks that the sender is a host/co-host,
  // mutes itself and saves its own mic/camera state; Agora's mute event then
  // updates everyone's icons. Kick/ban/roles go through the server first.
  const muteMember = useCallback(
    async (user: MeetingUser, media: 'audio' | 'video') => {
      sendAction('MUTE_USER', {
        ag_uid: user.agUid,
        audio: media === 'audio' ? 1 : 0,
        video: media === 'video' ? 1 : 0,
      });
    },
    [sendAction],
  );

  const muteAllMembers = useCallback(async () => {
    sendAction('MUTE_ALL', { audio: 1, video: 0 });
  }, [sendAction]);

  const kickMember = useCallback(
    async (user: MeetingUser, ban: boolean) => {
      await MeetingService.kickUser(Number(meetingId), user.userId ?? 0, ban);
      sendAction('KICK_USER', { ag_uid: user.agUid, banned: ban ? 1 : 0 });
      refreshUsers();
    },
    [meetingId, sendAction, refreshUsers],
  );

  const changeMemberRole = useCallback(
    async (user: MeetingUser, role: number) => {
      await MeetingService.setMemberRole(
        Number(meetingId),
        user.userId ?? 0,
        role,
      );
      sendAction('ROLE_CHANGED', { ag_uid: user.agUid, role });
      refreshUsers();
    },
    [meetingId, sendAction, refreshUsers],
  );

  /** Waiting room decision; the waiting app polls and enters by itself. */
  const reviewWaitingMember = useCallback(
    async (user: MeetingUser, approve: boolean) => {
      await MeetingService.reviewWaitingMember(
        Number(meetingId),
        user.userId ?? 0,
        approve ? MemberStatus.APPROVED : MemberStatus.REJECTED,
      );
      sendAction('MEMBERS_CHANGED');
      refreshUsers();
    },
    [meetingId, sendAction, refreshUsers],
  );

  // Waiting room on: hosts/co-hosts poll the member list so new requests
  // show up (the waiting person isn't in the RTM channel to announce it).
  const waitingRoomOn = meetingDetail?.room?.waitingRoom === 1;
  useEffect(() => {
    if (!waitingRoomOn || !canManageMembers || !meetingId) return undefined;
    const timer = setInterval(refreshUsers, 5000);
    return () => clearInterval(timer);
  }, [waitingRoomOn, canManageMembers, meetingId, refreshUsers]);

  const addMember = useCallback(
    async (userId: number, role: number = MeetingRole.MEMBER) => {
      await MeetingService.setMemberRole(Number(meetingId), userId, role);
      sendAction('MEMBERS_CHANGED');
      refreshUsers();
    },
    [meetingId, sendAction, refreshUsers],
  );

  // ---- Room permissions (host/co-host).
  const pickSettings = (room?: RoomSettings): RoomSettings => ({
    muteAllAudio: room?.muteAllAudio,
    muteAllVideo: room?.muteAllVideo,
    muteAllChat: room?.muteAllChat,
    isRecording: room?.isRecording,
    multipleShareScreen: room?.multipleShareScreen,
    allowLivestream: room?.allowLivestream,
  });
  const updateRoomSettings = useCallback(
    async (change: RoomSettings) => {
      const result = await MeetingService.updateRoomSettings(
        Number(meetingId),
        change,
      );
      setSettingsOverride(pickSettings(result.setting));
      sendAction('SETTINGS_CHANGED');
    },
    [meetingId, sendAction],
  );
  const reloadRoomSettings = useCallback(() => {
    MeetingService.fetchMeetingDetail(Number(meetingId))
      .then((meeting) => setSettingsOverride(pickSettings(meeting?.room)))
      .catch(() => {});
  }, [meetingId]);

  // Lost a permission while in the meeting: turn it off (and say why).
  // Only a change from allowed to not allowed counts — at join time the
  // lobby choice is already filtered by the permissions.
  const previousPermissions = useRef(permissions);
  useEffect(() => {
    const before = previousPermissions.current;
    previousPermissions.current = permissions;
    // Not in a meeting (or it is being torn down: its data is cleared before
    // the screen goes) — nothing changed for real.
    if (!isConnected || myRole === undefined || !meetingDetail?.room) return;
    // Tell members what changed (host/co-host set it themselves).
    if (!canManageMembers) {
      const labels: [keyof RoomPermissions, string][] = [
        ['mic', 'bật micro'],
        ['camera', 'bật camera'],
        ['chat', 'chat'],
        ['share', 'chia sẻ màn hình'],
        ['record', 'ghi cuộc họp'],
      ];
      const gained = labels.filter(([k]) => !before[k] && permissions[k]);
      const lost = labels.filter(([k]) => before[k] && !permissions[k]);
      if (gained.length > 0) {
        notification.info({
          message: `Chủ phòng đã cho phép ${gained.map(([, l]) => l).join(', ')}`,
          placement: 'top',
        });
      }
      if (lost.length > 0) {
        notification.warning({
          message: `Chủ phòng đã tắt quyền ${lost.map(([, l]) => l).join(', ')}`,
          placement: 'top',
        });
      }
    }
    const lostMic = before.mic && !permissions.mic && enableMic;
    const lostCamera = before.camera && !permissions.camera && enableCamera;
    if (!lostMic && !lostCamera) return;
    if (lostMic) {
      AgoraEngineService.muteLocalAudioStream(true);
      setEnableMic(false);
    }
    if (lostCamera) {
      AgoraEngineService.muteLocalVideoStream(true);
      setEnableCamera(false);
    }
    dispatch(
      debouncedUpdateUserConfig({
        meetingId: Number(meetingId),
        request: {
          ...(lostMic ? { enable_audio: 0 } : {}),
          ...(lostCamera ? { enable_video: 0 } : {}),
        },
      }),
    );
    // Only react to permission changes, not to my own toggles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    permissions.mic,
    permissions.camera,
    permissions.chat,
    permissions.share,
    permissions.record,
  ]);

  // ---- Incoming host commands. RTM is client-to-client, so only obey a
  // command whose sender is a host/co-host in the server's member list.
  const handleHostCommand = useRef<
    (subType: string, content: any, senderUid: number) => void
  >(() => {});
  handleHostCommand.current = (subType, content, senderUid) => {
    const myUid = meetingDetail?.user?.agUid;
    // A sender may be someone's second device: look them up by user.
    const sender = meetingUsers.find(
      (u) => u.userId === ownerOfAgUid(senderUid),
    );
    if (subType === 'END_MEETING') {
      const ended = () => {
        notification.info({ message: 'Cuộc họp đã kết thúc', placement: 'top' });
        goHome();
      };
      if (sender?.role === MeetingRole.HOST) {
        ended();
        return;
      }
      // Sender not known as the host (stale list or a forged message):
      // trust the server instead.
      MeetingService.fetchMeetingDetail(Number(meetingId))
        .then((meeting) => {
          if (meeting?.room?.status === MEETING_STATUS_ENDED) ended();
          return meeting;
        })
        .catch(() => {});
      return;
    }
    if (subType === 'SCREEN_SHARE') {
      // Anyone may announce their own share; ignore claims about others.
      if (Number(content?.ag_uid) !== senderUid || senderUid === myUid) return;
      const sharing = !!content?.sharing;
      setRemoteSharingUid((current) =>
        sharing ? senderUid : current === senderUid ? undefined : current,
      );
      notification.info({
        message: `${sender?.fullName ?? 'Một người tham dự'} ${
          sharing ? 'đang chia sẻ màn hình' : 'đã dừng chia sẻ màn hình'
        }`,
        placement: 'top',
        duration: 3,
      });
      return;
    }
    const fromManager =
      sender?.role === MeetingRole.HOST || sender?.role === MeetingRole.CO_HOST;
    if (subType === 'SPOTLIGHT') {
      if (!fromManager || senderUid === myUid) return;
      const uid = Number(content?.ag_uid) || undefined;
      if (uid === spotlightUid) return;
      setSpotlightUid(uid);
      const target = meetingUsers.find((u) => u.agUid === uid);
      let message = `${sender?.fullName ?? 'Chủ phòng'} đã tắt spotlight`;
      if (uid === myUid) message = 'Bạn đang được spotlight cho mọi người';
      else if (uid)
        message = `Spotlight: ${target?.fullName ?? 'một người tham dự'}`;
      notification.info({ message, placement: 'top', duration: 3 });
      return;
    }
    refreshUsers();
    if (!fromManager || senderUid === myUid) return;

    // Commands name the member's main uid; my second device obeys too.
    const targetsMe =
      !!content?.ag_uid &&
      ownerOfAgUid(Number(content.ag_uid)) === meetingDetail?.user?.userId;
    const muteMe = (audio: boolean, video: boolean) => {
      if (audio) {
        AgoraEngineService.muteLocalAudioStream(true);
        setEnableMic(false);
      }
      if (video) {
        AgoraEngineService.muteLocalVideoStream(true);
        setEnableCamera(false);
      }
      // Save my new state so late joiners see the right icons (the main
      // device owns the member row).
      if (!companion) {
        dispatch(
          debouncedUpdateUserConfig({
            meetingId: Number(meetingId),
            request: {
              ...(audio ? { enable_audio: 0 } : {}),
              ...(video ? { enable_video: 0 } : {}),
            },
          }),
        );
      }
      const what = [audio && 'micro', video && 'camera']
        .filter(Boolean)
        .join(' và ');
      notification.warning({
        message: `${sender?.fullName ?? 'Chủ phòng'} đã tắt ${what} của bạn`,
        description: 'Bạn có thể tự bật lại khi cần nói.',
        placement: 'top',
      });
    };

    switch (subType) {
      case 'MUTE_USER':
        if (targetsMe) muteMe(!!content?.audio, !!content?.video);
        break;
      case 'MUTE_ALL':
        if (myRole === MeetingRole.MEMBER) {
          muteMe(!!content?.audio, !!content?.video);
        }
        break;
      case 'KICK_USER':
        if (targetsMe) {
          notification.error({
            message: content?.banned
              ? 'Bạn đã bị cấm tham gia cuộc họp này'
              : 'Bạn đã được mời ra khỏi cuộc họp',
            placement: 'top',
          });
          goHome();
        }
        break;
      case 'SETTINGS_CHANGED':
        reloadRoomSettings();
        break;
      case 'ROLE_CHANGED':
        if (targetsMe) {
          setRoleOverride(Number(content?.role));
          notification.info({
            message:
              Number(content?.role) === MeetingRole.CO_HOST
                ? 'Bạn đã được trao quyền Co-host'
                : 'Quyền Co-host của bạn đã được thu hồi',
            placement: 'top',
          });
        }
        break;
      default:
        break;
    }
  };

  const leaveMeeting = useCallback(async () => {
    try {
      // `exit` deletes the member row server-side; for the host that would
      // drop the host role on rejoin, so the host only leaves locally.
      // A second device leaves alone: the member stays on the first.
      if (!isHost && !companion) {
        await MeetingService.leaveMeeting(Number(meetingId));
      }
    } finally {
      goHome();
    }
  }, [meetingId, isHost, companion, goHome]);

  const endMeeting = useCallback(async () => {
    try {
      await MeetingService.endMeeting(Number(meetingId));
    } catch (_) {
      // Already ended, or the request failed: still tell everyone below.
    }
    try {
      const rtmMessage: AgoraRtmMessage = {
        message_type: 'ACTION',
        message_sub_type: 'END_MEETING',
        message_content: null,
      };
      await channel.current?.sendMessage(
        client.createMessage({
          text: JSON.stringify(rtmMessage),
          messageType: 'TEXT',
        }),
      );
    } catch (_) {
      // The host must still be able to leave.
    } finally {
      goHome();
    }
  }, [meetingId, client, goHome]);


  // ---- Connection loss. Agora reconnects RTC and RTM on its own; the app
  // shows that it is retrying, resyncs once back, and only leaves the room
  // when reconnecting is impossible.
  const leaveWithMessage = useCallback(
    (message: string) => {
      notification.error({ message, placement: 'top' });
      goHome();
    },
    [goHome],
  );

  const resyncAfterReconnect = useCallback(() => {
    refreshUsers();
    // Things may have happened while we were offline: the host ended the
    // meeting (its END_MEETING message is lost) or removed us.
    MeetingService.fetchMeetingDetail(Number(meetingId))
      .then((meeting) => {
        if (meeting?.room?.status === MEETING_STATUS_ENDED) {
          leaveWithMessage('Cuộc họp đã kết thúc');
        }
        return meeting;
      })
      .catch((error) => {
        const status = (() => {
          try {
            return JSON.parse(error)?.response?.status;
          } catch (_) {
            return undefined;
          }
        })();
        if (status === 400 || status === 403 || status === 404) {
          leaveWithMessage('Bạn không còn ở trong cuộc họp này');
        }
      });
  }, [meetingId, refreshUsers, leaveWithMessage]);

  const wasReconnecting = useRef(false);
  function chatDown() {
    chatDropped.current = true;
    setChatOnline(false);
  }

  /** Chat is up (again): pick up what RTM missed meanwhile. */
  function chatBack() {
    setChatOnline(true);
    if (chatDropped.current && meetingId) {
      chatDropped.current = false;
      dispatch(fetchChats(Number(meetingId)));
    }
  }

  // Log in and join the chat channel again, retrying until it works.
  const chatRetry = useRef<ReturnType<typeof setTimeout>>();
  function rejoinChat() {
    clearTimeout(chatRetry.current);
    client
      .login({
        uid: meetingDetail?.user?.agUid?.toString() || '',
        token: meetingDetail?.user?.agRtmToken || '',
      })
      .catch(() => {
        // Already logged in: just (re)join the channel.
      })
      .then(() => channel.current?.join())
      .then(() => chatBack())
      .catch(() => {
        chatDown();
        chatRetry.current = setTimeout(() => rejoinChat(), 5000);
      });
  }
  useEffect(() => () => clearTimeout(chatRetry.current), []);

  connectionHandler.current = (source, state, reason) => {
    if (source === 'rtc') {
      switch (state) {
        case ConnectionStateType.ConnectionStateConnected:
          setIsConnected(true);
          setIsReconnecting(false);
          if (wasReconnecting.current) {
            wasReconnecting.current = false;
            resyncAfterReconnect();
          }
          break;
        case ConnectionStateType.ConnectionStateReconnecting:
          wasReconnecting.current = true;
          setIsReconnecting(true);
          break;
        case ConnectionStateType.ConnectionStateFailed:
          setIsReconnecting(false);
          switch (reason) {
            case ConnectionChangedReasonType.ConnectionChangedSameUidLogin:
              // Same uid in this very channel: the meeting moved there.
              leaveWithMessage('Cuộc họp đã được chuyển sang thiết bị khác');
              break;
            case ConnectionChangedReasonType.ConnectionChangedBannedByServer:
            case ConnectionChangedReasonType.ConnectionChangedRejectedByServer:
              leaveWithMessage('Bạn đã bị mời ra khỏi cuộc họp');
              break;
            case ConnectionChangedReasonType.ConnectionChangedInvalidToken:
            case ConnectionChangedReasonType.ConnectionChangedTokenExpired:
              leaveWithMessage('Phiên họp đã hết hạn, vui lòng vào lại');
              break;
            default:
              leaveWithMessage('Không thể kết nối lại cuộc họp');
          }
          break;
        case ConnectionStateType.ConnectionStateDisconnected:
          setIsConnected(false);
          break;
        default:
          break;
      }
      return;
    }
    // RTM (chat, reactions, host commands, END_MEETING).
    if (state === 'CONNECTED') {
      // The SDK reconnected (and rejoins its channels) by itself.
      if (channel.current) chatBack();
      return;
    }
    if (state === 'RECONNECTING') {
      // The SDK retries by itself.
      chatDown();
      return;
    }
    if (state !== 'ABORTED' && state !== 'DISCONNECTED') return;
    if (reason === 'REMOTE_LOGIN') {
      // RTM logins are per account, not per meeting: this account joined a
      // meeting on another device — this one (a transfer) or another.
      leaveWithMessage(
        'Tài khoản của bạn vừa tham gia cuộc họp trên thiết bị khác',
      );
      return;
    }
    // Anything else leaves chat silently dead: log in and join again (the
    // handler is detached before our own logout when leaving).
    chatDown();
    rejoinChat();
  };

  // Safety net: RTM can also drop single messages while "connected".
  useEffect(() => {
    if (!isConnected || !meetingId) return undefined;
    const timer = setInterval(
      () => dispatch(fetchChats(Number(meetingId))),
      20000,
    );
    return () => clearInterval(timer);
  }, [isConnected, meetingId, dispatch]);

  useEffect(() => {
    if (!meetingDetail) {
      return;
    }
    client
      .login({
        uid: meetingDetail?.user?.agUid?.toString() || '',
        token: meetingDetail?.user?.agRtmToken || '',
      })
      .then(() => {
        const newChannel = client.createChannel(
          meetingDetail?.room?.channelName || '',
        );
        channel.current = newChannel;
        newChannel.on('ChannelMessage', (message: RtmMessage, memberId: string) => {
          const data = message as RtmTextMessage;
          if (data) {
            let rtmMessage: AgoraRtmMessage;
            try {
              rtmMessage = JSON.parse(data.text);
            } catch (_) {
              return;
            }
            if (rtmMessage.message_type === 'NEW_CHAT') {
              const chat: MeetingChat = camelizeKeys(
                rtmMessage.message_content ?? {},
              );
              // Only real chat rows, posted by the sender itself (uids are
              // 700000 + user id): no blank bubbles, no speaking for others.
              if (
                chat.id &&
                Number(memberId) === 700000 + Number(chat.userId)
              ) {
                dispatch(addChat(chat));
              }
            } else if (rtmMessage.message_type === 'ACTION') {
              switch (rtmMessage.message_sub_type) {
                case 'LIVESTREAM_STATE':
                  // Host started/stopped a livestream: refresh the LIVE badge.
                  setLivestreamSignal((value) => value + 1);
                  break;

                case 'END_MEETING':
                case 'SCREEN_SHARE':
                case 'MUTE_USER':
                case 'MUTE_ALL':
                case 'KICK_USER':
                case 'ROLE_CHANGED':
                case 'MEMBERS_CHANGED':
                case 'SETTINGS_CHANGED':
                case 'SPOTLIGHT':
                  handleHostCommand.current(
                    rtmMessage.message_sub_type,
                    rtmMessage.message_content,
                    Number(memberId),
                  );
                  break;

                case 'WHITEBOARD':
                case 'WB_ELEMENTS':
                case 'WB_SYNC':
                  handleWhiteboardMessage.current(
                    rtmMessage.message_sub_type,
                    rtmMessage.message_content,
                    Number(memberId),
                  );
                  break;

                case 'ROOM_REACTION':
                  dispatch(setReaction({ agUid: Number(memberId), reaction: rtmMessage.message_content }));
                  break;

                default:
                  break;
              }
            }
          }
        });
        return channel.current?.join();
      })
      .then(() => setChatOnline(true))
      .catch(() => {
        // Used to fail silently: chat stayed dead for the whole meeting.
        chatDown();
        rejoinChat();
      });

    // Camera: 960x540@15 is plenty for a meeting tile and keeps uploads
    // modest. The low simulcast stream (320x180) is only produced while
    // someone asks for it (small gallery tiles), see
    // useRemoteVideoSubscriptions.
    AgoraEngineService.setVideoEncoderConfiguration({
      dimensions: { width: 960, height: 540 },
      frameRate: 15,
      bitrate: 0,
    });
    AgoraEngineService.setDualStreamMode(
      SimulcastStreamMode.AutoSimulcastStream,
      { dimensions: { width: 320, height: 180 }, kBitrate: 200, framerate: 15 },
    );
    const result = AgoraEngineService.joinChannel(
      meetingDetail?.user?.agRtcToken || '',
      meetingDetail?.room?.channelName || '',
      meetingDetail?.user?.agUid || 0,
      {
        // Set the channel scene to live broadcast scene
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
        // Set the user role to anchor; if you want to set the user role to audience, keep the default value
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        // Publish the audio collected by the microphone
        publishMicrophoneTrack: true,
        // Publish the video captured by the camera
        publishCameraTrack: true,
        // Automatically subscribe to all audio streams
        autoSubscribeAudio: true,
        // Automatically subscribe to all video streams
        autoSubscribeVideo: true,
      },
    );

    AgoraEngineService.enableVideo();
    AgoraEngineService.enableAudio();
    AgoraEngineService.updateChannelMediaOptions({
      publishCameraTrack: true,
    });

    // Enable local video preview
    AgoraEngineService.startPreview();
    // The background chosen earlier on this device (lobby or a past meeting).
    restoreVirtualBackground();

    if (result === 0) {
      ownAuxUid.current = meetingDetail?.user?.agAuxUid;
      // The lobby choice, unless the room doesn't let me turn it on.
      const enableAudio =
        (lobbyMic ?? meetingDetail?.user?.enableAudio === 1) &&
        permissionsRef.current?.mic !== false;
      const enableVideo =
        (lobbyCamera ?? meetingDetail?.user?.enableVideo === 1) &&
        permissionsRef.current?.camera !== false;
      setEnableMic(enableAudio);
      setEnableCamera(enableVideo);

      if (enableAudio) {
        AgoraEngineService.muteLocalAudioStream(false);
      } else {
        AgoraEngineService.muteLocalAudioStream(true);
      }

      if (enableVideo) {
        AgoraEngineService.muteLocalVideoStream(false);
      } else {
        AgoraEngineService.muteLocalVideoStream(true);
      }
    } else {
      setIsError(true);
    }
  }, [meetingDetail, client, eventHandler, dispatch, goHome]);

  return {
    // states
    isConnected,
    isReconnecting,
    isError,
    enableCamera,
    enableMic,
    sources,
    isSharing,
    // setters
    setIsConnected,
    setIsError,
    setEnableCamera,
    setEnableMic,
    setSources,
    setIsSharing,
    toggleMic,
    toggleCamera,
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
    startSharingScreen,
    stopSharingScreen,
    sendMessage,
    sendReaction,
    meetingUsers,
    meetingDetail,
    meetingId,
    remoteUsers,
  };
};
