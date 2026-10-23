import { Avatar } from '@/renderer/shared/components';
import { VideoView } from '@/renderer/features/Meeting/components/VideoView/VideoView';
import { useEffect, useState } from 'react';
import { useCall } from './CallProvider';
import './CallOverlay.scss';

const fmt = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(s / 60) % 60).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  const h = Math.floor(s / 3600);
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

/** Plays a soft two-tone ring while a call is incoming. */
function useRingTone(active: boolean) {
  useEffect(() => {
    if (!active) return undefined;
    const ctx = new AudioContext();
    const ring = () => {
      [0, 0.45].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = offset ? 440 : 480;
        gain.gain.value = 0.08;
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.4);
      });
    };
    ring();
    const timer = setInterval(ring, 2500);
    return () => {
      clearInterval(timer);
      ctx.close().catch(() => {});
    };
  }, [active]);
}

/** Full-window UI for the current 1:1 call, on top of any screen. */
export function CallOverlay() {
  const call = useCall();
  const [now, setNow] = useState(Date.now());
  useRingTone(call.phase === 'incoming');

  useEffect(() => {
    if (call.phase !== 'connected') return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [call.phase]);

  if (call.phase === 'idle') return null;

  const isVideo = call.call?.callType === 'video';
  const peerName = call.peer?.name ?? 'Liên hệ';
  let status = '';
  switch (call.phase) {
    case 'placing':
      status = 'Đang kết nối…';
      break;
    case 'outgoing':
      status = 'Đang đổ chuông…';
      break;
    case 'incoming':
      status = isVideo ? 'Cuộc gọi video đến' : 'Cuộc gọi thoại đến';
      break;
    case 'ended':
      status = call.endMessage ?? '';
      break;
    default:
      status = call.acceptedAt ? fmt(now - call.acceptedAt) : '';
  }

  const showRemoteVideo =
    call.phase === 'connected' && isVideo && call.remoteUid !== undefined;

  return (
    <div className="call-overlay" role="dialog" aria-label="Cuộc gọi">
      {showRemoteVideo ? (
        <VideoView
          className="call-overlay-remote"
          uid={call.remoteUid!}
          isLocal={false}
          avatar={call.peer?.avatar ?? ''}
          enableVideo
          enableAudio
          label={peerName}
          debug={false}
        />
      ) : (
        <div className="call-overlay-peer">
          <Avatar url={call.peer?.avatar ?? ''} radius={56} name={peerName} />
          <h2>{peerName}</h2>
        </div>
      )}

      {call.phase === 'connected' && isVideo && call.cameraOn && (
        <VideoView
          className="call-overlay-local"
          uid={0}
          isLocal
          avatar=""
          enableVideo
          enableAudio={call.micOn}
          label="Bạn"
          debug={false}
        />
      )}

      <div className="call-overlay-status">{status}</div>

      {(call.reconnecting || call.peerLost) && (
        <div className="call-overlay-banner">
          {call.reconnecting
            ? 'Mất kết nối mạng. Đang kết nối lại…'
            : 'Người kia đang mất kết nối…'}
        </div>
      )}

      <div className="call-overlay-controls">
        {call.phase === 'ended' && (
          <>
            <button
              type="button"
              className="call-btn toggle"
              onClick={call.dismiss}
            >
              Huỷ
            </button>
            <button
              type="button"
              className="call-btn accept"
              onClick={() =>
                call.peer &&
                call.startCall(call.peer, isVideo ? 'video' : 'audio')
              }
            >
              Gọi lại
            </button>
          </>
        )}
        {call.phase !== 'ended' &&
          (call.phase === 'incoming' ? (
            <>
              <button
                type="button"
                className="call-btn decline"
                onClick={call.decline}
              >
                Từ chối
              </button>
              <button
                type="button"
                className="call-btn accept"
                onClick={call.accept}
              >
                Trả lời
              </button>
            </>
          ) : (
            <>
              {call.phase === 'connected' && (
                <button
                  type="button"
                  className={`call-btn toggle ${call.micOn ? '' : 'off'}`}
                  onClick={call.toggleMic}
                >
                  {call.micOn ? 'Tắt mic' : 'Bật mic'}
                </button>
              )}
              {call.phase === 'connected' && isVideo && (
                <button
                  type="button"
                  className={`call-btn toggle ${call.cameraOn ? '' : 'off'}`}
                  onClick={call.toggleCamera}
                >
                  {call.cameraOn ? 'Tắt camera' : 'Bật camera'}
                </button>
              )}
              <button
                type="button"
                className="call-btn decline"
                onClick={call.hangUp}
              >
                {call.phase === 'connected' ? 'Kết thúc' : 'Huỷ'}
              </button>
            </>
          ))}
      </div>
    </div>
  );
}
