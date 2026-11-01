import { Modal } from 'antd';
import i18n from '@/renderer/i18n';

const { ipcRenderer } = window.require('electron');

/**
 * Resolves true when screen sharing can go ahead. On macOS a denied Screen
 * Recording permission makes capture send nothing at all, so explain how to
 * grant it instead. 'not-determined' is let through: macOS asks the user then.
 */
export const ensureScreenCaptureAccess = async (): Promise<boolean> => {
  const status: string = await ipcRenderer
    .invoke('screen-capture-access')
    .catch(() => 'granted');
  if (status === 'granted' || status === 'not-determined') {
    return true;
  }
  Modal.confirm({
    title: i18n.t('shared.screen_capture.title'),
    content: i18n.t('shared.screen_capture.message'),
    okText: i18n.t('shared.screen_capture.open_system_settings'),
    cancelText: i18n.t('common.later'),
    onOk: () => ipcRenderer.invoke('open-screen-capture-settings'),
  });
  return false;
};
