/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import fs from 'fs';
import path from 'path';

import {
  app,
  BrowserWindow,
  dialog,
  shell,
  ipcMain,
  OpenDialogOptions,
  SaveDialogOptions,
  systemPreferences,
} from 'electron';
import appPackage from '../../release/app/package.json';
import MenuBuilder from './menu';
import { disposeShareOverlay, registerShareOverlay } from './shareOverlay';
import { resolveHtmlPath } from './util';

const WINDOW_SIZE = {
  login: {
    width: 480,
    height: 852,
  },
  home: {
    width: 1280,
    height: 800,
  },
};

let mainWindow: BrowserWindow | null = null;

// ---- Invite links: vision20://meetinginvite?meeting_id=…&password=…
// (the "Launch Meeting" button of the web invite page opens these).
const DEEP_LINK_SCHEME = 'vision20';
let pendingDeepLink: string | null = null;

const findDeepLink = (argv: string[]) =>
  argv.find((arg) => arg.startsWith(`${DEEP_LINK_SCHEME}://`));

const deliverDeepLink = (url: string) => {
  pendingDeepLink = url;
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    mainWindow.webContents.send('deep-link', url);
  }
};

if (process.defaultApp && process.argv.length >= 2) {
  // Dev (`electron .`): register the electron binary plus the app path.
  app.setAsDefaultProtocolClient(DEEP_LINK_SCHEME, process.execPath, [
    path.resolve(process.argv[1]),
  ]);
} else {
  app.setAsDefaultProtocolClient(DEEP_LINK_SCHEME);
}

// macOS delivers links through open-url (also before the app is ready).
app.on('open-url', (event, url) => {
  event.preventDefault();
  deliverDeepLink(url);
});

// Windows/Linux start a second instance with the link in argv; keep one.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    const url = findDeepLink(argv);
    if (url) deliverDeepLink(url);
  });
  pendingDeepLink = findDeepLink(process.argv) ?? null;
}

// The renderer asks once it is mounted (a link may arrive before that).
ipcMain.handle('take-pending-deep-link', () => {
  const url = pendingDeepLink;
  pendingDeepLink = null;
  return url;
});

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

registerShareOverlay(() => mainWindow);

// "Phiên bản …" in Settings.
// Packaged builds report release/app/package.json; in dev getVersion() would
// give Electron's own version, so read the same file.
ipcMain.handle('app:version', () =>
  app.isPackaged ? app.getVersion() : appPackage.version,
);

// Clicked a system notification (incoming / missed call): bring the app up.
ipcMain.on('app:focus', () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
});

// Incoming call while the app is in the background.
ipcMain.on('app:attention', () => {
  if (process.platform === 'darwin') app.dock?.bounce('critical');
  else mainWindow?.flashFrame(true);
});

ipcMain.on('resize-window', (event, { width, height }) => {
  // The window that asked, focused or not (an unfocused window used to keep
  // the small login size after signing in).
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    // Resize window
    win.setSize(width, height);
    win.center();
  }
});

// macOS needs the Screen Recording permission for screen sharing; without
// it capture silently sends nothing. Other platforms need no permission.
ipcMain.handle('screen-capture-access', () =>
  process.platform === 'darwin'
    ? systemPreferences.getMediaAccessStatus('screen')
    : 'granted',
);

ipcMain.handle('open-screen-capture-settings', () =>
  shell.openExternal(
    'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture',
  ),
);

ipcMain.handle('get-virtual-background-path', (_, imageNumber: number) => {
  return process.env.NODE_ENV === 'development'
    ? path.resolve(
        __dirname,
        `../../assets/images/virtual_background/virtual_background_${imageNumber}.jpg`,
      )
    : path.join(
        process.resourcesPath,
        `assets/images/virtual_background/virtual_background_${imageNumber}.jpg`,
      );
});

// ---- Virtual backgrounds the user adds from their own photos. Copied into
// the app's data folder so they survive restarts and the original can move.
const customBackgroundDir = () =>
  path.join(app.getPath('userData'), 'virtual_backgrounds');

const isImage = (file: string) => /\.(jpe?g|png)$/i.test(file);

ipcMain.handle('custom-backgrounds:list', async () => {
  const dir = customBackgroundDir();
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter(isImage)
    .map((name) => path.join(dir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
});

ipcMain.handle('custom-backgrounds:add', async () => {
  const window = BrowserWindow.getFocusedWindow();
  const options: OpenDialogOptions = {
    title: 'Chọn ảnh làm phông nền',
    properties: ['openFile'],
    filters: [{ name: 'Ảnh', extensions: ['jpg', 'jpeg', 'png'] }],
  };
  const result = window
    ? await dialog.showOpenDialog(window, options)
    : await dialog.showOpenDialog(options);
  const source = result.filePaths[0];
  if (result.canceled || !source || !isImage(source)) return null;
  const dir = customBackgroundDir();
  fs.mkdirSync(dir, { recursive: true });
  const target = path.join(dir, `vb_${Date.now()}${path.extname(source)}`);
  fs.copyFileSync(source, target);
  return target;
});

ipcMain.handle('custom-backgrounds:remove', async (_, file: string) => {
  // Only ever delete inside our own folder.
  const dir = customBackgroundDir();
  const target = path.resolve(file);
  if (path.dirname(target) !== dir || !isImage(target)) return false;
  if (fs.existsSync(target)) fs.unlinkSync(target);
  return true;
});

// ---- Local meeting recording. The renderer encodes the app window plus
// the call audio into an MP4 and streams the bytes here (with their offset in
// the file); they go straight to a temp file so long meetings don't pile up in
// memory. On finish the user picks where to keep it.
const recordings = new Map<string, { file: string; fd: number }>();

ipcMain.handle('recording:source-id', (event) =>
  BrowserWindow.fromWebContents(event.sender)?.getMediaSourceId(),
);

ipcMain.handle('recording:open', (_, extension: string) => {
  const id = `${Date.now()}`;
  const ext = extension === 'mp4' ? 'mp4' : 'webm';
  const file = path.join(
    app.getPath('temp'),
    `vision20-recording-${id}.${ext}`,
  );
  recordings.set(id, { file, fd: fs.openSync(file, 'w') });
  return id;
});

ipcMain.handle(
  'recording:chunk',
  (_, id: string, chunk: Uint8Array, position: number) => {
    const rec = recordings.get(id);
    if (!rec) return;
    fs.writeSync(rec.fd, chunk, 0, chunk.byteLength, position);
  },
);

const closeRecording = async (id: string) => {
  const rec = recordings.get(id);
  recordings.delete(id);
  if (!rec) return undefined;
  fs.closeSync(rec.fd);
  return rec.file;
};

// Where recordings go when the user picked a folder in the meeting settings.
const defaultRecordingFolder = () =>
  path.join(app.getPath('videos'), 'Vision20');

ipcMain.handle('recording:folder-info', (_, folder?: string) => {
  const dir = folder || defaultRecordingFolder();
  // statfs needs an existing path: walk up to the nearest one.
  let probe = dir;
  while (!fs.existsSync(probe) && path.dirname(probe) !== probe) {
    probe = path.dirname(probe);
  }
  let freeBytes: number | null = null;
  try {
    const stats = fs.statfsSync(probe);
    freeBytes = stats.bavail * stats.bsize;
  } catch {
    // Unknown free space: the UI just leaves it out.
  }
  return { folder: dir, freeBytes };
});

ipcMain.handle('recording:pick-folder', async (event, current?: string) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  const options: OpenDialogOptions = {
    title: 'Chọn thư mục lưu bản ghi',
    defaultPath: current || defaultRecordingFolder(),
    properties: ['openDirectory', 'createDirectory'],
  };
  const result = window
    ? await dialog.showOpenDialog(window, options)
    : await dialog.showOpenDialog(options);
  return result.canceled ? null : (result.filePaths[0] ?? null);
});

/** `name.ext`, or `name (2).ext`… if that file already exists. */
const freeFileName = (dir: string, name: string, ext: string) => {
  let candidate = path.join(dir, `${name}${ext}`);
  for (let i = 2; fs.existsSync(candidate); i += 1) {
    candidate = path.join(dir, `${name} (${i})${ext}`);
  }
  return candidate;
};

ipcMain.handle(
  'recording:finish',
  async (event, id: string, name: string, folder?: string) => {
    const file = await closeRecording(id);
    if (!file) return null;
    const window = BrowserWindow.fromWebContents(event.sender);
    const safeName = name.replace(/[\\/:*?"<>|]/g, '-');
    // A folder chosen in the settings: save there without asking.
    if (folder) {
      try {
        fs.mkdirSync(folder, { recursive: true });
        const target = freeFileName(folder, safeName, path.extname(file));
        fs.copyFileSync(file, target);
        fs.unlinkSync(file);
        return target;
      } catch (err) {
        console.warn('[recording] save to folder failed, asking instead', err);
      }
    }
    const options: SaveDialogOptions = {
      title: 'Lưu bản ghi cuộc họp',
      defaultPath: path.join(
        app.getPath('videos'),
        `${safeName}${path.extname(file)}`,
      ),
    };
    const result = window
      ? await dialog.showSaveDialog(window, options)
      : await dialog.showSaveDialog(options);
    if (result.canceled || !result.filePath) {
      fs.unlinkSync(file);
      return null;
    }
    // copy + unlink: the temp dir may be on another volume (rename fails).
    fs.copyFileSync(file, result.filePath);
    fs.unlinkSync(file);
    return result.filePath;
  },
);

ipcMain.handle('recording:abort', async (_, id: string) => {
  const file = await closeRecording(id);
  if (file && fs.existsSync(file)) fs.unlinkSync(file);
});

ipcMain.handle('recording:reveal', (_, file: string) =>
  shell.showItemInFolder(file),
);

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  // Packaged builds take the Dock icon from the bundle; in development
  // it would be Electron's.
  if (process.platform === 'darwin' && !app.isPackaged) {
    app.dock.setIcon(getAssetPath('icon.png'));
  }

  mainWindow = new BrowserWindow({
    show: false,
    ...WINDOW_SIZE.login,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      allowRunningInsecureContent: true,
      // preload: app.isPackaged
      //   ? path.join(__dirname, 'preload.js')
      //   : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });
  mainWindow.webContents.on('did-navigate', (event, url) => {
    console.log('url', url);
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (url.includes('/home')) {
      mainWindow.setSize(WINDOW_SIZE.home.width, WINDOW_SIZE.home.height);
      mainWindow.center(); // Căn giữa lại window
    } else if (url.includes('/')) {
      mainWindow.setSize(WINDOW_SIZE.login.width, WINDOW_SIZE.login.height);
      mainWindow.center();
    }
  });

  mainWindow.on('closed', () => {
    disposeShareOverlay();
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
