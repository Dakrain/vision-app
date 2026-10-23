const KEY = 'appDeviceId';

/**
 * Stable id of this desktop install, sent as `appdeviceid` like mobile does.
 * The call API uses it to tell "my own retried accept" from "answered on
 * another of my devices".
 */
export function appDeviceId(): string {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) return saved;
    const id = `desktop-${crypto.randomUUID()}`;
    localStorage.setItem(KEY, id);
    return id;
  } catch (_) {
    return 'desktop-unknown';
  }
}
