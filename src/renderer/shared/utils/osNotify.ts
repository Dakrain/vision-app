const { ipcRenderer } = window.require('electron');

/**
 * A system notification, only while the app window isn't focused (the
 * in-window toast covers the focused case). Clicking it brings the app back.
 * [attention]: also bounce the dock icon / flash the taskbar (incoming call).
 */
export function osNotify(
  title: string,
  body: string,
  { attention = false }: { attention?: boolean } = {},
): Notification | undefined {
  if (document.hasFocus()) return undefined;
  if (attention) ipcRenderer.send('app:attention');
  try {
    const n = new Notification(title, { body, silent: attention });
    n.onclick = () => ipcRenderer.send('app:focus');
    return n;
  } catch (_) {
    return undefined;
  }
}
