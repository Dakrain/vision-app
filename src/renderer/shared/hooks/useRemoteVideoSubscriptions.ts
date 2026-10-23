import { VideoStreamType } from 'agora-electron-sdk';
import { useEffect, useRef } from 'react';
import AgoraEngineService from '../services/Agora/AgoraEngineService';

/** Which remote videos are on screen, and how big. */
export type VisibleStreams = {
  /** Large tiles (speaker view, shared screen, small galleries). */
  high: number[];
  /** Small gallery tiles: the low-quality simulcast stream is enough. */
  low: number[];
};

type Applied = 'high' | 'low' | 'off';

/**
 * Receives video only for what is on screen: large tiles get the full
 * stream, small tiles the low simulcast stream, everyone else (other gallery
 * pages, hidden behind the speaker) none at all. Audio is untouched.
 */
export function useRemoteVideoSubscriptions(
  remoteUids: number[],
  visible: VisibleStreams,
) {
  // What the engine was last told, so only changes are sent.
  const applied = useRef(new Map<number, Applied>());

  useEffect(() => {
    const high = new Set(visible.high);
    const low = new Set(visible.low);
    const current = new Set(remoteUids);

    remoteUids.forEach((uid) => {
      let next: Applied = 'off';
      if (high.has(uid)) next = 'high';
      else if (low.has(uid)) next = 'low';
      const prev = applied.current.get(uid);
      if (prev === next) return;

      if (next === 'off') {
        AgoraEngineService.muteRemoteVideoStream(uid, true);
      } else {
        AgoraEngineService.setRemoteVideoStreamType(
          uid,
          next === 'high'
            ? VideoStreamType.VideoStreamHigh
            : VideoStreamType.VideoStreamLow,
        );
        if (prev === 'off' || prev === undefined) {
          AgoraEngineService.muteRemoteVideoStream(uid, false);
        }
      }
      applied.current.set(uid, next);
    });

    // Users who left: forget them, a rejoin starts fresh.
    [...applied.current.keys()].forEach((uid) => {
      if (!current.has(uid)) applied.current.delete(uid);
    });
  }, [remoteUids, visible]);
}
