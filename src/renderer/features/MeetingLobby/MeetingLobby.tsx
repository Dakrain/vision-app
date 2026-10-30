import AgoraEngineService from '@/renderer/shared/services/Agora/AgoraEngineService';
import MeetingService from '@/renderer/shared/services/Meeting/MeetingService';
import {
  Meeting,
  MeetingRole,
  MemberStatus,
} from '@/renderer/shared/types/meeting';
import { Avatar, Button } from '@/shared/components';
import { useAuth } from '@/shared/hooks/useAuth';
import useLoading from '@/shared/hooks/useLoading';
import { Modal, notification, Select, Typography } from 'antd';
import {
  AudioVolumeInfo,
  IRtcEngineEventHandler,
  RenderModeType,
  RtcConnection,
  VideoMirrorModeType,
  VideoSourceType,
} from 'agora-electron-sdk';
import Icon from 'assets/svg/icons';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { restoreVirtualBackground } from '@/renderer/shared/utils/virtualBackground';
import { livestreamErrorCode } from '@/renderer/shared/hooks/useLivestream';
import { VirtualBackgroundDialog } from '@/renderer/features/Meeting/components/VirtualBackgroundDialog/VirtualBackgroundDialog';
import { loadLobbyPrefs, saveLobbyPrefs } from './prefs';
import './MeetingLobby.scss';

type Device = { deviceId?: string; deviceName?: string };

const options = (list: Device[]) =>
  list.map((d) => ({ value: d.deviceId ?? '', label: d.deviceName }));

/** Mic / camera the room lets this member turn on (server defaults). */
const allowedFor = (meeting?: Meeting) => {
  const isManager =
    meeting?.user?.role === MeetingRole.HOST ||
    meeting?.user?.role === MeetingRole.CO_HOST;
  return {
    mic: isManager || (meeting?.room?.muteAllAudio ?? 1) === 1,
    camera: isManager || (meeting?.room?.muteAllVideo ?? 0) === 1,
  };
};

/**
 * Pre-join screen: the user previews camera/mic/background, picks devices
 * and decides whether to enter with mic/camera on. The choice is written to
 * the server (`PUT /meeting/:id/setting`) before entering so other
 * participants see the right mute icons, and handed to the meeting screen
 * via router state.
 *
 * Opened either for a meeting I already belong to (`meetingId`: my own, or
 * from the list) or to join by code (`meetingKey` + `password`). In the
 * latter case nothing is sent until "Tham gia": only then is the join
 * request made, so the host hears about me once I am actually ready. With a
 * waiting room I then stay here until the host approves, and enter on my own.
 */
function MeetingLobby() {
  const location = useLocation();
  const navigate = useNavigate();
  const { withLoading } = useLoading();
  const { user } = useAuth();
  const {
    meetingId: initialMeetingId,
    meetingKey,
    password,
    justCreated = false,
  } = (location.state || {}) as {
    meetingId?: number;
    meetingKey?: string;
    password?: string;
    /** Instant meeting created just now, on the way in. */
    justCreated?: boolean;
  };
  // Known from the start, or once the join request has been accepted.
  const [meetingId, setMeetingId] = useState(initialMeetingId);

  const [detail, setDetail] = useState<Meeting>();
  const [openBackground, setOpenBackground] = useState(false);
  // Already in this meeting on another device: transfer, or join here too.
  const [deviceChoice, setDeviceChoice] = useState<Meeting>();
  const [enableMic, setEnableMic] = useState(() => loadLobbyPrefs().enableMic);
  const [enableCamera, setEnableCamera] = useState(
    () => loadLobbyPrefs().enableCamera,
  );
  const [cameras, setCameras] = useState<Device[]>([]);
  const [mics, setMics] = useState<Device[]>([]);
  const [speakers, setSpeakers] = useState<Device[]>([]);
  const [cameraId, setCameraId] = useState<string>();
  const [micId, setMicId] = useState<string>();
  const [speakerId, setSpeakerId] = useState<string>();
  const [micLevel, setMicLevel] = useState(0);
  const previewRef = useRef<HTMLDivElement>(null);

  const isHost = detail?.user?.role === MeetingRole.HOST;
  const isWaiting = detail?.user?.status === MemberStatus.PENDING;
  // Room permissions (members only; same defaults as the server).
  const { mic: micAllowed, camera: cameraAllowed } = allowedFor(detail);
  // Waiting members don't get the room settings yet; the meeting screen
  // applies them on entry.
  const settingsKnown = !!detail && !isWaiting;
  useEffect(() => {
    if (!settingsKnown) return;
    if (!micAllowed) setEnableMic(false);
    if (!cameraAllowed) setEnableCamera(false);
  }, [settingsKnown, micAllowed, cameraAllowed]);
  const notAllowed = (what: string) =>
    notification.warning({
      message: `Chủ phòng chưa cho phép bật ${what}`,
      placement: 'top',
    });

  useEffect(() => {
    if (!meetingId) {
      // Joining by code: the meeting is only known after "Tham gia".
      if (!meetingKey) navigate('/home', { replace: true });
      return;
    }
    withLoading(MeetingService.fetchMeetingDetail(meetingId))
      .then(setDetail)
      .catch(() => navigate('/home', { replace: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]);

  // Device lists + saved device choice.
  useEffect(() => {
    const prefs = loadLobbyPrefs();
    const videoManager = AgoraEngineService.getVideoDeviceManager();
    const audioManager = AgoraEngineService.getAudioDeviceManager();

    const cameraList = videoManager.enumerateVideoDevices() ?? [];
    const micList = audioManager.enumerateRecordingDevices() ?? [];
    const speakerList = audioManager.enumeratePlaybackDevices() ?? [];
    setCameras(cameraList);
    setMics(micList);
    setSpeakers(speakerList);

    const pick = (
      list: Device[],
      saved: string | undefined,
      current: string,
    ) => (list.some((d) => d.deviceId === saved) ? saved : current);

    const camera = pick(cameraList, prefs.cameraId, videoManager.getDevice());
    const mic = pick(micList, prefs.micId, audioManager.getRecordingDevice());
    const speaker = pick(
      speakerList,
      prefs.speakerId,
      audioManager.getPlaybackDevice(),
    );
    if (camera) videoManager.setDevice(camera);
    if (mic) audioManager.setRecordingDevice(mic);
    if (speaker) audioManager.setPlaybackDevice(speaker);
    setCameraId(camera);
    setMicId(mic);
    setSpeakerId(speaker);
  }, []);

  // Camera preview.
  useEffect(() => {
    const view = previewRef.current;
    if (!enableCamera || !view) {
      return undefined;
    }
    AgoraEngineService.enableVideo();
    AgoraEngineService.setupLocalVideo({
      sourceType: VideoSourceType.VideoSourceCamera,
      renderMode: RenderModeType.RenderModeHidden,
      mirrorMode: VideoMirrorModeType.VideoMirrorModeEnabled,
      view,
    });
    AgoraEngineService.startPreview(VideoSourceType.VideoSourceCamera);
    restoreVirtualBackground();
    return () => {
      AgoraEngineService.stopPreview(VideoSourceType.VideoSourceCamera);
      AgoraEngineService.setupLocalVideo({
        sourceType: VideoSourceType.VideoSourceCamera,
        view: null,
      });
    };
  }, [enableCamera, cameraId]);

  // Mic level meter so the user can check the selected microphone works.
  useEffect(() => {
    if (!enableMic) {
      setMicLevel(0);
      return undefined;
    }
    const handler: IRtcEngineEventHandler = {
      onAudioVolumeIndication: (
        _connection: RtcConnection,
        speakersInfo: AudioVolumeInfo[],
      ) => {
        const local = speakersInfo.find((s) => s.uid === 0);
        setMicLevel(local?.volume ?? 0);
      },
    };
    const audioManager = AgoraEngineService.getAudioDeviceManager();
    AgoraEngineService.registerEventHandler(handler);
    audioManager.startRecordingDeviceTest(100);
    return () => {
      audioManager.stopRecordingDeviceTest();
      AgoraEngineService.unregisterEventHandler(handler);
    };
  }, [enableMic, micId]);

  const toggleMic = () => {
    if (!enableMic && settingsKnown && !micAllowed) {
      notAllowed('micro');
      return;
    }
    setEnableMic(!enableMic);
    saveLobbyPrefs({ enableMic: !enableMic });
  };

  const toggleCamera = () => {
    if (!enableCamera && settingsKnown && !cameraAllowed) {
      notAllowed('camera');
      return;
    }
    setEnableCamera(!enableCamera);
    saveLobbyPrefs({ enableCamera: !enableCamera });
  };

  const onSelectCamera = (id: string) => {
    AgoraEngineService.getVideoDeviceManager().setDevice(id);
    setCameraId(id);
    saveLobbyPrefs({ cameraId: id });
  };

  const onSelectMic = (id: string) => {
    AgoraEngineService.getAudioDeviceManager().setRecordingDevice(id);
    setMicId(id);
    saveLobbyPrefs({ micId: id });
  };

  const onSelectSpeaker = (id: string) => {
    AgoraEngineService.getAudioDeviceManager().setPlaybackDevice(id);
    setSpeakerId(id);
    saveLobbyPrefs({ speakerId: id });
  };

  /**
   * Enters an approved meeting with the choices made here. `main` takes
   * this account's usual place (another device of mine in the meeting is
   * pushed out: a transfer); `companion` joins next to it as a second
   * device. Without a mode, ask first when I am already in there.
   */
  const enter = async (meeting: Meeting, mode?: 'main' | 'companion') => {
    const id = meeting.room?.id ?? meetingId;
    if (!id) return;
    if (!mode) {
      // Older servers have no /devices: just join as before.
      const devices = await MeetingService.fetchMyDevices(id).catch(
        () => undefined,
      );
      if (devices?.known && devices.main) {
        setDeviceChoice(meeting);
        return;
      }
    }
    const companion = mode === 'companion';
    const allowed = allowedFor(meeting);
    // A second device starts muted: it sits next to the first one.
    const mic = enableMic && allowed.mic && !companion;
    const camera = enableCamera && allowed.camera;
    // The member row (what others see) belongs to the main device.
    if (!companion) {
      try {
        await withLoading(
          MeetingService.updateSetting(id, {
            enable_audio: mic ? 1 : 0,
            enable_video: camera ? 1 : 0,
          }),
        );
      } catch (_) {
        // The meeting screen applies the same choice locally, so a failed
        // sync only leaves other clients with a stale icon until the next
        // toggle.
      }
    }
    navigate('/meeting', {
      replace: true,
      state: { meetingId: id, enableMic: mic, enableCamera: camera, companion },
    });
  };

  /** Joining by code: the request (the host's waiting list) is made now. */
  const requestToJoin = async () => {
    if (!meetingKey) return;
    try {
      const result = await withLoading(
        MeetingService.joinMeeting({
          visionMeetingKey: meetingKey,
          visionMeetingPwd: password ?? '',
        }),
      );
      if (
        !result?.id ||
        (result.status !== MemberStatus.APPROVED &&
          result.status !== MemberStatus.PENDING)
      ) {
        notification.warning({
          message: 'Bạn không thể tham gia cuộc họp này',
          placement: 'top',
        });
        return;
      }
      const next = await withLoading(
        MeetingService.fetchMeetingDetail(result.id),
      );
      setMeetingId(result.id);
      setDetail(next);
      // Waiting room: the poll below enters once the host approves.
      if (next?.user?.status === MemberStatus.APPROVED) await enter(next);
    } catch (error) {
      const code = livestreamErrorCode(error);
      let description = 'Vui lòng thử lại.';
      if (code === 'e_meeting_not_found') {
        description =
          'Mã cuộc họp hoặc mật khẩu không đúng, hoặc cuộc họp đã kết thúc.';
      } else if (code === 'e_meeting_over_limit') {
        description = 'Cuộc họp đã đủ số người tham gia.';
      }
      notification.error({
        message: 'Không tham gia được cuộc họp',
        description,
        placement: 'top',
      });
    }
  };

  const join = () => {
    if (!meetingId) {
      requestToJoin();
      return;
    }
    if (detail) enter(detail);
  };

  const cancel = async () => {
    // Members were already added to the room by `POST /meeting/request`;
    // release the slot. The host keeps the room (exit would drop host role).
    // Joining by code before "Tham gia": nothing to release.
    if (meetingId && !isHost) {
      await MeetingService.leaveMeeting(meetingId).catch(() => {});
    }
    // An instant meeting I just created and never started: drop it, or it
    // sits in everyone's "Live" list forever.
    if (meetingId && isHost && justCreated) {
      await withLoading(
        MeetingService.deleteMeeting(meetingId).catch(() =>
          MeetingService.endMeeting(meetingId),
        ),
      ).catch(() => {});
    }
    navigate('/home', { replace: true });
  };

  // Waiting room: poll for the host's decision. Approved → enter with the
  // choices made here; rejected (the member row is removed) → back home.
  const enterRef = useRef(enter);
  enterRef.current = enter;
  useEffect(() => {
    if (!isWaiting || !meetingId) return undefined;
    let stopped = false;
    const timer = setInterval(async () => {
      try {
        const next = await MeetingService.fetchMeetingDetail(meetingId);
        if (stopped) return;
        if (next?.user?.status === MemberStatus.APPROVED) {
          stopped = true;
          setDetail(next);
          notification.success({
            message: 'Chủ phòng đã cho bạn vào cuộc họp',
            placement: 'top',
          });
          enterRef.current(next);
        }
      } catch (_) {
        if (stopped) return;
        stopped = true;
        notification.warning({
          message: 'Chủ phòng đã từ chối yêu cầu tham gia của bạn',
          placement: 'top',
        });
        navigate('/home', { replace: true });
      }
    }, 3000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [isWaiting, meetingId, navigate]);

  const room = detail?.room;
  const hostName = detail?.host?.fullName || room?.ownerFullName;
  // My own meeting starts; anyone else's is joined.
  // A known meeting whose details are still loading: my role isn't known
  // yet (the label used to flip from "Tham gia ngay" to "Bắt đầu").
  const loadingDetail = !!meetingId && !detail;
  let joinLabel = 'Tham gia ngay';
  if (loadingDetail) joinLabel = 'Đang tải…';
  else if (isWaiting) joinLabel = 'Đang chờ duyệt…';
  else if (isHost) joinLabel = 'Bắt đầu';

  return (
    <div className="lobby">
      <div className="lobby-preview">
        <div className="lobby-preview-video">
          {/* Separate keys: Agora puts its mirror transform straight on the
              surface element, which React would otherwise reuse for the
              placeholder (mirrored "Camera đang tắt"). */}
          {enableCamera ? (
            <div
              key="surface"
              ref={previewRef}
              className="lobby-preview-surface"
            />
          ) : (
            <div key="off" className="lobby-preview-off">
              <Avatar
                url={user?.avatarUrl ?? ''}
                radius={48}
                name={user?.fullName ?? ''}
              />
              <span>Camera đang tắt</span>
            </div>
          )}
        </div>
        <div className="lobby-preview-controls">
          <button
            type="button"
            className={`lobby-toggle ${enableMic ? '' : 'off'}`}
            onClick={toggleMic}
          >
            <Icon name={enableMic ? 'micOn' : 'micOff'} />
            <span>{enableMic ? 'Mic bật' : 'Mic tắt'}</span>
          </button>
          <button
            type="button"
            className={`lobby-toggle ${enableCamera ? '' : 'off'}`}
            onClick={toggleCamera}
          >
            <Icon name={enableCamera ? 'cameraOn' : 'cameraOff'} />
            <span>{enableCamera ? 'Camera bật' : 'Camera tắt'}</span>
          </button>
          {/* A background only means something with the camera on. */}
          <button
            type="button"
            className="lobby-toggle"
            disabled={!enableCamera}
            title={enableCamera ? undefined : 'Bật camera để chọn phông nền'}
            onClick={() => setOpenBackground(true)}
          >
            <Icon name="lobbyBackground" />
            <span>Phông nền</span>
          </button>
        </div>
      </div>

      <div className="lobby-panel">
        <Typography.Title level={4} className="lobby-title">
          {room?.title ?? 'Cuộc họp'}
        </Typography.Title>
        <div className="lobby-info">
          {hostName && <span>Chủ trì: {hostName}</span>}
          {(room?.visionMeetingKey || meetingKey) && (
            <span>ID: {room?.visionMeetingKey || meetingKey}</span>
          )}
        </div>

        <div className="lobby-field">
          <span>Camera</span>
          <Select
            value={cameraId}
            options={options(cameras)}
            onChange={onSelectCamera}
            notFoundContent="Không tìm thấy camera"
          />
        </div>
        <div className="lobby-field">
          <span>Micrô</span>
          <Select
            value={micId}
            options={options(mics)}
            onChange={onSelectMic}
            notFoundContent="Không tìm thấy micrô"
          />
          <div className="lobby-meter">
            <div
              className="lobby-meter-level"
              style={{ width: `${Math.min(100, (micLevel / 255) * 100)}%` }}
            />
          </div>
        </div>
        <div className="lobby-field">
          <span>Loa</span>
          <Select
            value={speakerId}
            options={options(speakers)}
            onChange={onSelectSpeaker}
            notFoundContent="Không tìm thấy loa"
          />
        </div>

        {isWaiting && (
          <div className="lobby-waiting">
            <span className="lobby-waiting-dot" />
            Đang chờ chủ phòng duyệt. Bạn sẽ tự vào cuộc họp khi được cho phép.
          </div>
        )}

        <div className="lobby-actions">
          <Button
            variant="primary"
            title={joinLabel}
            onClick={join}
            disabled={isWaiting || loadingDetail}
          />
          <Button variant="outline" title="Hủy" onClick={cancel} />
        </div>
      </div>
      <VirtualBackgroundDialog
        open={openBackground}
        onClose={() => setOpenBackground(false)}
      />
      <Modal
        open={!!deviceChoice}
        centered
        footer={null}
        title="Bạn đang ở trong cuộc họp này trên thiết bị khác"
        onCancel={() => setDeviceChoice(undefined)}
      >
        <Typography.Paragraph>
          Chuyển cuộc họp sang thiết bị này, hay tham gia thêm (ví dụ để chia
          sẻ màn hình hoặc bật camera ở đây)?
        </Typography.Paragraph>
        <div className="lobby-device-choice">
          <Button
            variant="primary"
            title="Chuyển sang thiết bị này"
            onClick={() => {
              const meeting = deviceChoice;
              setDeviceChoice(undefined);
              if (meeting) enter(meeting, 'main');
            }}
          />
          <Button
            variant="outline"
            title="Tham gia trên thiết bị này"
            onClick={() => {
              const meeting = deviceChoice;
              setDeviceChoice(undefined);
              if (meeting) enter(meeting, 'companion');
            }}
          />
        </div>
      </Modal>
    </div>
  );
}

export default MeetingLobby;
