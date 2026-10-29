import AgoraEngineService from '@/shared/services/Agora/AgoraEngineService';
import { IAudioFrameObserver } from 'agora-electron-sdk';
import { notification } from 'antd';
import {
  AudioSample,
  AudioSampleSource,
  Mp4OutputFormat,
  Output,
  StreamTarget,
  VideoSample,
  VideoSampleSource,
} from 'mediabunny';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getRecordingFolder } from '../utils/recordingPrefs';
import { ensureScreenCaptureAccess } from '../utils/screenCapturePermission';

/* global MediaStreamTrackProcessor -- typed by mediabunny */

const { ipcRenderer } = window.require('electron');

const SAMPLE_RATE = 48000;
// Output size: windows come in any (often odd) size, H.264 needs even
// dimensions; frames are letterboxed into this box.
const WIDTH = 1920;
const HEIGHT = 1080;

/** The same mixed frame delivered again (see the observer in `start`). */
export function isRepeat(
  previous: { renderTimeMs?: number; data: Int16Array } | undefined,
  renderTimeMs: number | undefined,
  data: Int16Array,
): boolean {
  if (!previous || previous.renderTimeMs !== renderTimeMs) return false;
  if (previous.data.length !== data.length) return false;
  for (let i = 0; i < data.length; i += 1) {
    if (previous.data[i] !== data[i]) return false;
  }
  return true;
}

interface Session {
  id: string;
  output: Output;
  video: MediaStream;
  observer: IAudioFrameObserver;
  stopped: { value: boolean };
  /** Resolves when the frame pump has drained. */
  videoDone: Promise<void>;
  /** Audio samples are added in order through this chain. */
  audioQueue: { done: Promise<unknown> };
}

/**
 * Records the meeting locally: this window as seen on screen (every tile,
 * shared screen, chat) plus the call audio — my mic and everyone else, as
 * mixed by Agora — into one MP4 (H.264 + AAC), saved wherever the user
 * chooses.
 *
 * Encoding goes through WebCodecs (Mediabunny muxes): Chromium's own
 * MediaRecorder MP4 output has broken keyframes that QuickTime can't open.
 * Frames and audio are fed in by hand because Mediabunny's MediaStream
 * sources spawn a blob: worker, which the page CSP blocks.
 */
export function useMeetingRecorder(meetingTitle?: string) {
  const [isRecording, setIsRecording] = useState(false);
  const [startedAt, setStartedAt] = useState<number>();
  const session = useRef<Session>();
  const stopRef = useRef<() => Promise<void>>();

  const start = useCallback(async () => {
    if (session.current) return;
    if (!(await ensureScreenCaptureAccess())) return;
    let video: MediaStream | undefined;
    let observer: IAudioFrameObserver | undefined;
    try {
      const sourceId: string = await ipcRenderer.invoke('recording:source-id');
      video = await navigator.mediaDevices.getUserMedia({
        audio: false,
        // Chromium's desktop-capture constraints (`mandatory`) aren't in
        // the DOM typings, hence the cast below.
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
            maxFrameRate: 24,
            maxWidth: WIDTH,
            maxHeight: HEIGHT,
          },
        } as unknown as boolean,
      });

      const id: string = await ipcRenderer.invoke('recording:open', 'mp4');
      const output = new Output({
        // Fragmented: data is only appended, and a crash still leaves a
        // playable file up to the last fragment.
        format: new Mp4OutputFormat({ fastStart: 'fragmented' }),
        target: new StreamTarget(
          new WritableStream({
            write: (chunk) =>
              ipcRenderer.invoke(
                'recording:chunk',
                id,
                chunk.data,
                chunk.position,
              ),
          }),
          { chunked: true, chunkSize: 2 * 1024 * 1024 },
        ),
      });
      const videoSource = new VideoSampleSource({
        codec: 'avc',
        bitrate: 3_000_000,
        keyFrameInterval: 2,
        latencyMode: 'realtime',
        transform: { width: WIDTH, height: HEIGHT, fit: 'contain' },
        sizeChangeBehavior: 'contain',
      });
      const audioSource = new AudioSampleSource({
        codec: 'aac',
        bitrate: 128_000,
      });
      output.addVideoTrack(videoSource, { frameRate: 24 });
      output.addAudioTrack(audioSource);
      await output.start();

      const stopped = { value: false };

      // Call audio: Agora hands us the mix of my mic + remote users as
      // 10 ms chunks of 16-bit mono PCM.
      const audioQueue = { done: Promise.resolve() as Promise<unknown> };
      let audioFrames = 0;
      // While sharing there is a second connection (the camera's), and
      // Agora hands every mixed frame over once per connection: the audio
      // came out twice as long as the meeting. A frame identical to the one
      // just before (same render time, same samples) is that repeat.
      let previous: { renderTimeMs?: number; data: Int16Array } | undefined;
      AgoraEngineService.setMixedAudioFrameParameters(SAMPLE_RATE, 1, 480);
      observer = {
        onMixedAudioFrame: (_channel, frame) => {
          const bytes = frame.buffer;
          const samples = frame.samplesPerChannel ?? 0;
          if (stopped.value || !bytes || !samples) return;
          const data = new Int16Array(
            bytes.buffer.slice(
              bytes.byteOffset,
              bytes.byteOffset + samples * 2,
            ),
          );
          if (isRepeat(previous, frame.renderTimeMs, data)) {
            previous = undefined;
            return;
          }
          previous = { renderTimeMs: frame.renderTimeMs, data: data.slice() };
          const sample = new AudioSample({
            data,
            format: 's16',
            numberOfChannels: 1,
            sampleRate: SAMPLE_RATE,
            timestamp: audioFrames / SAMPLE_RATE,
          });
          audioFrames += samples;
          audioQueue.done = audioQueue.done
            .then(() => audioSource.add(sample))
            .finally(() => sample.close());
        },
      };
      AgoraEngineService.getMediaEngine().registerAudioFrameObserver(observer);

      // Video: pull frames off the capture track and encode them, timed
      // from the first frame so both tracks start at zero.
      const reader = new MediaStreamTrackProcessor({
        track: video.getVideoTracks()[0],
      }).readable.getReader();
      const videoDone = (async () => {
        let firstTimestamp: number | undefined;
        while (!stopped.value) {
          // eslint-disable-next-line no-await-in-loop
          const { value: frame, done } = await reader.read();
          if (done || !frame) break;
          firstTimestamp ??= frame.timestamp;
          const sample = new VideoSample(frame, {
            timestamp: (frame.timestamp - firstTimestamp) / 1e6,
          });
          try {
            // Awaiting is the backpressure: frames that arrive meanwhile
            // are dropped by the track, not queued in memory.
            // eslint-disable-next-line no-await-in-loop
            await videoSource.add(sample);
          } finally {
            sample.close();
          }
        }
        reader.releaseLock();
      })().catch((err) => {
        console.warn('[recording] video failed', err);
        notification.error({ message: 'Bản ghi bị gián đoạn' });
        stopRef.current?.();
      });

      session.current = {
        id,
        output,
        video,
        observer,
        stopped,
        videoDone,
        audioQueue,
      };
      setStartedAt(Date.now());
      setIsRecording(true);
    } catch (e) {
      console.warn('[recording] start failed', e);
      if (observer) {
        AgoraEngineService.getMediaEngine().unregisterAudioFrameObserver(
          observer,
        );
      }
      video?.getTracks().forEach((t) => t.stop());
      notification.error({ message: 'Không bắt đầu ghi được' });
    }
  }, []);

  const stop = useCallback(async () => {
    const s = session.current;
    if (!s) return;
    session.current = undefined;
    setIsRecording(false);
    setStartedAt(undefined);

    s.stopped.value = true;
    try {
      AgoraEngineService.getMediaEngine().unregisterAudioFrameObserver(
        s.observer,
      );
    } catch (_) {
      // Engine already released.
    }
    // Ending the track ends the frame pump's pending read.
    s.video.getTracks().forEach((t) => t.stop());
    await s.videoDone;
    await s.audioQueue.done.catch(() => {});
    try {
      await s.output.finalize();
    } catch (err) {
      console.warn('[recording] finalize failed', err);
    }

    const date = new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-');
    const saved: string | null = await ipcRenderer.invoke(
      'recording:finish',
      s.id,
      `${meetingTitle || 'Cuoc hop'} ${date}`,
      getRecordingFolder(),
    );
    if (saved) {
      const key = `recording-${s.id}`;
      notification.success({
        key,
        message: 'Đã lưu bản ghi cuộc họp',
        description: saved,
        placement: 'top',
        duration: 10,
        onClick: () => {
          ipcRenderer.invoke('recording:reveal', saved);
          notification.destroy(key);
        },
      });
    }
  }, [meetingTitle]);
  stopRef.current = stop;

  // Leaving the meeting while recording: still offer to save it.
  useEffect(
    () => () => {
      if (session.current) stopRef.current?.();
    },
    [],
  );

  return { isRecording, startedAt, start, stop };
}
