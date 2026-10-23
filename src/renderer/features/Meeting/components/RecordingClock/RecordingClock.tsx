import { useEffect, useState } from 'react';

const format = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(
    seconds % 60,
  ).padStart(2, '0')}`;

/**
 * Elapsed recording time. Ticks on its own: kept out of the meeting screen
 * so the per-second update doesn't re-render the video tiles.
 */
export function RecordingClock({ startedAt }: { startedAt?: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const seconds = Math.max(0, Math.floor((now - (startedAt ?? now)) / 1000));
  return <>{format(seconds)}</>;
}
