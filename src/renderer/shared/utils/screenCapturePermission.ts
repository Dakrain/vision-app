import { Modal } from 'antd';

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
    title: 'Cần cấp quyền ghi màn hình',
    content:
      'macOS đang chặn ứng dụng chia sẻ màn hình. Vào Cài đặt hệ thống → Quyền riêng tư & Bảo mật → Ghi màn hình (Screen Recording), bật quyền cho Vision 20, sau đó khởi động lại ứng dụng.',
    okText: 'Mở Cài đặt hệ thống',
    cancelText: 'Để sau',
    onOk: () => ipcRenderer.invoke('open-screen-capture-settings'),
  });
  return false;
};
