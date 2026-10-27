/**
 * Who is actually in the meeting room, like Teams/Zoom: not just whoever
 * Agora RTC currently has a media connection to. Three sources, each owning
 * its own set of uids — nothing here ever removes another source's entry:
 *
 * - RTC: `onUserJoined`/`onUserOffline` (today's only source, and still the
 *   most accurate one, but it can miss a brief drop that the SDK itself
 *   recovers from under the hood, or lag behind a flaky network).
 * - RTM: a `channel.getMembers()` snapshot plus `MemberJoined`/`MemberLeft`
 *   in between. Kept for display even after RTM goes offline (better a
 *   stale tile than none), but excluded from recovery decisions then — see
 *   `trustedMismatch`.
 * - server: the `/meeting/:id/roster` poll. A fresh, available snapshot
 *   replaces it; a stale or unavailable one keeps the previous one.
 *
 * Kept free of React/Redux/Agora so the merge and the recovery timing can
 * be unit-tested without mocking any of them — see
 * src/__tests__/meetingRoster.test.ts.
 */

/** How old a server snapshot may be and still be trusted (ms). */
export const SERVER_SNAPSHOT_MAX_AGE_MS = 40_000;

/** How long a uid may be present-without-RTC before recovery kicks in. */
export const RTC_RECOVERY_DELAY_MS = 15_000;

/** Minimum time between two recovery rejoins, per meeting. */
export const RTC_RECOVERY_COOLDOWN_MS = 2 * 60_000;

export type PresenceSource = 'rtc' | 'rtm' | 'server';

export interface ServerRosterSnapshot {
  available: boolean;
  uids: number[];
  fetchedAt: number;
}

/** Everyone known to be in the room right now, from any of the three sources. */
export function unionPresence(
  rtcUids: number[],
  rtmUids: number[],
  serverUids: number[],
): number[] {
  return Array.from(new Set<number>([...rtcUids, ...rtmUids, ...serverUids]));
}

/**
 * The server set only ever changes on a fresh, available snapshot: an
 * unavailable one, or one too old to trust, keeps whatever was already
 * known (a 404/network error stops the poll entirely — that's on the
 * caller, not here).
 */
export function mergeServerSnapshot(
  previous: number[],
  snapshot: ServerRosterSnapshot,
  now: number,
): number[] {
  if (!snapshot.available) return previous;
  if (now - snapshot.fetchedAt > SERVER_SNAPSHOT_MAX_AGE_MS) return previous;
  return snapshot.uids;
}

/**
 * Uids that count as "present but missing from RTC" — candidates for a
 * recovery rejoin. RTM only counts while it is online (a dead RTM link
 * proves nothing about whether someone is still in the call); the server
 * set always counts (its own staleness is already handled by
 * `mergeServerSnapshot` before it gets here).
 */
export function trustedMismatch(
  rtcUids: number[],
  rtmUids: number[],
  serverUids: number[],
  rtmOnline: boolean,
): number[] {
  const trusted = new Set<number>(serverUids);
  if (rtmOnline) rtmUids.forEach((uid) => trusted.add(uid));
  const onRtc = new Set(rtcUids);
  return Array.from(trusted).filter((uid) => !onRtc.has(uid));
}

/** Which of the three sources currently list a uid, for diagnostics only. */
export function sourcesOf(
  uid: number,
  rtcUids: number[],
  rtmUids: number[],
  serverUids: number[],
): PresenceSource[] {
  const sources: PresenceSource[] = [];
  if (rtcUids.includes(uid)) sources.push('rtc');
  if (rtmUids.includes(uid)) sources.push('rtm');
  if (serverUids.includes(uid)) sources.push('server');
  return sources;
}

export interface MismatchWarning {
  uid: number;
  /** Which sources still claim this uid is in the room (for the console.warn). */
  sources: PresenceSource[];
}

export interface RecoveryEvaluation {
  /** Rejoin the RTC channel now: a mismatch has been overdue long enough. */
  recover: boolean;
  /** One per uid still stuck after an earlier recovery — fire once, not every tick. */
  warnings: MismatchWarning[];
}

/**
 * Tracks, across repeated calls, how long each uid has been mismatched and
 * whether a recovery rejoin is due. One instance per meeting. All timing
 * comes from the `now` passed in, so no real timers are needed to test it.
 */
export class RtcRecoveryTracker {
  /** uid -> when it was first seen mismatched. */
  private since = new Map<number, number>();

  /** uids already warned about during the current cooldown window. */
  private warned = new Set<number>();

  private lastRecoveryAt: number | undefined;

  /**
   * @param mismatched uids currently trusted-present but missing from RTC
   *   (see `trustedMismatch`).
   * @param sourcesFor looks up which sources still report a uid, for the
   *   diagnostic warning only.
   */
  evaluate(
    mismatched: number[],
    now: number,
    sourcesFor: (uid: number) => PresenceSource[] = () => [],
  ): RecoveryEvaluation {
    // Resolved (back on RTC, or gone from every source): start clean next
    // time this uid goes missing.
    Array.from(this.since.keys()).forEach((uid) => {
      if (!mismatched.includes(uid)) {
        this.since.delete(uid);
        this.warned.delete(uid);
      }
    });
    mismatched.forEach((uid) => {
      if (!this.since.has(uid)) this.since.set(uid, now);
    });

    const overdue = mismatched.filter(
      (uid) => now - (this.since.get(uid) ?? now) >= RTC_RECOVERY_DELAY_MS,
    );
    if (overdue.length === 0) return { recover: false, warnings: [] };

    const cooledDown =
      this.lastRecoveryAt === undefined ||
      now - this.lastRecoveryAt >= RTC_RECOVERY_COOLDOWN_MS;
    if (!cooledDown) {
      // A recovery already ran for this episode and it's still wrong:
      // don't loop — warn once per uid, then wait out the cooldown.
      const warnings: MismatchWarning[] = [];
      overdue.forEach((uid) => {
        if (!this.warned.has(uid)) {
          this.warned.add(uid);
          warnings.push({ uid, sources: sourcesFor(uid) });
        }
      });
      return { recover: false, warnings };
    }

    this.lastRecoveryAt = now;
    this.warned.clear();
    return { recover: true, warnings: [] };
  }
}
