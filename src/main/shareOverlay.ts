/**
 * Google Meet–style screen sharing: while the user shares, the meeting
 * window is minimised and a small always-on-top bar says so, with
 * "Dừng chia sẻ" and "Mở cuộc họp". The bar is kept out of the shared
 * picture (content protection).
 *
 * Renderer → main: `share-overlay:show` / `share-overlay:hide`.
 * Main → renderer: `share-overlay:stop` when the bar's stop is clicked.
 */
import { BrowserWindow, ipcMain, screen } from 'electron';

const WIDTH = 420;
const HEIGHT = 56;

const html = `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><title>Vision20</title>
<style>
  html, body { margin: 0; height: 100%; background: transparent; overflow: hidden;
    font: 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  .bar { box-sizing: border-box; height: 100%; display: flex; align-items: center; gap: 10px;
    padding: 0 10px 0 14px; border-radius: 12px; background: #202124; color: #e8eaed;
    -webkit-app-region: drag; user-select: none; }
  .dot { width: 10px; height: 10px; border-radius: 50%; background: #ea4335; flex: none;
    animation: pulse 1.6s ease-in-out infinite; }
  @keyframes pulse { 50% { opacity: .35; } }
  .text { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  button { -webkit-app-region: no-drag; border: none; border-radius: 18px; height: 34px;
    padding: 0 14px; font: inherit; font-weight: 600; cursor: pointer; }
  .stop { background: #ea4335; color: #fff; }
  .stop:hover { background: #d93025; }
  .open { background: transparent; color: #8ab4f8; }
  .open:hover { background: rgba(138,180,248,.12); }
</style></head>
<body><div class="bar">
  <span class="dot"></span>
  <span class="text">Bạn đang chia sẻ màn hình</span>
  <button class="open" id="open">Mở cuộc họp</button>
  <button class="stop" id="stop">Dừng chia sẻ</button>
</div>
<script>
  const { ipcRenderer } = require('electron');
  document.getElementById('stop').onclick = () => ipcRenderer.send('share-overlay:stop');
  document.getElementById('open').onclick = () => ipcRenderer.send('share-overlay:open');
</script></body></html>`;

let overlay: BrowserWindow | null = null;

const restore = (mainWindow: BrowserWindow | null) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
};

const closeOverlay = () => {
  if (overlay && !overlay.isDestroyed()) overlay.close();
  overlay = null;
};

const openOverlay = () => {
  if (overlay && !overlay.isDestroyed()) {
    overlay.showInactive();
    return;
  }
  // Top centre of the screen the cursor is on (where the user works).
  const { workArea } = screen.getDisplayNearestPoint(
    screen.getCursorScreenPoint(),
  );
  overlay = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    x: Math.round(workArea.x + (workArea.width - WIDTH) / 2),
    y: workArea.y + 12,
    frame: false,
    transparent: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: true,
    show: false,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  });
  // Above other apps (and full-screen ones on macOS), on every desktop.
  overlay.setAlwaysOnTop(true, 'screen-saver');
  overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // Not part of the shared picture.
  overlay.setContentProtection(true);
  overlay.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  overlay.once('ready-to-show', () => overlay?.showInactive());
  overlay.on('closed', () => {
    overlay = null;
  });
};

export const registerShareOverlay = (
  getMainWindow: () => BrowserWindow | null,
) => {
  ipcMain.on('share-overlay:show', () => {
    openOverlay();
    getMainWindow()?.minimize();
  });
  ipcMain.on('share-overlay:hide', () => {
    const wasShown = overlay !== null;
    closeOverlay();
    if (wasShown) restore(getMainWindow());
  });
  ipcMain.on('share-overlay:open', () => restore(getMainWindow()));
  ipcMain.on('share-overlay:stop', () => {
    // The meeting screen stops the share, then asks to hide the bar.
    getMainWindow()?.webContents.send('share-overlay:stop');
    restore(getMainWindow());
  });
};

/** The meeting window went away: no bar left floating. */
export const disposeShareOverlay = closeOverlay;
