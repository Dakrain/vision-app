import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LivestreamService from '@/shared/services/Livestream/LivestreamService';
import {
  LivestreamLayout,
  MeetingLivestream,
} from '@/renderer/shared/types/livestream';

const ACTIVE = ['starting', 'live', 'stopping'];
const POLL_MS = 10000;
const LAYOUT_DEBOUNCE_MS = 1000;

interface Options {
  meetingId?: number;
  canManage: boolean;
  /** Bumped by RTM when someone else starts/stops a livestream. */
  signal: number;
  /** Announces a change to the other participants (RTM). */
  announce: () => void;
  myUid?: number;
  remoteUids: number[];
  isSharing: boolean;
  /** Another participant who announced a screen share (RTM SCREEN_SHARE). */
  remoteSharingUid?: number;
}

/** Reads the server error code out of the stringified axios error. */
export const livestreamErrorCode = (error: unknown): string => {
  try {
    const parsed = typeof error === 'string' ? JSON.parse(error) : error;
    return (
      parsed?.response?.data?.code || parsed?.data?.code || parsed?.code || ''
    );
  } catch (_) {
    return '';
  }
};

/**
 * Livestream state of the current meeting plus host actions. While the
 * meeting is live, a host/co-host keeps the cloud layout in sync with who is
 * in the room and whether this user is sharing the screen.
 */
export const useLivestream = ({
  meetingId,
  canManage,
  signal,
  announce,
  myUid,
  remoteUids,
  isSharing,
  remoteSharingUid,
}: Options) => {
  const [streams, setStreams] = useState<MeetingLivestream[]>([]);
  // A backend without the livestream API answers 404: stop polling it.
  const [unsupported, setUnsupported] = useState(false);
  // Not (or no longer) an approved member of the meeting: the API answers
  // 400 e_meeting_not_found to every poll. Wait for the next RTM signal.
  const [notMember, setNotMember] = useState(false);
  useEffect(() => setNotMember(false), [signal]);

  const refresh = useCallback(async () => {
    if (!meetingId || unsupported || notMember) return;
    try {
      const res = await LivestreamService.fetchStatus(meetingId);
      setStreams(res.rows ?? []);
    } catch (error) {
      if (livestreamErrorCode(error) === 'e_meeting_not_found') {
        setNotMember(true);
        return;
      }
      try {
        const parsed = JSON.parse(String(error));
        if (parsed?.response?.status === 404) setUnsupported(true);
      } catch (_) {
        // Keep the last known state; the next poll will retry.
      }
    }
  }, [meetingId, unsupported, notMember]);

  // Poll + refresh immediately on RTM signals.
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh, signal]);

  const activeStreams = useMemo(
    () => streams.filter((s) => ACTIVE.includes(s.status)),
    [streams],
  );
  const isLive = streams.some((s) => s.status === 'live');

  const layout: LivestreamLayout = useMemo(() => {
    const uids = [myUid, ...remoteUids].filter((uid): uid is number => !!uid);
    return {
      uids: Array.from(new Set(uids)),
      shareUid: isSharing && myUid ? myUid : remoteSharingUid,
    };
  }, [myUid, remoteUids, isSharing, remoteSharingUid]);

  // Report layout changes (debounced; the server coalesces further).
  const lastSent = useRef('');
  useEffect(() => {
    if (!meetingId || !canManage || activeStreams.length === 0) {
      lastSent.current = '';
      return undefined;
    }
    const payload = JSON.stringify(layout);
    if (payload === lastSent.current) return undefined;
    const timer = setTimeout(() => {
      lastSent.current = payload;
      LivestreamService.updateLayout(meetingId, layout).catch(() => {
        lastSent.current = '';
      });
    }, LAYOUT_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [meetingId, canManage, activeStreams.length, layout]);

  // After start/stop, poll quickly until Agora settles the new state.
  const burstRefresh = useCallback(() => {
    [1500, 4000, 8000, 15000].forEach((ms) => setTimeout(refresh, ms));
  }, [refresh]);

  const start = useCallback(
    async (destinationIds: number[]) => {
      if (!meetingId) return;
      const res = await LivestreamService.start(
        meetingId,
        destinationIds,
        layout,
      );
      setStreams((prev) => {
        const byId = new Map(prev.map((s) => [s.id, s]));
        (res.rows ?? []).forEach((s) => byId.set(s.id, s));
        return Array.from(byId.values()).sort((a, b) => b.id - a.id);
      });
      announce();
      burstRefresh();
    },
    [meetingId, layout, announce, burstRefresh],
  );

  const stop = useCallback(
    async (livestreamId?: number) => {
      if (!meetingId) return;
      await LivestreamService.stop(meetingId, livestreamId);
      announce();
      burstRefresh();
    },
    [meetingId, announce, burstRefresh],
  );

  return {
    streams,
    activeStreams,
    isLive,
    start,
    stop,
    refresh,
    supported: !unsupported,
  };
};
