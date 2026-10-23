import AgoraEngineService from '@/shared/services/Agora/AgoraEngineService';
import { useAppSelector } from '@/renderer/store/hooks';
import { selectAuth } from '@/renderer/shared/store/auth/selector';
import {
  ChannelProfileType,
  ClientRoleType,
  ConnectionStateType,
  IRtcEngineEventHandler,
  UserOfflineReasonType,
} from 'agora-electron-sdk';
import { notification } from 'antd';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import CallService, { parseCallError } from '../services/Call/CallService';
import { CallEvents } from '../services/Call/CallEvents';
import { API_BASE_URL } from '../config';
import {
  Call,
  CallEventName,
  CallMedia,
  CallStatus,
  CallType,
  CallWithMedia,
  isTerminalCall,
} from '../types/call';
import { CallOutcome, directId, sendMessage } from '../services/Firebase/chat';
import { osNotify } from '../utils/osNotify';
import { useSocial } from './SocialProvider';

export type { CallType } from '../types/call';

export interface CallPeer {
  backendId: number;
  name?: string;
  avatar?: string;
}

type Phase =
  | 'idle'
  | 'placing'
  | 'outgoing'
  | 'incoming'
  | 'connected'
  /** My outgoing call wasn't answered: "Gọi lại" / "Huỷ". */
  | 'ended';

/** Free for a new call (an 'ended' screen is just waiting to be closed). */
const isFree = (phase: Phase) => phase === 'idle' || phase === 'ended';

/** What the overlay reads about the call (`callType` kept for the UI). */
export type CallInfo = Call & { callType: CallType };

interface CallUiState {
  phase: Phase;
  call?: CallInfo;
  peer?: CallPeer;
  isCaller: boolean;
  /** Local ms timestamp of the answer (server time, clock-corrected). */
  acceptedAt?: number;
  remoteUid?: number;
  micOn: boolean;
  cameraOn: boolean;
  /** Our network dropped; Agora is reconnecting. */
  reconnecting: boolean;
  /** The other side's connection dropped. */
  peerLost: boolean;
  /** Why the 'ended' screen is up ("Người nhận từ chối cuộc gọi"…). */
  endMessage?: string;
}

interface CallApi extends CallUiState {
  startCall: (peer: CallPeer, type: CallType) => Promise<void>;
  accept: () => Promise<void>;
  decline: () => Promise<void>;
  hangUp: () => Promise<void>;
  toggleMic: () => void;
  toggleCamera: () => void;
  /** Closes the 'ended' screen. */
  dismiss: () => void;
}

const IDLE: CallUiState = {
  phase: 'idle',
  isCaller: false,
  micOn: true,
  cameraOn: true,
  reconnecting: false,
  peerLost: false,
};

const CallContext = createContext<CallApi>({
  ...IDLE,
  startCall: async () => {},
  accept: async () => {},
  decline: async () => {},
  hangUp: async () => {},
  toggleMic: () => {},
  toggleCamera: () => {},
  dismiss: () => {},
});

export const useCall = () => useContext(CallContext);

const endText = (call: Call, isCaller: boolean) => {
  switch (call.status) {
    case 'rejected':
      return call.endReason === 'busy'
        ? 'Người nhận đang bận'
        : 'Người nhận từ chối cuộc gọi';
    case 'missed':
      // The callee gets the "Cuộc gọi nhỡ" notification from call:missed.
      return isCaller ? 'Không thể nhận cuộc gọi' : undefined;
    case 'cancelled':
      return isCaller ? undefined : 'Cuộc gọi đã huỷ';
    default:
      return 'Cuộc gọi đã kết thúc';
  }
};

const withType = (call: Call): CallInfo => ({ ...call, callType: call.type });

type EndKind = 'end' | 'cancel' | 'reject';

const sendEndIntent = (id: string, kind: EndKind, reason?: string) => {
  if (kind === 'cancel') return CallService.cancel(id);
  if (kind === 'reject') return CallService.reject(id, reason);
  return CallService.end(id, reason);
};

/**
 * 1:1 audio/video calls on the desktop. The Vision API owns each call (it
 * is the only writer of its status, times the ring out and closes the media
 * room): this provider sends intents over HTTP and renders the state that
 * comes back, or arrives on the `/call/events` stream. Media is Agora.
 *
 * The caller joins Agora as soon as the call is placed (so audio flows the
 * moment the callee answers); the callee joins once its accept wins.
 */
export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useAppSelector(selectAuth);
  const myId = user?.id;
  const { me } = useSocial();
  const meRef = useRef(me);
  meRef.current = me;
  const location = useLocation();
  const [ui, setUi] = useState<CallUiState>(IDLE);
  const uiRef = useRef(ui);
  uiRef.current = ui;

  /** System notification of the call ringing now (closed once answered). */
  const incomingNoticeRef = useRef<Notification>();
  // Answered, declined or gone: drop the "đang gọi" system notification.
  useEffect(() => {
    if (ui.phase !== 'incoming') {
      incomingNoticeRef.current?.close();
      incomingNoticeRef.current = undefined;
    }
  }, [ui.phase]);
  const inMeetingRef = useRef(false);
  inMeetingRef.current = location.pathname.startsWith('/meeting');

  const peerLostTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const handlerRef = useRef<IRtcEngineEventHandler>();
  /** Call id currently joined on Agora. */
  const joinedRef = useRef<string>();
  /** Calls already closed on this device (late events are ignored). */
  const finishedRef = useRef<Set<string>>(new Set());
  /** Missed-call notifications already shown. */
  const missedShownRef = useRef<Set<string>>(new Set());
  /** An accept is in flight; its answer, not the event, moves us on. */
  const acceptingRef = useRef(false);
  /** Hung up while POST /call was in flight. */
  const abortPlacingRef = useRef(false);
  /** Call this device hung up itself (no "ended" toast for it). */
  const selfEndedRef = useRef<string>();
  /** A hang-up the server never got (offline); retried on resync. */
  const pendingEndRef = useRef<{ id: string; kind: EndKind }>();
  /** server ms − local ms. */
  const clockSkewRef = useRef(0);

  const localMs = useCallback(
    (serverSec: number) => serverSec * 1000 - clockSkewRef.current,
    [],
  );
  const noteServerTime = useCallback((call: Call) => {
    if (call.serverTime) {
      clockSkewRef.current = call.serverTime * 1000 - Date.now();
    }
  }, []);

  // ---- Agora ------------------------------------------------------------
  const leaveAgora = useCallback(() => {
    joinedRef.current = undefined;
    if (handlerRef.current) {
      AgoraEngineService.unregisterEventHandler(handlerRef.current);
      handlerRef.current = undefined;
    }
    try {
      AgoraEngineService.leaveChannel();
      AgoraEngineService.stopPreview();
      AgoraEngineService.muteLocalAudioStream(false);
      AgoraEngineService.muteLocalVideoStream(false);
    } catch (_) {
      // Engine already idle.
    }
  }, []);

  /** The caller writes the chat-history entry (Firestore), when signed in. */
  const logToChat = useCallback((call: Call) => {
    const social = meRef.current;
    if (!social || call.caller.id !== social.backendId) return;
    let outcome: CallOutcome = 'cancelled';
    if (call.acceptedAt) outcome = 'completed';
    else if (call.status === 'missed') outcome = 'missed';
    else if (call.status === 'rejected') outcome = 'rejected';
    const duration =
      call.acceptedAt && call.endedAt ? call.endedAt - call.acceptedAt : 0;
    sendMessage(
      directId(call.caller.id, call.callee.id),
      social,
      [call.callee.id],
      {
        type: 'call',
        callKind: call.type,
        callOutcome: outcome,
        ...(call.acceptedAt ? { callDurationSec: Math.max(0, duration) } : {}),
      },
    ).catch(() => {});
  }, []);

  // ---- End of a call: the server said it's over -------------------------
  const finish = useCallback(
    (call: Call, message?: string | null) => {
      if (finishedRef.current.has(call.id)) return;
      finishedRef.current.add(call.id);
      if (uiRef.current.call?.id !== call.id) return;
      const { isCaller, phase, peer } = uiRef.current;
      clearTimeout(peerLostTimerRef.current);
      acceptingRef.current = false;
      leaveAgora();
      const selfEnded = selfEndedRef.current === call.id;
      const text =
        message === undefined && !selfEnded ? endText(call, isCaller) : message;
      // Not answered (declined, busy, nobody picked up): offer "Gọi lại",
      // like mobile.
      const unanswered =
        isCaller &&
        !selfEnded &&
        phase === 'outgoing' &&
        (call.status === 'rejected' || call.status === 'missed');
      if (unanswered && text) {
        setUi({
          ...IDLE,
          phase: 'ended',
          call: withType(call),
          peer,
          isCaller: true,
          endMessage: text,
        });
      } else {
        setUi(IDLE);
        if (text) notification.info({ message: text, placement: 'top' });
      }
      if (isCaller) logToChat(call);
    },
    [leaveAgora, logToChat],
  );

  /** Closes the UI for a call the server no longer lists as live. */
  const closeStale = useCallback(
    async (id: string) => {
      const res = await CallService.fetchCall(id).catch(() => undefined);
      const call = res?.call;
      if (call && isTerminalCall(call)) finish(call);
      else if (!call && res && uiRef.current.call?.id === id) {
        finish({ ...uiRef.current.call, status: 'ended' });
      }
    },
    [finish],
  );

  /** Sends a hang-up intent; the server's answer (or 409 state) closes it. */
  const sendEnd = useCallback(
    async (kind: EndKind, reason?: string) => {
      const { call } = uiRef.current;
      if (!call) return;
      selfEndedRef.current = call.id;
      try {
        const res = await sendEndIntent(call.id, kind, reason);
        if (res?.call) finish(res.call, null);
      } catch (e) {
        const err = parseCallError(e);
        if (err.call && isTerminalCall(err.call)) {
          finish(err.call);
        } else if (err.call?.status === 'accepted' && kind !== 'end') {
          // Answered meanwhile (here or elsewhere): hang that up instead.
          await sendEndIntent(call.id, 'end')
            .then((r) => r.call && finish(r.call, null))
            .catch(() => closeStale(call.id));
        } else if (!err.status) {
          // Offline: close locally, tell the server once the stream is back.
          pendingEndRef.current = { id: call.id, kind };
          finish(call, null);
        } else {
          closeStale(call.id);
        }
      }
    },
    [finish, closeStale],
  );

  const renewToken = useCallback(async (callId: string) => {
    try {
      const { media } = await CallService.fetchCall(callId);
      if (media?.token && joinedRef.current === callId) {
        AgoraEngineService.renewToken(media.token);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[call] token renewal failed', e);
    }
  }, []);

  const joinAgora = useCallback(
    (call: Call, media: CallMedia) => {
      if (joinedRef.current === call.id) return;
      if (joinedRef.current) leaveAgora();
      joinedRef.current = call.id;
      const isVideo = call.type === 'video';
      const handler: IRtcEngineEventHandler = {
        onUserJoined: (_c, remoteUid) => {
          clearTimeout(peerLostTimerRef.current);
          setUi((s) => ({ ...s, remoteUid, peerLost: false }));
        },
        onUserOffline: (_c, _remoteUid, reason) => {
          setUi((s) => ({ ...s, remoteUid: undefined, peerLost: true }));
          // A hang-up arrives from the server any moment; a drop gets time
          // to come back before we end the call ourselves.
          clearTimeout(peerLostTimerRef.current);
          peerLostTimerRef.current = setTimeout(
            () => {
              if (uiRef.current.call?.id !== call.id) return;
              notification.info({
                message: 'Mất kết nối với người kia',
                placement: 'top',
              });
              sendEnd('end', 'peer_lost');
            },
            reason === UserOfflineReasonType.UserOfflineQuit ? 5000 : 20000,
          );
        },
        onConnectionStateChanged: (_c, state) => {
          if (state === ConnectionStateType.ConnectionStateReconnecting) {
            setUi((s) => ({ ...s, reconnecting: true }));
          } else if (state === ConnectionStateType.ConnectionStateConnected) {
            setUi((s) => ({ ...s, reconnecting: false }));
          } else if (state === ConnectionStateType.ConnectionStateFailed) {
            notification.info({ message: 'Mất kết nối', placement: 'top' });
            sendEnd(
              uiRef.current.phase === 'outgoing' ? 'cancel' : 'end',
              'connection_lost',
            );
          }
        },
        onTokenPrivilegeWillExpire: () => renewToken(call.id),
        onRequestToken: () => renewToken(call.id),
      };
      handlerRef.current = handler;
      AgoraEngineService.registerEventHandler(handler);
      AgoraEngineService.enableAudio();
      if (isVideo) {
        AgoraEngineService.enableVideo();
        AgoraEngineService.startPreview();
      } else {
        AgoraEngineService.disableVideo();
      }
      AgoraEngineService.joinChannel(media.token, media.channel, media.uid, {
        channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        publishMicrophoneTrack: true,
        publishCameraTrack: isVideo,
        autoSubscribeAudio: true,
        autoSubscribeVideo: true,
      });
      // Keep the user's mic/camera choice made while ringing.
      AgoraEngineService.muteLocalAudioStream(!uiRef.current.micOn);
      if (isVideo) {
        AgoraEngineService.muteLocalVideoStream(!uiRef.current.cameraOn);
      }
    },
    [leaveAgora, renewToken, sendEnd],
  );

  /** Joins with `media`, or fetches it (`GET /call/:id`) when missing. */
  const ensureJoined = useCallback(
    async (call: Call, media?: CallMedia | null) => {
      let creds = media || undefined;
      if (!creds) {
        creds = (await CallService.fetchCall(call.id).catch(() => undefined))
          ?.media as CallMedia | undefined;
      }
      if (!creds?.token) return;
      if (uiRef.current.call?.id !== call.id) return;
      joinAgora(call, creds);
    },
    [joinAgora],
  );

  const showMissed = useCallback((call: Call) => {
    if (missedShownRef.current.has(call.id)) return;
    missedShownRef.current.add(call.id);
    const name = call.caller.fullName || 'Một người';
    const description = `${name} đã gọi cho bạn${
      call.endReason === 'busy' ? ' lúc bạn đang bận' : ''
    }`;
    notification.info({
      message: 'Cuộc gọi nhỡ',
      description,
      placement: 'topRight',
      duration: 8,
    });
    osNotify('Cuộc gọi nhỡ', description);
  }, []);

  const toConnected = useCallback(
    (call: Call) => {
      setUi((s) => ({
        ...s,
        call: withType(call),
        phase: 'connected',
        acceptedAt: call.acceptedAt ? localMs(call.acceptedAt) : Date.now(),
      }));
    },
    [localMs],
  );

  /**
   * Renders one server view of a call (from an event, a response or a
   * resync). `media` is this device's credentials when known.
   */
  const apply = useCallback(
    (call: Call, media?: CallMedia | null) => {
      if (!myId) return;
      noteServerTime(call);
      if (finishedRef.current.has(call.id)) return;
      const cur = uiRef.current;
      const isCaller = call.caller.id === myId;
      const isMine = cur.call?.id === call.id;

      if (isTerminalCall(call)) {
        if (isMine) finish(call);
        return;
      }

      if (!isMine) {
        if (call.status === 'ringing' && !isCaller) {
          if (!isFree(cur.phase) || inMeetingRef.current) {
            // Busy (another call, or a meeting): decline without ringing.
            finishedRef.current.add(call.id);
            CallService.reject(call.id, 'busy').catch(() => {});
            showMissed({ ...call, endReason: 'busy' });
            return;
          }
          incomingNoticeRef.current?.close();
          incomingNoticeRef.current = osNotify(
            call.type === 'video' ? 'Cuộc gọi video đến' : 'Cuộc gọi thoại đến',
            `${call.caller.fullName || 'Một người'} đang gọi cho bạn`,
            { attention: true },
          );
          setUi({
            ...IDLE,
            phase: 'incoming',
            call: withType(call),
            isCaller: false,
            cameraOn: call.type === 'video',
            peer: {
              backendId: call.caller.id,
              name: call.caller.fullName,
              avatar: call.caller.avatar,
            },
          });
          return;
        }
        // My own placement: the POST answer will follow.
        if (!isFree(cur.phase)) return;
        // Restoring a live call of mine (app start, stream reconnect).
        const other = isCaller ? call.callee : call.caller;
        const base: CallUiState = {
          ...IDLE,
          call: withType(call),
          isCaller,
          cameraOn: call.type === 'video',
          peer: {
            backendId: other.id,
            name: other.fullName,
            avatar: other.avatar,
          },
          phase: call.status === 'accepted' ? 'connected' : 'outgoing',
          acceptedAt: call.acceptedAt ? localMs(call.acceptedAt) : undefined,
        };
        uiRef.current = base;
        setUi(base);
        ensureJoined(call, media);
        return;
      }

      // An update of the call on screen.
      setUi((s) => ({ ...s, call: withType(call) }));
      if (call.status !== 'accepted') return;
      if (cur.phase === 'outgoing') {
        toConnected(call);
        ensureJoined(call, media);
      } else if (cur.phase === 'incoming' && !acceptingRef.current) {
        // Answered on another of my devices.
        finishedRef.current.add(call.id);
        setUi(IDLE);
        notification.info({
          message: 'Đã trả lời trên thiết bị khác',
          placement: 'top',
        });
      } else if (cur.phase === 'connected' && media) {
        ensureJoined(call, media);
      }
    },
    [
      myId,
      finish,
      ensureJoined,
      toConnected,
      showMissed,
      localMs,
      noteServerTime,
    ],
  );
  const applyRef = useRef(apply);
  applyRef.current = apply;

  // ---- Resync: GET /call/active on stream (re)open ----------------------
  const resync = useCallback(async () => {
    const pending = pendingEndRef.current;
    if (pending) {
      try {
        await sendEndIntent(pending.id, pending.kind);
        pendingEndRef.current = undefined;
      } catch (e) {
        if (parseCallError(e).status) pendingEndRef.current = undefined;
      }
    }
    let active: CallWithMedia;
    try {
      active = await CallService.fetchActive();
    } catch (_) {
      return;
    }
    const cur = uiRef.current;
    const live = active?.call || undefined;
    if (cur.call && cur.call.id !== live?.id && cur.phase !== 'placing') {
      await closeStale(cur.call.id);
    }
    if (live && live.id !== pendingEndRef.current?.id) {
      applyRef.current(live, active.media || undefined);
    }
  }, [closeStale]);

  // ---- Event stream while logged in -------------------------------------
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!myId || !token) return undefined;
    const finished = finishedRef.current;
    const stream = new CallEvents(token, {
      onOpen: () => resync(),
      onEvent: (event: CallEventName, call: Call) => {
        if (event === 'call:missed') {
          if (call.callee.id === myId) showMissed(call);
          applyRef.current(call);
          return;
        }
        applyRef.current(call);
      },
    });
    stream.start();
    return () => {
      stream.stop();
      // Logged out mid-call: hang up with the token we still have.
      const { call, phase, isCaller } = uiRef.current;
      const loggedOut = localStorage.getItem('token') !== token;
      if (loggedOut && call && !isFree(phase)) {
        let intent = 'end';
        if (phase === 'incoming') intent = 'reject';
        else if (phase === 'outgoing' && isCaller) intent = 'cancel';
        fetch(`${API_BASE_URL}/call/${call.id}/${intent}`, {
          method: 'POST',
          headers: {
            appplatform: navigator.userAgent.includes('Mac')
              ? 'MacOs'
              : 'Windows',
            Authorization: `Bearer ${token}`,
            'content-type': 'application/json',
          },
          body: '{}',
        }).catch(() => {});
        finished.add(call.id);
        leaveAgora();
        setUi(IDLE);
      }
    };
  }, [myId, resync, showMissed, leaveAgora]);

  // ---- Caller -------------------------------------------------------------
  const startCall = useCallback(
    async (peer: CallPeer, type: CallType) => {
      if (!myId) return;
      if (!isFree(uiRef.current.phase)) return;
      if (inMeetingRef.current) {
        notification.warning({ message: 'Hãy rời cuộc họp trước khi gọi' });
        return;
      }
      abortPlacingRef.current = false;
      const placing: CallUiState = {
        ...IDLE,
        phase: 'placing',
        peer,
        isCaller: true,
        cameraOn: type === 'video',
      };
      uiRef.current = placing;
      setUi(placing);
      let res: CallWithMedia;
      try {
        res = await CallService.place(peer.backendId, type);
      } catch (e) {
        const err = parseCallError(e);
        if (err.call) finishedRef.current.add(err.call.id);
        setUi(IDLE);
        if (err.code === 'e_call_busy') {
          notification.info({
            message: 'Người nhận đang bận',
            placement: 'top',
          });
        } else if (err.code === 'e_call_already_in_call') {
          notification.warning({ message: 'Bạn đang trong một cuộc gọi khác' });
          resync();
        } else {
          notification.error({ message: 'Không gọi được' });
        }
        return;
      }
      const { call, media } = res;
      if (!call) {
        setUi(IDLE);
        notification.error({ message: 'Không gọi được' });
        return;
      }
      noteServerTime(call);
      const next: CallUiState = {
        ...placing,
        phase: 'outgoing',
        call: withType(call),
      };
      uiRef.current = next;
      if (abortPlacingRef.current) {
        // Hung up while placing: the UI is already closed.
        sendEnd('cancel');
        return;
      }
      setUi(next);
      if (media?.token) joinAgora(call, media);
      // An event may have overtaken the response.
      if (call.status !== 'ringing') apply(call, media);
    },
    [myId, joinAgora, sendEnd, apply, resync, noteServerTime],
  );

  // ---- Callee -------------------------------------------------------------
  const accept = useCallback(async () => {
    const { call } = uiRef.current;
    if (!call || uiRef.current.phase !== 'incoming' || acceptingRef.current) {
      return;
    }
    acceptingRef.current = true;
    try {
      const res = await CallService.accept(call.id);
      if (!res.call) throw new Error('no call');
      toConnected(res.call);
      await ensureJoined(res.call, res.media);
    } catch (e) {
      const err = parseCallError(e);
      // With appdeviceid sent, our own retried accept gets a 200; a 409
      // "accepted" means another of my devices answered first.
      if (err.call) {
        acceptingRef.current = false;
        apply(err.call);
      } else {
        notification.error({ message: 'Không vào được cuộc gọi' });
        resync();
      }
    } finally {
      acceptingRef.current = false;
    }
  }, [ensureJoined, toConnected, apply, resync]);

  const decline = useCallback(() => sendEnd('reject'), [sendEnd]);

  const hangUp = useCallback(async () => {
    const { phase, isCaller } = uiRef.current;
    if (phase === 'placing') {
      abortPlacingRef.current = true;
      setUi(IDLE);
      return;
    }
    if (phase === 'incoming') await sendEnd('reject');
    else await sendEnd(phase === 'outgoing' && isCaller ? 'cancel' : 'end');
  }, [sendEnd]);

  const toggleMic = useCallback(() => {
    const next = !uiRef.current.micOn;
    AgoraEngineService.muteLocalAudioStream(!next);
    setUi((s) => ({ ...s, micOn: next }));
  }, []);

  const toggleCamera = useCallback(() => {
    if (uiRef.current.call?.type !== 'video') return;
    const next = !uiRef.current.cameraOn;
    AgoraEngineService.muteLocalVideoStream(!next);
    setUi((s) => ({ ...s, cameraOn: next }));
  }, []);

  const dismiss = useCallback(() => {
    if (uiRef.current.phase === 'ended') setUi(IDLE);
  }, []);

  const value = useMemo(
    () => ({
      ...ui,
      startCall,
      accept,
      decline,
      hangUp,
      toggleMic,
      toggleCamera,
      dismiss,
    }),
    [ui, startCall, accept, decline, hangUp, toggleMic, toggleCamera, dismiss],
  );

  // Test hook for driving calls over the DevTools protocol (dev builds only).
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return undefined;
    // eslint-disable-next-line no-underscore-dangle
    (window as any).__visionCall = {
      ...value,
      joinedCallId: () => joinedRef.current,
      agoraState: () => AgoraEngineService.getConnectionState(),
    };
    return undefined;
  }, [value]);

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export type { CallStatus };
