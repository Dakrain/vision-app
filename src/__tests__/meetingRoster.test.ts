import {
  mergeServerSnapshot,
  RTC_RECOVERY_COOLDOWN_MS,
  RTC_RECOVERY_DELAY_MS,
  RtcRecoveryTracker,
  SERVER_SNAPSHOT_MAX_AGE_MS,
  sourcesOf,
  trustedMismatch,
  unionPresence,
} from '../renderer/shared/utils/meetingRoster';

describe('unionPresence', () => {
  it('unions all three sources without duplicates', () => {
    expect(unionPresence([1, 2], [2, 3], [3, 4])).toEqual(
      expect.arrayContaining([1, 2, 3, 4]),
    );
    expect(unionPresence([1, 2], [2, 3], [3, 4])).toHaveLength(4);
  });

  it('is empty when every source is empty', () => {
    expect(unionPresence([], [], [])).toEqual([]);
  });
});

describe('mergeServerSnapshot', () => {
  const now = 1_000_000;

  it('replaces the previous set with a fresh, available snapshot', () => {
    const result = mergeServerSnapshot(
      [1, 2],
      { available: true, uids: [3, 4], fetchedAt: now },
      now,
    );
    expect(result).toEqual([3, 4]);
  });

  it('keeps the previous set when the snapshot is unavailable', () => {
    const result = mergeServerSnapshot(
      [1, 2],
      { available: false, uids: [3, 4], fetchedAt: now },
      now,
    );
    expect(result).toEqual([1, 2]);
  });

  it('keeps the previous set when the snapshot is too stale', () => {
    const result = mergeServerSnapshot(
      [1, 2],
      {
        available: true,
        uids: [3, 4],
        fetchedAt: now - SERVER_SNAPSHOT_MAX_AGE_MS - 1,
      },
      now,
    );
    expect(result).toEqual([1, 2]);
  });

  it('accepts a snapshot right at the staleness boundary', () => {
    const result = mergeServerSnapshot(
      [1, 2],
      {
        available: true,
        uids: [3, 4],
        fetchedAt: now - SERVER_SNAPSHOT_MAX_AGE_MS,
      },
      now,
    );
    expect(result).toEqual([3, 4]);
  });
});

describe('trustedMismatch', () => {
  it('flags a uid present via RTM but missing from RTC, while RTM is online', () => {
    expect(trustedMismatch([1], [1, 2], [], true)).toEqual([2]);
  });

  it('does not trust RTM once it has gone offline', () => {
    expect(trustedMismatch([1], [1, 2], [], false)).toEqual([]);
  });

  it('always trusts the server set, RTM online or not', () => {
    expect(trustedMismatch([1], [], [2], false)).toEqual([2]);
    expect(trustedMismatch([1], [], [2], true)).toEqual([2]);
  });

  it('reports nothing when RTC already matches', () => {
    expect(trustedMismatch([1, 2], [1, 2], [1, 2], true)).toEqual([]);
  });
});

describe('sourcesOf', () => {
  it('lists every source that currently reports a uid', () => {
    expect(sourcesOf(2, [1], [2], [2])).toEqual(['rtm', 'server']);
    expect(sourcesOf(1, [1], [1], [1])).toEqual(['rtc', 'rtm', 'server']);
    expect(sourcesOf(9, [1], [1], [1])).toEqual([]);
  });
});

describe('RtcRecoveryTracker', () => {
  it('does not recover before the mismatch has lasted RTC_RECOVERY_DELAY_MS', () => {
    const tracker = new RtcRecoveryTracker();
    let t = 0;
    expect(tracker.evaluate([2], t).recover).toBe(false);
    t += RTC_RECOVERY_DELAY_MS - 1;
    expect(tracker.evaluate([2], t).recover).toBe(false);
  });

  it('recovers once the mismatch has been overdue for RTC_RECOVERY_DELAY_MS', () => {
    const tracker = new RtcRecoveryTracker();
    let t = 0;
    tracker.evaluate([2], t);
    t += RTC_RECOVERY_DELAY_MS;
    expect(tracker.evaluate([2], t).recover).toBe(true);
  });

  it('does not recover again inside the cooldown, and warns instead', () => {
    const tracker = new RtcRecoveryTracker();
    let t = 0;
    tracker.evaluate([2], t);
    t += RTC_RECOVERY_DELAY_MS;
    expect(tracker.evaluate([2], t).recover).toBe(true);

    // still mismatched right after the recovery attempt: no immediate retry.
    t += 1000;
    const second = tracker.evaluate([2], t, () => ['rtm']);
    expect(second.recover).toBe(false);
    expect(second.warnings).toEqual([{ uid: 2, sources: ['rtm'] }]);

    // same uid, same episode: warn only once, not on every tick.
    t += 1000;
    const third = tracker.evaluate([2], t, () => ['rtm']);
    expect(third.recover).toBe(false);
    expect(third.warnings).toEqual([]);
  });

  it('does not loop: repeated evaluation while still mismatched never recovers twice within the cooldown', () => {
    const tracker = new RtcRecoveryTracker();
    let t = 0;
    tracker.evaluate([2], t);
    t += RTC_RECOVERY_DELAY_MS;
    expect(tracker.evaluate([2], t).recover).toBe(true);

    let recoveries = 0;
    for (let i = 0; i < 50; i += 1) {
      t += 1000;
      if (tracker.evaluate([2], t).recover) recoveries += 1;
    }
    expect(recoveries).toBe(0);
    expect(t).toBeLessThan(RTC_RECOVERY_COOLDOWN_MS);
  });

  it('retries after the cooldown elapses if still mismatched', () => {
    const tracker = new RtcRecoveryTracker();
    let t = 0;
    tracker.evaluate([2], t);
    t += RTC_RECOVERY_DELAY_MS;
    expect(tracker.evaluate([2], t).recover).toBe(true);

    t += RTC_RECOVERY_COOLDOWN_MS;
    expect(tracker.evaluate([2], t).recover).toBe(true);
  });

  it('forgets a uid once it is resolved, so a later mismatch starts its own 15s window', () => {
    const tracker = new RtcRecoveryTracker();
    let t = 0;
    tracker.evaluate([2], t);
    t += RTC_RECOVERY_DELAY_MS - 1;
    expect(tracker.evaluate([2], t).recover).toBe(false);

    // resolved: back on RTC (no longer mismatched).
    t += 1;
    expect(tracker.evaluate([], t).recover).toBe(false);

    // goes missing again: must wait out a fresh 15s, not inherit the old timer.
    t += 1;
    tracker.evaluate([2], t);
    t += RTC_RECOVERY_DELAY_MS - 1;
    expect(tracker.evaluate([2], t).recover).toBe(false);
    t += 1;
    expect(tracker.evaluate([2], t).recover).toBe(true);
  });

  it('tracks multiple mismatched uids independently', () => {
    const tracker = new RtcRecoveryTracker();
    let t = 0;
    tracker.evaluate([2], t);
    t += 5000;
    tracker.evaluate([2, 3], t);
    // uid 2 started at t=0, uid 3 at t=5000.
    t = RTC_RECOVERY_DELAY_MS;
    const result = tracker.evaluate([2, 3], t);
    expect(result.recover).toBe(true); // uid 2 alone is enough to trigger recovery.
  });
});
