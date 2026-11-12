import { Modal } from 'antd';
import i18n from '@/renderer/i18n';

// Read when used, not at import: tests (and a late bridge) swap it.
const ipc = () => window.require('electron').ipcRenderer;

/** Set once macOS has been asked: it shows its own prompt only that once. */
const ASKED_KEY = 'screenCapture.askedMacOS';

const askedBefore = () => {
  try {
    return localStorage.getItem(ASKED_KEY) === '1';
  } catch {
    return false;
  }
};

const rememberAsked = () => {
  try {
    localStorage.setItem(ASKED_KEY, '1');
  } catch {
    // Private storage off: worst case macOS is asked again (a no-op).
  }
};

/**
 * Resolves true when screen sharing can go ahead (macOS needs the Screen
 * Recording permission; capture otherwise sends nothing).
 *
 * The first time, macOS asks with its own prompt, like Teams' — which also
 * puts the app in the Screen Recording list, so turning it on is one
 * switch. Electron can't tell "never asked" from "said no", so that first
 * time is remembered here. macOS never asks again after that: then our
 * dialog points at System Settings.
 */
export const ensureScreenCaptureAccess = async (): Promise<boolean> => {
  const status: string = await ipc()
    .invoke('screen-capture-access')
    .catch(() => 'granted');
  if (status === 'granted') return true;

  if (!askedBefore()) {
    rememberAsked();
    const after: string = await ipc()
      .invoke('request-screen-capture-access')
      .catch(() => 'denied');
    return after === 'granted';
  }

  Modal.confirm({
    title: i18n.t('shared.screen_capture.title'),
    content: i18n.t('shared.screen_capture.message'),
    okText: i18n.t('shared.screen_capture.open_system_settings'),
    cancelText: i18n.t('common.later'),
    onOk: () => ipc().invoke('open-screen-capture-settings'),
  });
  return false;
};
