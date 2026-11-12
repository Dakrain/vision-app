import { Modal } from 'antd';

import { ensureScreenCaptureAccess } from '../renderer/shared/utils/screenCapturePermission';

jest.mock('antd', () => ({ Modal: { confirm: jest.fn() } }));
jest.mock('@/renderer/i18n', () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

const ipc = { invoke: jest.fn() };
const confirm = Modal.confirm as unknown as jest.Mock;

const bridge = (name: string) =>
  name === 'electron'
    ? { ipcRenderer: ipc }
    : (jest.requireActual(name) as unknown);

beforeEach(() => {
  ipc.invoke.mockReset();
  confirm.mockReset();
  localStorage.clear();
  (window as unknown as { require: typeof bridge }).require = bridge;
});

const status = (screen: string, afterRequest = screen) =>
  ipc.invoke.mockImplementation((channel: string) => {
    if (channel === 'screen-capture-access') return Promise.resolve(screen);
    if (channel === 'request-screen-capture-access') {
      return Promise.resolve(afterRequest);
    }
    return Promise.resolve();
  });

const requested = () =>
  ipc.invoke.mock.calls.filter(([c]) => c === 'request-screen-capture-access')
    .length;

describe('ensureScreenCaptureAccess (macOS Screen Recording)', () => {
  it('granted: goes ahead, asks nothing', async () => {
    status('granted');
    await expect(ensureScreenCaptureAccess()).resolves.toBe(true);
    expect(requested()).toBe(0);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('never asked yet: lets macOS ask with its own prompt (which also lists the app in Screen Recording) — no dialog of ours on top', async () => {
    status('denied');
    await expect(ensureScreenCaptureAccess()).resolves.toBe(false);
    expect(requested()).toBe(1);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('granted right away by that prompt: goes ahead', async () => {
    status('denied', 'granted');
    await expect(ensureScreenCaptureAccess()).resolves.toBe(true);
  });

  it('asked before and still not allowed (macOS will not ask again): our dialog, pointing at System Settings', async () => {
    status('denied');
    await ensureScreenCaptureAccess();
    ipc.invoke.mockClear();

    await expect(ensureScreenCaptureAccess()).resolves.toBe(false);

    expect(requested()).toBe(0);
    expect(confirm).toHaveBeenCalledTimes(1);
    confirm.mock.calls[0][0].onOk();
    expect(ipc.invoke).toHaveBeenCalledWith('open-screen-capture-settings');
  });

  it('UI testing (VISION_DEBUG_SCREEN_PERMISSION=1, main says "debug"): our dialog every time', async () => {
    status('debug');
    await expect(ensureScreenCaptureAccess()).resolves.toBe(false);
    await expect(ensureScreenCaptureAccess()).resolves.toBe(false);
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(requested()).toBe(0);
  });
});
