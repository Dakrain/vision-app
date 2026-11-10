import { Modal } from 'antd';

import {
  MediaAccessStatus,
  blockedKinds,
  ensureMediaAccess,
  wantedKinds,
} from '../renderer/shared/utils/mediaAccess';

jest.mock('antd', () => ({ Modal: { confirm: jest.fn() } }));
jest.mock('@/renderer/i18n', () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

type Ipc = { invoke: jest.Mock };

const ipc: Ipc = { invoke: jest.fn() };
const confirm = Modal.confirm as unknown as jest.Mock;

/** The renderer reads the bridge lazily; swap it for this test's fake. */
const bridge = (name: string) =>
  name === 'electron'
    ? { ipcRenderer: ipc }
    : (jest.requireActual(name) as unknown);

beforeEach(() => {
  ipc.invoke.mockReset();
  confirm.mockReset();
  (window as unknown as { require: typeof bridge }).require = bridge;
});

const answer = (statuses: Record<string, MediaAccessStatus>, asked = true) => {
  ipc.invoke.mockImplementation((channel: string, kind: string) => {
    if (channel === 'media-access-status') {
      return Promise.resolve(statuses[kind] ?? 'granted');
    }
    if (channel === 'ask-media-access') return Promise.resolve(asked);
    if (channel === 'open-media-settings') return Promise.resolve();
    return Promise.resolve();
  });
};

describe('wantedKinds', () => {
  it('asks only for the devices the meeting will use', () => {
    expect(wantedKinds({ camera: true })).toEqual(['camera']);
    expect(wantedKinds({ microphone: true })).toEqual(['microphone']);
    expect(wantedKinds({ camera: true, microphone: true })).toEqual([
      'camera',
      'microphone',
    ]);
    expect(wantedKinds({})).toEqual([]);
  });
});

describe('blockedKinds', () => {
  it('counts denied and restricted, not granted or not-determined', () => {
    expect(
      blockedKinds(['camera', 'microphone'], {
        camera: 'denied',
        microphone: 'granted',
      }),
    ).toEqual(['camera']);
    expect(
      blockedKinds(['camera', 'microphone'], {
        camera: 'restricted',
        microphone: 'not-determined',
      }),
    ).toEqual(['camera']);
    expect(blockedKinds(['camera'], { camera: 'not-determined' })).toEqual([]);
  });
});

describe('ensureMediaAccess', () => {
  it('does nothing when neither device is wanted', async () => {
    await expect(ensureMediaAccess({})).resolves.toBe(true);
    expect(ipc.invoke).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });

  it('lets a granted camera and microphone through', async () => {
    answer({ camera: 'granted', microphone: 'granted' });

    await expect(
      ensureMediaAccess({ camera: true, microphone: true }),
    ).resolves.toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('asks macOS when the permission was never decided', async () => {
    answer({ camera: 'not-determined' }, true);

    await expect(ensureMediaAccess({ camera: true })).resolves.toBe(true);
    expect(ipc.invoke).toHaveBeenCalledWith('ask-media-access', 'camera');
    expect(confirm).not.toHaveBeenCalled();
  });

  it('explains a denied camera and offers the Camera pane', async () => {
    answer({ camera: 'denied' });

    await expect(ensureMediaAccess({ camera: true })).resolves.toBe(false);
    expect(confirm).toHaveBeenCalledTimes(1);
    const modal = confirm.mock.calls[0][0];
    expect(modal.title).toBe('shared.media_access.title');
    expect(modal.content).toBe('shared.media_access.camera_message');

    await modal.onOk();
    expect(ipc.invoke).toHaveBeenCalledWith('open-media-settings', 'camera');
  });

  it('names both devices when both are denied', async () => {
    answer({ camera: 'denied', microphone: 'denied' }, false);

    await expect(
      ensureMediaAccess({ camera: true, microphone: true }),
    ).resolves.toBe(false);
    const modal = confirm.mock.calls[0][0];
    expect(modal.content).toBe('shared.media_access.both_message');
    expect(modal.okText).toBe('shared.media_access.open_system_settings');
  });

  it('points at the Microphone pane when only the mic is denied', async () => {
    answer({ camera: 'granted', microphone: 'restricted' });

    await expect(
      ensureMediaAccess({ camera: true, microphone: true }),
    ).resolves.toBe(false);
    const modal = confirm.mock.calls[0][0];
    expect(modal.content).toBe('shared.media_access.microphone_message');
    await modal.onOk();
    expect(ipc.invoke).toHaveBeenCalledWith(
      'open-media-settings',
      'microphone',
    );
  });

  it('still joins when the bridge itself fails', async () => {
    ipc.invoke.mockImplementation(() => Promise.reject(new Error('no ipc')));

    await expect(ensureMediaAccess({ camera: true })).resolves.toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });
});
